import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  verifyWhopWebhook,
  customFieldAnswer,
  type WhopPayment,
} from '@/lib/commerce/whop'
import { whopEnvironment } from '@/lib/commerce/whopEnv'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { seatLimit } from '@/lib/commerce/seats'
import {
  sendDepositReceivedEmail,
  notifyDepositReceived,
  sendBoilerplateConfirmationEmail,
} from '@/lib/commerce/fulfillment'

export const dynamic = 'force-dynamic'

/* Whop's webhook, for the deposit that starts an engagement.
 *
 * Whop delivers at least once, in no particular order, and retries a non-2xx
 * for three days. So: verify, record once (the payment id is unique on the
 * purchases table, and a race on it is treated as the duplicate it is),
 * answer 200 for anything that is not a fault of ours. Only a failed write
 * gets a 500, because that is the one case where a retry helps.
 *
 * What is recorded: a Purchase with provider "whop", the service the plan
 * belongs to, the amount in cents, and the buyer's email. Nothing to deliver:
 * an engagement is scheduled with the client by hand, so fulfilment is
 * "not_required" from the start. The buyer gets a receipt with the booking
 * link and the owner gets a heads-up, because a deposit is a client, not a
 * download. */

/* Which collection a plan belongs to.
 *
 * Services first, and deliberately. A deposit is the only Whop purchase
 * carrying real traffic today, so it keeps the exact query it has always
 * had -- one find on services, same arguments, same position. Products
 * and courses are asked only when that misses, which is what lets the
 * deposit tests stand unedited as the regression alarm for this migration.
 *
 * A plan id is unique across Whop, so the order is a matter of cost and
 * blast radius rather than correctness. */
const PLAN_COLLECTIONS = ['services', 'products', 'courses'] as const

const ITEM_TYPE = {
  services: 'service',
  products: 'product',
  courses: 'course',
} as const

/* Must match the custom field's name on every kit plan in the Whop
   dashboard. Matching is case-insensitive and trimmed (see
   customFieldAnswer), so "Github username" on a plan still works. */
const GITHUB_FIELD = 'GitHub username'

async function findByPlan(payload: any, plan: string | null) {
  if (!plan) return { collection: null, item: null }
  const field =
    whopEnvironment() === 'sandbox' ? 'whopSandboxPlanId' : 'whopPlanId'
  for (const collection of PLAN_COLLECTIONS) {
    const { docs } = await payload.find({
      collection,
      where: { [field]: { equals: plan } },
      limit: 1,
      overrideAccess: true,
    })
    if (docs[0]) return { collection, item: docs[0] }
  }
  return { collection: null, item: null }
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (raw.length > 65536) {
    return new Response('Payload too large', { status: 413 })
  }
  const event = verifyWhopWebhook(raw, Object.fromEntries(req.headers))
  if (!event) return new Response('Invalid signature', { status: 401 })

  if (event.type !== 'payment.succeeded') {
    return new Response('ignored (event)', { status: 200 })
  }

  const payment = event.data as WhopPayment
  const paymentId = payment.id
  const planId = payment.plan?.id || null
  const email = payment.user?.email || null
  const githubUsername = customFieldAnswer(payment, GITHUB_FIELD)
  if (!paymentId || !email) {
    console.error('Whop payment without id or email', { paymentId, planId })
    return new Response('ignored (missing fields)', { status: 200 })
  }
  if (payment.status && payment.status !== 'paid') {
    return new Response('ignored (not paid)', { status: 200 })
  }

  const payload = await getPayloadClient()

  const existing = await payload.find({
    collection: 'purchases',
    where: { whopPaymentId: { equals: paymentId } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) {
    return new Response('ok (duplicate)', { status: 200 })
  }

  /* The plan is how a payment finds its service. A payment for a plan no
     service claims is still money that arrived, so it is recorded -- with
     nothing attached and marked failed, which is what makes it show up in
     the admin as something to look at. */
  const { collection, item } = await findByPlan(payload, planId)
  const itemType = collection ? ITEM_TYPE[collection] : undefined
  const service = collection === 'services' ? item : null
  const isBoilerplate = itemType === 'product' && item?.type === 'boilerplate'

  const major = payment.total ?? payment.usd_total ?? 0
  const amount = Math.round(Number(major) * 100)
  const currency = (payment.currency || 'usd').toLowerCase()

  let purchase
  try {
    purchase = await payload.create({
      collection: 'purchases',
      overrideAccess: true,
      data: {
        email,
        provider: 'whop',
        whopPaymentId: paymentId,
        /* Stamped from this server's own setting, not the payload: a sandbox
           webhook only ever reaches a server configured for the sandbox. */
        whopEnvironment: whopEnvironment(),
        item: collection
          ? { relationTo: collection, value: item.id }
          : undefined,
        itemType,
        githubUsername: githubUsername || undefined,
        licenseKey: payment.membership?.license_key || undefined,
        whopMembershipId: payment.membership?.id || undefined,
        whopPlanId: planId || undefined,
        amount,
        currency,
        status: 'paid',
        fulfillmentStatus: isBoilerplate
          ? 'pending_invite'
          : item
          ? 'not_required'
          : 'failed',
      },
    })
  } catch (err) {
    const recheck = await payload.find({
      collection: 'purchases',
      where: { whopPaymentId: { equals: paymentId } },
      limit: 1,
      overrideAccess: true,
    })
    if (recheck.docs.length) {
      return new Response('ok (duplicate)', { status: 200 })
    }
    console.error('Whop purchase create failed', paymentId, err)
    return new Response('error', { status: 500 })
  }

  /* A kit is delivered by a repository invitation.
   *
   * Lifted from the Creem route, minus the part that no longer applies:
   * there is no "the buyer has not named an account yet" case, because
   * Whop asked for the username on the checkout form before taking the
   * card. An order with no username here is a buyer who left an optional
   * field blank, not a buyer mid-flow.
   *
   * Nothing in this block is allowed to throw. The sale is already
   * captured by the time it runs, so GitHub being unreachable must leave
   * a recorded order a human can finish -- never a 500 that makes Whop
   * redeliver a payment we already banked. */
  if (isBoilerplate) {
    /* try/catch, not just the .catch()s below: the sale is already banked,
       so this whole block must answer 200 no matter what goes wrong inside
       it -- a synchronous surprise here must not do what an unhandled
       rejection would (500, and Whop redelivers a payment we already have). */
    try {
      const repo = typeof item?.githubRepo === 'string' ? item.githubRepo : null
      const invite = githubUsername
        ? await inviteToRepo({ repo, username: githubUsername })
        : null

      if (invite && !invite.ok) {
        console.error('Repo invite failed for payment', paymentId, {
          repo,
          reason: invite.reason,
        })
      }
      if (!githubUsername) {
        console.error('Kit purchase with no GitHub username', {
          paymentId,
          planId,
        })
      }

      await payload
        .update({
          collection: 'purchases',
          id: purchase.id,
          overrideAccess: true,
          data: {
            githubRepo: repo || undefined,
            githubInviteUrl: (invite?.ok && invite.url) || undefined,
            /* The buyer is seat one. Recording it is what keeps a team
               licence honest -- otherwise a five-seat buyer invites five
               more people and gets six. */
            ...(githubUsername
              ? {
                  seatMembers: [
                    {
                      githubUsername,
                      inviteUrl: (invite?.ok && invite.url) || undefined,
                      addedAt: new Date().toISOString(),
                    },
                  ],
                }
              : {}),
            fulfillmentStatus: invite?.ok ? 'sent' : 'pending_invite',
          },
        })
        .catch(() =>
          console.error('Purchase invite update failed for payment', paymentId)
        )

      await sendBoilerplateConfirmationEmail({
        to: email,
        itemName: item?.name || 'your kit',
        githubUsername: githubUsername || undefined,
        repo: repo || undefined,
        inviteUrl: invite?.ok ? invite.url : null,
        alreadyHadAccess:
          invite?.ok && invite.state === 'already-a-collaborator',
        seats: seatLimit(item),
        seatsUrl: null,
        onboardingUrl: null,
      }).catch((err) =>
        console.error('Kit confirmation email failed', paymentId, err)
      )
    } catch (err) {
      console.error(
        'Boilerplate fulfillment failed for payment',
        paymentId,
        err
      )
    }

    return new Response('ok', { status: 200 })
  }

  if (!service) {
    console.error('Whop payment for a plan no service claims', {
      paymentId,
      planId,
    })
  }

  const serviceName = service?.name || 'your engagement'
  /* Mail is best effort: the sale is recorded, which is what must not be
     lost. A mail failure is logged and the webhook still answers 200, or
     Whop would retry into the duplicate path for three days. */
  await Promise.all([
    sendDepositReceivedEmail({
      to: email,
      name: payment.user?.name || undefined,
      serviceName,
      amount,
      currency,
      bookingUrl: service?.bookingUrl || null,
    }).catch((err) => console.error('Deposit receipt failed', paymentId, err)),
    notifyDepositReceived({
      email,
      serviceName,
      amount,
      currency,
      paymentId,
    }).catch((err) => console.error('Deposit notify failed', paymentId, err)),
  ])

  return new Response('ok', { status: 200 })
}

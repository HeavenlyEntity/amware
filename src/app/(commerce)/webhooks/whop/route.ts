import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  verifyWhopWebhook,
  customFieldAnswer,
  type WhopPayment,
} from '@/lib/commerce/whop'
import { whopEnvironment } from '@/lib/commerce/whopEnv'
import { inviteToRepo, removeFromRepo } from '@/lib/commerce/githubInvite'
import { seatLimit } from '@/lib/commerce/seats'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import {
  sendDepositReceivedEmail,
  notifyDepositReceived,
  sendBoilerplateConfirmationEmail,
  notifyManualFulfilment,
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
 * download.
 *
 * Four routes, decided by what the plan resolves to: a service's deposit, a
 * kit (a repository invitation), any other product or course (owed by hand),
 * or nothing at all (recorded as failed for a human to look at). */

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

  if (event.type === 'membership.deactivated') {
    return handleDeactivated(event.data as DeactivatedMembership)
  }

  if (event.type !== 'payment.succeeded') {
    return new Response('ignored (event)', { status: 200 })
  }

  const payment = event.data as WhopPayment
  const paymentId = payment.id
  const planId = payment.plan?.id || null
  const email = payment.user?.email || null
  const githubUsername = customFieldAnswer(payment, GITHUB_FIELD)
  const licenseKey = payment.membership?.license_key || undefined
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
  /* A matched item that is neither a service nor a kit: a guide or any
     other product, or a course. Nothing automated delivers one, so it is
     owed by hand -- recorded as pending, and the owner is told. It must
     never reach the deposit block below, which would mail the buyer a
     receipt for an engagement deposit they never paid. */
  const deliveredByHand = Boolean(item) && !service && !isBoilerplate

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
        licenseKey,
        /* The installed SDK's Payment has a flat membership_id; older
           payloads nest it. Revocation finds the purchase by this id. */
        whopMembershipId:
          payment.membership?.id ?? payment.membership_id ?? undefined,
        whopPlanId: planId || undefined,
        amount,
        currency,
        status: 'paid',
        fulfillmentStatus: isBoilerplate
          ? 'pending_invite'
          : deliveredByHand
          ? 'pending'
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

      /* A Team licence covers more than one GitHub account, and the other
         seats are filled later from a signed page: /access/seats/<token>.
         The buyer never has an account with us, so this link is the only
         way back to that page. Without it a five-seat buyer gets one seat
         and no way to use the other four.
       *
         Signing can fail when ACCESS_LINK_SECRET is unset. That must not
         cost the buyer seat one, which they already have, so the failure
         is logged and delivery carries on. */
      const seats = seatLimit(item)
      const signed =
        seats > 1
          ? tryCreateAccessToken({
              purchaseId: purchase.id,
              itemType: 'product',
              itemId: item.id,
            })
          : null
      if (signed && !signed.ok) {
        console.error(
          'Seat link not signed for payment',
          paymentId,
          signed.reason
        )
      }
      const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
      const seatsUrl =
        signed?.ok && site ? `${site}/access/seats/${signed.token}` : null
      /* The way back to the setup page for a buyer who closed the tab --
         the page tells them it is in this email. Left out rather than sent
         relative when the site URL is not configured. */
      const setupUrl = site
        ? `${site}/checkout/onboarding?payment_id=${encodeURIComponent(
            paymentId
          )}`
        : undefined

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
            ...(signed?.ok ? { accessTokenJti: signed.jti } : {}),
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
        seats,
        seatsUrl,
        onboardingUrl: null,
        setupUrl,
        licenseKey,
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

  /* Owed by hand: a product that is not a kit, or a course. The buyer gets
     no email from here -- Whop sends its own receipt, and there is nothing
     of ours to deliver yet -- and the owner is told what to send. Mail is
     best effort: the sale is recorded, which is what must not be lost. */
  if (deliveredByHand) {
    await notifyManualFulfilment({
      email,
      itemName: item?.name || item?.title || 'an unnamed item',
      amount,
      currency,
      paymentId,
    }).catch((err) =>
      console.error('Manual fulfilment notify failed', paymentId, err)
    )

    return new Response('ok', { status: 200 })
  }

  /* The deposit block. Reached only by a service's deposit, or by a plan
     nothing claims -- which is recorded as failed and routed here exactly as
     it always was. */
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

/* A membership that has ended takes its repository access with it.
 *
 * "Repo access is the licence" is the spec's enforcement model, and it is
 * only half true if a refunded or charged-back buyer keeps the repo.
 *
 * Two guards before anything is removed. Whop documents that `completed`
 * one-time purchases KEEP access -- and every kit is a one-time purchase --
 * so only `canceled` and `expired` ever act. And removal is destructive
 * against an event this codebase has never seen a real payload for, so it
 * is off until WAREKIT_REVOKE_ON_DEACTIVATE=1. Until then the handler logs
 * exactly what it would have done, and those log lines are the capture
 * that justifies turning it on.
 *
 * Every seat member is removed, not just the buyer: a Team licence that
 * ends ends for all five. Nothing here throws, and the answer is always
 * 200 -- a retry cannot un-refund anyone.
 *
 * Once it acts, the purchase is marked refunded. That is what closes the
 * row's other doors: the seat page, addSeat and /access/resend all refuse
 * a purchase that is not paid, so a Team buyer cannot re-invite the people
 * just removed with a seat link that is still inside its 30 days. */
const ENDS_ACCESS = new Set(['canceled', 'expired'])

/* Every GitHub account a purchase grants -- the buyer's own and each
   seat's -- trimmed and lower-cased, because GitHub logins are
   case-insensitive and two spellings are one person. */
function loginsOf(purchase: {
  githubUsername?: string | null
  seatMembers?: { githubUsername?: string | null }[] | null
}): string[] {
  return [
    purchase.githubUsername,
    ...(purchase.seatMembers || []).map((m) => m?.githubUsername),
  ]
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim().toLowerCase())
}

/* The fields of a deactivated Membership this code reads. `plan_id` is flat
   in the dated API version the webhook is pinned to. */
type DeactivatedMembership = {
  id?: string
  status?: string
  plan_id?: string
}

async function handleDeactivated(membership: DeactivatedMembership) {
  const membershipId = membership?.id
  const status = membership?.status
  /* Every deactivation is logged, before any guard. Without this a payload
     whose shape does not match -- no id, no status where they are read --
     is indistinguishable in the logs from "no refunds happened", which is
     exactly the capture the flag is waiting on. */
  console.info('Whop membership deactivated', {
    membershipId,
    status,
    plan_id: membership?.plan_id,
  })
  if (!membershipId || !status || !ENDS_ACCESS.has(status)) {
    return new Response('ignored (access retained)', { status: 200 })
  }

  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { whopMembershipId: { equals: membershipId } },
      limit: 1,
      overrideAccess: true,
    })
    const sold = docs[0]
    if (!sold?.githubRepo) {
      return new Response('ignored (no kit for membership)', { status: 200 })
    }

    const usernames: string[] = (sold.seatMembers || [])
      .map((m: { githubUsername?: string }) => m.githubUsername)
      .filter(
        (u: unknown): u is string => typeof u === 'string' && u.length > 0
      )

    /* Pro and Team share one repository, so an account can hold access
       through more than one purchase -- a duplicate order, or a Pro buyer
       who is also a seat on a live Team licence. Ending one purchase must
       not take away what another still pays for.
     *
       Candidates are fetched by repo and status, and the logins compared
       here rather than in the query: Postgres `equals` is case-sensitive and
       GitHub logins are not. The row being revoked is excluded by id. This
       runs in log-only mode too, so "would revoke" names only the accounts
       that really would go. */
    const { docs: paidOnRepo } = await payload.find({
      collection: 'purchases',
      where: {
        githubRepo: { equals: sold.githubRepo },
        status: { equals: 'paid' },
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const coveredBy = new Map<string, number>()
    for (const other of paidOnRepo) {
      if (other.id === sold.id) continue
      for (const login of loginsOf(other)) {
        if (!coveredBy.has(login)) coveredBy.set(login, other.id)
      }
    }

    const revoke: string[] = []
    for (const username of usernames) {
      const other = coveredBy.get(username.trim().toLowerCase())
      if (other !== undefined) {
        console.info('Revocation skipped: still covered by another purchase', {
          membershipId,
          username,
          purchaseId: sold.id,
          coveredBy: other,
        })
        continue
      }
      revoke.push(username)
    }

    if (process.env.WAREKIT_REVOKE_ON_DEACTIVATE !== '1') {
      console.warn('Would revoke repo access (flag off)', {
        membershipId,
        status,
        repo: sold.githubRepo,
        usernames: revoke,
      })
      return new Response('ok (logged only)', { status: 200 })
    }

    for (const username of revoke) {
      const result = await removeFromRepo({ repo: sold.githubRepo, username })
      if (!result.ok) {
        console.error('Revoke failed', {
          membershipId,
          username,
          reason: result.reason,
        })
      }
    }

    /* After the removals, and whether or not each one landed: the licence
       has ended either way, and a removal GitHub refused is already logged
       above for a human. The status is what stops the row granting again. */
    await payload.update({
      collection: 'purchases',
      id: sold.id,
      overrideAccess: true,
      data: { status: 'refunded' },
    })
  } catch (err) {
    console.error('Deactivation handling failed', membershipId, err)
  }
  return new Response('ok', { status: 200 })
}

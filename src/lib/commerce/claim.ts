'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase } from '@/lib/commerce/licenseRecord'
import { creemEnvironment } from '@/lib/commerce/creemEnv'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'

/*
 * Claiming a free Lite kit. Same delivery as a paid one -- a repository
 * invitation -- with no payment in front of it.
 *
 * The idempotency key does double duty. There is no Creem order to key on,
 * so the purchase row carries a synthetic one: `free:<slug>:<username>`.
 * `creemOrderId` is already unique and indexed, so the database itself
 * enforces one free claim per GitHub account per kit. That is also the only
 * abuse limit worth having here: email is free to invent, but the invitation
 * goes to the GitHub account, so the account is the thing that has to be
 * unique. Claiming twice re-sends the invitation rather than creating a
 * second row.
 *
 * It refuses to hand out anything that is not actually free. The price is
 * read from the product, never from the form -- otherwise this action is a
 * way to claim the $499 kit by posting a slug.
 */

export type ClaimState = {
  error: { field: 'githubUsername' | 'email' | null; message: string } | null
  ok: {
    itemName: string
    repo: string
    username: string
    /** GitHub's accept link, when an invitation was actually created. */
    inviteUrl: string | null
    /** True when GitHub said the account already had access. */
    alreadyHadAccess: boolean
    /** True when the invitation could not be sent and a human must finish it. */
    manual: boolean
    /** The claim's idempotency key, `free:<slug>:<username>`. One per real
        claim, so the page can report the conversion once however many times
        the form is re-sent. */
    eventId: string
    /** The address the claim was sent to, echoed back to the person who typed it. */
    email: string
  } | null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ClaimField = 'githubUsername' | 'email' | null

const fail = (field: ClaimField, message: string): ClaimState => ({
  error: { field, message },
  ok: null,
})

async function githubAccountExists(login: string): Promise<boolean | null> {
  const token = process.env.GITHUB_TOKEN
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(4000),
      }
    )
    if (res.status === 404) return false
    if (!res.ok) return null
    return true
  } catch {
    return null
  }
}

export async function claimFreeKit(
  _prevState: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const slug = String(formData.get('slug') || '')
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase()
  const username = String(formData.get('githubUsername') || '').trim()

  if (!slug) throw new Error('Invalid claim request') // hidden input stripped

  if (!EMAIL.test(email)) {
    return fail('email', 'Enter an email address so I can send you the link.')
  }

  const problem = checkGithubUsername(username)
  if (problem) return fail('githubUsername', usernameMessage(problem)!)

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const item = docs[0]

  /* Free means the catalogue says it is free. Anything else and this action
     becomes a way to claim a paid kit by posting its slug. */
  if (!item || item.type !== 'boilerplate' || item.price !== 0) {
    return fail(null, 'This kit is not available for free.')
  }
  if (!item.githubRepo) {
    return fail(
      null,
      'This kit has no repository attached yet, so there is nothing to give you access to. Nothing was recorded. Try again later.'
    )
  }

  // Same fail-open rule as checkout: only GitHub explicitly saying the
  // account does not exist stops this. An outage says nothing about the name.
  if ((await githubAccountExists(username)) === false) {
    return fail(
      'githubUsername',
      `GitHub has no account called “${username}”. Check the spelling: this is where access will be sent.`
    )
  }

  const claimId = `free:${slug}:${username.toLowerCase()}`
  const itemName = item.name || 'the kit'

  const existing = await payload.find({
    collection: 'purchases',
    where: { creemOrderId: { equals: claimId } },
    limit: 1,
    overrideAccess: true,
  })

  let purchase = existing.docs[0]
  let purchaseId = purchase?.id
  if (!purchaseId) {
    try {
      const created = await payload.create({
        collection: 'purchases',
        overrideAccess: true,
        data: {
          email,
          item: { relationTo: 'products', value: item.id },
          itemType: 'product',
          creemOrderId: claimId,
          amount: 0,
          currency: item.currency || 'USD',
          githubUsername: username,
          githubRepo: item.githubRepo,
          // 'paid' is the only completed state the schema has. Amount 0 is
          // what marks it free; adding an enum value would mean migrating a
          // live column for no gain.
          status: 'paid',
          fulfillmentStatus: 'pending_invite',
        },
      })
      purchase = created
      purchaseId = created.id
    } catch {
      // Lost a race on the unique key: the other request created it.
      const recheck = await payload.find({
        collection: 'purchases',
        where: { creemOrderId: { equals: claimId } },
        limit: 1,
        overrideAccess: true,
      })
      purchase = recheck.docs[0]
      purchaseId = purchase?.id
      if (!purchaseId) {
        return fail(
          null,
          'Something went wrong recording that. Nothing was sent. Please try again.'
        )
      }
    }
  }

  /* Every claim is a Lite license, so a later Pro sale under the same email
     joins it instead of starting another. Attached before the invitation
     because the claim is already recorded: a failure here is logged and must
     never fail it. A repeat claim attaches only if the first one never did.
     The username is not copied into the license's seats; the paid repo is a
     different repo and its seat is recorded when the buyer onboards. */
  if (!purchase.license) {
    try {
      if (!item.stack) throw new Error('kit has no stack')
      await attachPurchase(payload, {
        purchase,
        email: purchase.email || email,
        stack: item.stack,
        grantsTier: 'lite',
        licenseId: undefined,
        environment: creemEnvironment(),
      })
    } catch (err) {
      console.error('Free claim license attach failed', claimId, err)
    }
  }

  /* Sending again on a repeat claim is deliberate. GitHub answers 204 if the
     account already has access, so this is safe to repeat, and re-sending is
     exactly what someone who lost the email needs. */
  const invite = await inviteToRepo({
    repo: item.githubRepo,
    username,
  })

  if (!invite.ok) {
    console.error('Free claim invite failed', {
      claimId,
      repo: item.githubRepo,
      reason: invite.reason,
    })
  }

  await payload
    .update({
      collection: 'purchases',
      id: purchaseId,
      overrideAccess: true,
      data: {
        ...(invite.ok && invite.url ? { githubInviteUrl: invite.url } : {}),
        fulfillmentStatus: invite.ok ? 'sent' : 'pending_invite',
      },
    })
    .catch(() => console.error('Free claim status update failed', claimId))

  const alreadyHadAccess =
    invite.ok && invite.state === 'already-a-collaborator'

  // Best-effort: access has already been granted, and a bounced email must
  // not undo it. The page shows the same information either way.
  try {
    await sendBoilerplateConfirmationEmail({
      to: email,
      itemName,
      githubUsername: username,
      repo: item.githubRepo,
      inviteUrl: invite.ok ? invite.url : null,
      alreadyHadAccess,
    })
  } catch {
    console.error('Free claim email failed', claimId)
  }

  return {
    error: null,
    ok: {
      itemName,
      repo: item.githubRepo,
      username,
      inviteUrl: invite.ok ? invite.url : null,
      alreadyHadAccess,
      manual: !invite.ok,
      eventId: claimId,
      email,
    },
  }
}

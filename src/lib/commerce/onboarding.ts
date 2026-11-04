'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase, licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { licenseLimits } from '@/lib/commerce/license'
import { licenseLinkFor } from '@/lib/commerce/licenseLink'
import { hasSeat, listSeats } from '@/lib/commerce/seats'
import { reserveSeat, setSeatInvite } from '@/lib/commerce/licenseSeats'
import { claimGithubUsername } from '@/lib/commerce/purchaseClaim'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
import { verifyOnboardingLink } from '@/lib/commerce/onboardingLink'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'

/*
 * Finishing a purchase: the buyer names the GitHub account, and the kit goes
 * there.
 *
 * Every route into this action re-verifies the signed link. The page verified
 * it to render, but a page render is not a permission -- the form posts on its
 * own and has to prove itself on its own.
 *
 * Two gates, both required. The signature proves we minted the link. A paid
 * purchase carrying that request id proves the money arrived, which the
 * signature cannot, because the link is minted before payment.
 *
 * And it works once. The link stays valid, so without a limit it could be
 * replayed with a new username each time, and every replay would send another
 * repository invitation past the license's seat limit. The account is
 * claimed with one conditional UPDATE that only succeeds while the purchase
 * still has none, and the invitation goes out only after that UPDATE wins.
 * A license has a seat limit, and the emailed link can outlive a seat that was
 * since filled from the license page. So the limit is checked before the
 * claim, and a full license sends nothing unless the account is already one of
 * its seats.
 *
 * One exception to "once": an invitation that failed leaves the row at
 * 'pending_invite' with the account kept and no invite link. The same account
 * may be submitted again then, which only repeats an idempotent GitHub call.
 * The name cannot change on a retry.
 *
 * Everything that can fail in a way the buyer can fix -- a misspelt account,
 * a kit with no repository -- is checked before the claim, so a correctable
 * mistake never uses up the one attempt.
 */

export type OnboardingState = {
  error: { field: 'githubUsername' | null; message: string } | null
  ok: {
    username: string
    repo: string
    inviteUrl: string | null
    alreadyHadAccess: boolean
    /** True when nothing could be sent and a human has to finish it. */
    manual: boolean
    /** The license page for this purchase, while it is young enough to mint
        one. Null otherwise; the page then points at the resend route. */
    licenseUrl: string | null
  } | null
}

const fail = (
  field: 'githubUsername' | null,
  message: string
): OnboardingState => ({ error: { field, message }, ok: null })

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

const ALREADY_SET_UP =
  'This purchase is already set up. If the account on file is the wrong one, reply to your receipt email and I will change it.'

const BY_HAND =
  'Something went wrong finishing this purchase. Your payment is safe: reply to your receipt email and I will set up your access by hand.'

const NOT_A_KIT =
  'There is no repository to set up for this purchase. Reply to your receipt email and I will sort it out by hand.'

const TRY_AGAIN =
  'I could not record that just now, and nothing was sent. Please try again in a moment.'

const relationId = (value: unknown) =>
  value && typeof value === 'object' ? (value as { id?: unknown }).id : value

const seatsFull = (used: number, limit: number) =>
  `This license covers ${limit} ${
    limit === 1 ? 'developer' : 'developers'
  } and all ${used} ${
    used === 1 ? 'is' : 'are'
  } in use, so I have not sent an invitation. Your license page has the options: open the license link in your receipt email.`

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const requestId = String(formData.get('r') || '')
  const signature = String(formData.get('s') || '')
  const username = String(formData.get('githubUsername') || '').trim()

  if (!verifyOnboardingLink(requestId, signature)) {
    return fail(
      null,
      'This setup link is not valid. Use the link in your purchase email, or reply to it and I will send a new one.'
    )
  }

  const problem = checkGithubUsername(username)
  if (problem) return fail('githubUsername', usernameMessage(problem)!)

  /* A paying buyer must not meet a thrown error because the database blinked.
     Nothing has been sent or claimed yet, so asking them to try again is true. */
  let payload: Awaited<ReturnType<typeof getPayloadClient>>
  let purchase
  try {
    payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { creemRequestId: { equals: requestId } },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })
    purchase = docs[0]
  } catch (err) {
    console.error('Onboarding lookup failed', err)
    return fail(null, TRY_AGAIN)
  }

  /* Signed but unpaid. The link is minted at checkout, so someone can hold it
     without ever paying -- and the webhook is what creates this row. It can
     also simply be early: the browser redirect regularly beats the
     server-to-server webhook by a second or two. Either way the honest answer
     is the same, and it is never the kit. */
  if (!purchase || purchase.status !== 'paid') {
    return fail(
      null,
      'That payment has not reached me yet. It usually takes a few seconds — refresh this page, and if it persists reply to your receipt.'
    )
  }

  const product =
    purchase.item && typeof purchase.item === 'object'
      ? (purchase.item as { value?: unknown }).value
      : null
  const productDoc = (
    product && typeof product === 'object' ? product : null
  ) as {
    githubRepo?: string | null
    name?: string | null
    id?: number | string
    type?: string | null
    stack?: string | null
    tier?: string | null
  } | null

  /* Only a kit has a repository to invite anyone to. */
  if (productDoc?.type !== 'boilerplate') return fail(null, NOT_A_KIT)

  /* A kit row is created 'pending_invite' and stays there until an
     invitation is sent. Anything else is a row this page must not act on:
     'failed' is one a person is working by hand, 'not_required' is an upgrade
     that grants no repository of its own, and 'sent' is already done.

     The one second chance: an invitation that failed leaves the account on the
     row, still 'pending_invite', with no invite link. Submitting that same
     account again repeats an idempotent call. */
  if (purchase.fulfillmentStatus === 'failed') return fail(null, BY_HAND)
  const stored = purchase.githubUsername || ''
  const retry =
    Boolean(stored) &&
    purchase.fulfillmentStatus === 'pending_invite' &&
    !purchase.githubInviteUrl
  if (stored || purchase.fulfillmentStatus === 'sent') {
    if (!retry || stored.toLowerCase() !== username.toLowerCase()) {
      return fail(null, ALREADY_SET_UP)
    }
  } else if (purchase.fulfillmentStatus !== 'pending_invite') {
    return fail(null, NOT_A_KIT)
  }
  const account = retry ? stored : username

  const repo = productDoc?.githubRepo || purchase.githubRepo
  if (!repo) {
    return fail(
      null,
      'This kit has no repository attached yet. Reply to your receipt and I will sort it by hand.'
    )
  }

  /* The license's seat limit, before anything is claimed or sent. The emailed
     link outlives the moment of purchase, and a seat may have been filled from
     the license page since. An account that already holds a seat is accepted
     and not added twice. A purchase with no license has no limit to read.
   *
     This check spares the buyer a used-up claim on a license that is plainly
     full. It is not the one that holds: the seat is taken under the
     license's lock after the claim, and that is what a seat filled from the
     license page in the meantime meets. */
  const licenseId = relationId(purchase.license) as string | number | null
  let seatProduct: unknown = productDoc
  if (licenseId) {
    /* A lookup that fails says nothing about whether the license is full, so
       it refuses and sends nothing, exactly like the lookups above. Fail-open
       here would let a database blink hand out a seat past the limit. */
    let found: Awaited<ReturnType<typeof licenseFromClaims>>
    try {
      found = await licenseFromClaims(payload, { licenseId })
    } catch (err) {
      console.error('Onboarding license lookup failed', purchase.id, err)
      return fail(null, TRY_AGAIN)
    }
    if (found?.license) {
      seatProduct = found.product ?? productDoc
      const members = found.license.seatMembers ?? []
      const limit = licenseLimits(found.license, seatProduct).seats
      const used = listSeats(members).length
      if (!hasSeat(members, account) && used >= limit) {
        return fail(null, seatsFull(used, limit))
      }
    }
  }

  /* Fails open, as everywhere else: only GitHub saying the account is absent
     stops this. A timeout or a rate limit says nothing about the name, and
     this buyer has already paid. Before the claim, so a typo can be fixed. */
  if (!retry && (await githubAccountExists(account)) === false) {
    return fail(
      'githubUsername',
      `GitHub has no account called “${username}”. Check the spelling: this is where the repository invitation is sent.`
    )
  }

  /* The claim. Whoever wins this invites; whoever loses is a replay or a
     second tab, and gets the same answer as a row that was already set up.
     When the database cannot decide, nobody is invited. */
  if (!retry) {
    let claimed = false
    try {
      claimed = await claimGithubUsername(payload, purchase.id, account)
    } catch (err) {
      console.error('Onboarding claim failed', purchase.id, err)
      return fail(null, TRY_AGAIN)
    }
    if (!claimed) return fail(null, ALREADY_SET_UP)
  }

  /* The buyer's seat, taken before the invitation goes and under the
     license's lock, so a developer added from the license page at the same
     moment cannot take the last seat as well. If the license filled up after
     the check above, nothing is sent. The account stays on the purchase,
     which leaves it at the retry state: the same account can be sent again
     once a seat is free. */
  let reserved: Awaited<ReturnType<typeof reserveSeat>> | null = null
  if (licenseId) {
    try {
      reserved = await reserveSeat(payload, {
        licenseId,
        username: account,
        product: seatProduct,
      })
    } catch (err) {
      console.error('Onboarding seat record failed', purchase.id, err)
      return fail(null, TRY_AGAIN)
    }
    if (reserved.status === 'full') {
      return fail(null, seatsFull(reserved.used.length, reserved.limit))
    }
  }

  const invite = await inviteToRepo({ repo, username: account })
  if (!invite.ok) {
    console.error('Onboarding invite failed', {
      purchase: purchase.id,
      repo,
      reason: invite.reason,
    })
  }

  const alreadyHadAccess =
    invite.ok && invite.state === 'already-a-collaborator'
  const inviteUrl = (invite.ok && invite.url) || null

  /* The buyer is seat one, on the license, and the invitation's link goes on
     that seat. A purchase whose first attach failed has no license yet: try
     to attach it now, which is what the webhook would have done, and give
     the buyer their seat there with no limit to meet, as the webhook would
     have. If any of this fails the seat is not recorded -- the account is
     still on the purchase, and nothing here may fail the buyer -- and the
     license page is where it gets repaired. */
  let seatLicenseId = licenseId
  if (seatLicenseId) {
    if (reserved?.status === 'added' && inviteUrl) {
      await setSeatInvite(payload, {
        licenseId: seatLicenseId,
        username: account,
        inviteUrl,
      }).catch((err) =>
        console.error('Onboarding seat record failed', purchase.id, err)
      )
    }
  } else {
    const tier = purchase.grantsTier || productDoc?.tier || null
    try {
      if (!tier || !productDoc?.stack)
        throw new Error('kit has no tier or stack')
      const attached = await attachPurchase(payload, {
        purchase,
        email: purchase.email,
        stack: productDoc.stack,
        grantsTier: tier,
        licenseId: undefined,
        environment: purchase.creemEnvironment || undefined,
      })
      seatLicenseId = attached?.id ?? null
    } catch (err) {
      console.error('Onboarding license attach failed', purchase.id, err)
    }
    if (seatLicenseId) {
      await reserveSeat(payload, {
        licenseId: seatLicenseId,
        username: account,
        product: null,
        enforceLimit: false,
        inviteUrl,
      }).catch((err) =>
        console.error('Onboarding seat record failed', purchase.id, err)
      )
    }
  }

  /* Recorded whether or not the invitation sent. The username is already
     safe -- the claim wrote it -- so a failed invite leaves a purchase a
     person can finish, not one the buyer must be asked about again. */
  await payload
    .update({
      collection: 'purchases',
      id: purchase.id,
      overrideAccess: true,
      data: {
        githubRepo: repo,
        ...(invite.ok && invite.url ? { githubInviteUrl: invite.url } : {}),
        fulfillmentStatus: invite.ok ? 'sent' : 'pending_invite',
      },
    })
    .catch(() => console.error('Onboarding record failed', purchase.id))

  // Best-effort: access is already granted, and a bounced email must not
  // undo it. The page shows the same information either way.
  try {
    await sendBoilerplateConfirmationEmail({
      to: purchase.email,
      itemName: productDoc?.name || 'your kit',
      githubUsername: account,
      repo,
      inviteUrl: invite.ok ? invite.url : null,
      alreadyHadAccess,
    })
  } catch {
    console.error('Onboarding email failed', purchase.id)
  }

  return {
    error: null,
    ok: {
      username: account,
      repo,
      inviteUrl: invite.ok ? invite.url : null,
      alreadyHadAccess,
      manual: !invite.ok,
      licenseUrl: licenseLinkFor({
        purchase,
        licenseId: seatLicenseId ?? undefined,
        itemId: productDoc?.id,
      }).url,
    },
  }
}

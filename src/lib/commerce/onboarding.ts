'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase } from '@/lib/commerce/licenseRecord'
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

const relationId = (value: unknown) =>
  value && typeof value === 'object' ? (value as { id?: unknown }).id : value

/* Record the buyer as seat one on the license. Never throws: the invitation
   has already been sent, and a failed write here must not turn that into an
   error the buyer sees.

   The buyer's account is also on the purchase (the claim wrote it), so the
   record survives even when this write does not. */
async function recordSeat(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  licenseId: string | number,
  username: string,
  inviteUrl: string | null
) {
  try {
    const license = await payload.findByID({
      collection: 'licenses',
      id: licenseId,
      depth: 0,
      overrideAccess: true,
    })
    const members = license?.seatMembers ?? []
    const taken = members.some(
      (m) => m.githubUsername?.toLowerCase() === username.toLowerCase()
    )
    if (taken) return
    await payload.update({
      collection: 'licenses',
      id: licenseId,
      overrideAccess: true,
      data: {
        seatMembers: [
          ...members,
          {
            githubUsername: username,
            inviteUrl: inviteUrl || undefined,
            addedAt: new Date().toISOString(),
          },
        ],
      },
    })
  } catch (err) {
    console.error('Onboarding seat record failed', licenseId, err)
  }
}

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

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'purchases',
    where: { creemRequestId: { equals: requestId } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  const purchase = docs[0]

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
    type?: string | null
    stack?: string | null
    tier?: string | null
  } | null

  /* Only a kit has a repository to invite anyone to. */
  if (productDoc?.type !== 'boilerplate') return fail(null, NOT_A_KIT)

  /* A kit row is created 'pending_invite' and stays there until an
     invitation is sent. Anything else is a row this page must not act on:
     'failed' is one a person is working by hand, 'not_required' is an upgrade
     that grants no repository of its own, and 'sent' is already done. */
  if (purchase.fulfillmentStatus === 'failed') return fail(null, BY_HAND)
  if (purchase.githubUsername || purchase.fulfillmentStatus === 'sent') {
    return fail(null, ALREADY_SET_UP)
  }
  if (purchase.fulfillmentStatus !== 'pending_invite') {
    return fail(null, NOT_A_KIT)
  }

  const repo = productDoc?.githubRepo || purchase.githubRepo
  if (!repo) {
    return fail(
      null,
      'This kit has no repository attached yet. Reply to your receipt and I will sort it by hand.'
    )
  }

  /* Fails open, as everywhere else: only GitHub saying the account is absent
     stops this. A timeout or a rate limit says nothing about the name, and
     this buyer has already paid. Before the claim, so a typo can be fixed. */
  if ((await githubAccountExists(username)) === false) {
    return fail(
      'githubUsername',
      `GitHub has no account called “${username}”. Check the spelling: this is where the repository invitation is sent.`
    )
  }

  /* The claim. Whoever wins this invites; whoever loses is a replay or a
     second tab, and gets the same answer as a row that was already set up.
     When the database cannot decide, nobody is invited. */
  let claimed = false
  try {
    claimed = await claimGithubUsername(payload, purchase.id, username)
  } catch (err) {
    console.error('Onboarding claim failed', purchase.id, err)
    return fail(
      null,
      'I could not record that just now, and nothing was sent. Please try again in a moment.'
    )
  }
  if (!claimed) return fail(null, ALREADY_SET_UP)

  const invite = await inviteToRepo({ repo, username })
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

  /* The buyer is seat one, on the license. A purchase whose first attach
     failed has none: try to attach it now, which is what the webhook would
     have done. If that fails too the seat is not recorded -- the account is
     still on the purchase, and nothing here may fail the buyer -- and the
     license page is where it gets repaired. */
  let licenseId = relationId(purchase.license) as string | number | null
  if (!licenseId) {
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
      licenseId = attached?.id ?? null
    } catch (err) {
      console.error('Onboarding license attach failed', purchase.id, err)
    }
  }
  if (licenseId) await recordSeat(payload, licenseId, username, inviteUrl)

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
      githubUsername: username,
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
      username,
      repo,
      inviteUrl: invite.ok ? invite.url : null,
      alreadyHadAccess,
      manual: !invite.ok,
    },
  }
}

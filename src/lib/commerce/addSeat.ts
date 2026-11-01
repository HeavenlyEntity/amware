'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'
import { canAddSeat, listSeats, seatLimit, seatsFullMessage } from './seats'

/*
 * Adding a collaborator to a team licence, after the sale.
 *
 * A Team buyer does not know all five of their people at checkout, so seats
 * are filled over weeks from a signed link emailed at purchase. That link is
 * the authentication: `verifyAccessToken` already proves "you are the person
 * who made this purchase" without an account, which is the same mechanism the
 * digital downloads use. No login to build, nothing new to secure.
 *
 * The seat limit is read from the product every time rather than copied onto
 * the purchase, so the number on the pricing page and the number enforced
 * here cannot drift.
 */

export type AddSeatState = {
  error: { field: 'githubUsername' | null; message: string } | null
  ok: { username: string; inviteUrl: string | null; manual: boolean } | null
  seats: { used: string[]; limit: number } | null
}

const fail = (
  field: 'githubUsername' | null,
  message: string,
  seats: AddSeatState['seats'] = null
): AddSeatState => ({ error: { field, message }, ok: null, seats })

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

export async function addSeat(
  _prevState: AddSeatState,
  formData: FormData
): Promise<AddSeatState> {
  const token = String(formData.get('token') || '')
  const username = String(formData.get('githubUsername') || '').trim()

  const claims = verifyAccessToken(token)
  // A link for a license with no purchase yet cannot add a seat until the
  // license page reads seats from the license itself.
  if (!claims || claims.purchaseId == null) {
    return fail(
      null,
      'This link is no longer valid. Request a fresh one from the access page.'
    )
  }

  const problem = checkGithubUsername(username)
  if (problem) return fail('githubUsername', usernameMessage(problem)!)

  const payload = await getPayloadClient()
  const purchase = await payload
    .findByID({
      collection: 'purchases',
      id: claims.purchaseId,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!purchase || purchase.status !== 'paid') {
    return fail(null, 'This link is no longer valid.')
  }

  const product =
    purchase.item && typeof purchase.item === 'object'
      ? (purchase.item as { value?: unknown }).value
      : null
  const productDoc = (
    product && typeof product === 'object' ? product : null
  ) as { seats?: number | null; githubRepo?: string | null } | null

  const repo = productDoc?.githubRepo || purchase.githubRepo
  if (!repo) {
    return fail(null, 'This licence has no repository attached. Get in touch.')
  }

  const members = purchase.seatMembers || []
  const limit = seatLimit(productDoc)
  const snapshot = { used: listSeats(members), limit }

  const verdict = canAddSeat(members, username, productDoc)
  if (!verdict.allowed) {
    return fail(
      'githubUsername',
      seatsFullMessage(verdict.used, verdict.limit),
      snapshot
    )
  }

  // Fail-open, as everywhere else: only GitHub saying the account is absent
  // stops this. An outage tells us nothing about the name.
  if ((await githubAccountExists(username)) === false) {
    return fail(
      'githubUsername',
      `GitHub has no account called “${username}”. Check the spelling.`,
      snapshot
    )
  }

  const invite = await inviteToRepo({ repo, username })
  if (!invite.ok) {
    console.error('Seat invite failed', {
      purchase: purchase.id,
      repo,
      reason: invite.reason,
    })
  }

  /* Appended only when the account is genuinely new to the licence. Writing a
     row for someone already on it would spend a seat on a re-invitation,
     which is how a full team locks itself out by retrying. */
  if (verdict.reason === 'new') {
    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: {
          seatMembers: [
            ...members,
            {
              githubUsername: username,
              inviteUrl: (invite.ok && invite.url) || undefined,
              addedAt: new Date().toISOString(),
            },
          ],
        },
      })
      .catch(() => console.error('Seat record failed', purchase.id))
  }

  const used =
    verdict.reason === 'new' ? [...snapshot.used, username] : snapshot.used

  return {
    error: null,
    ok: {
      username,
      inviteUrl: invite.ok ? invite.url : null,
      manual: !invite.ok,
    },
    seats: { used, limit },
  }
}

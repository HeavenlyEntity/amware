'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'
import { licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { licenseLimits } from '@/lib/commerce/license'
import { canAddSeat, listSeats, seatsFullMessage } from './seats'

/*
 * Adding a developer to a license, after the sale.
 *
 * A Team buyer does not know all five of their people at checkout, so seats
 * are filled over weeks from a signed link emailed at purchase. That link is
 * the authentication: `verifyAccessToken` already proves "you are the person
 * who holds this license" without an account, which is the same mechanism the
 * digital downloads use. No login to build, nothing new to secure.
 *
 * This is a public server action, so a hand-made POST reaches it as easily as
 * the form does. Nothing is trusted from the form but the token and the
 * username: the license, its seats and its limit are all read from the
 * database on every call. The limit comes from `licenseLimits`, the same
 * answer the license page shows, so the two cannot drift.
 *
 * Seats live on the license, which an upgrade does not replace, and the token
 * may name the license directly (an Enterprise license has no purchase yet).
 */

export type AddSeatState = {
  error: { field: 'githubUsername' | null; message: string } | null
  ok: {
    username: string
    inviteUrl: string | null
    manual: boolean
    /** True when the invitation went out but the seat could not be stored.
        `seats` then does not include the account. */
    unsaved: boolean
  } | null
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
  if (!claims) {
    return fail(
      null,
      'This link is no longer valid. Request a fresh one from the access page.'
    )
  }

  const problem = checkGithubUsername(username)
  if (problem) return fail('githubUsername', usernameMessage(problem)!)

  let payload: Awaited<ReturnType<typeof getPayloadClient>>
  let found: Awaited<ReturnType<typeof licenseFromClaims>>
  try {
    payload = await getPayloadClient()
    found = await licenseFromClaims(payload, claims)
  } catch (err) {
    console.error('Seat license lookup failed', err)
    return fail(
      null,
      'I could not reach your license just now, and nothing was sent. Please try again in a moment.'
    )
  }

  if (!found) return fail(null, 'This link is no longer valid.')
  const { license, purchase, product } = found

  // A refunded license has no tier, and no developers to add.
  if (!license.tier) {
    return fail(null, 'This license is no longer active. Get in touch.')
  }
  /* Enterprise has no kit row and takes its limits from the license itself.
     Any other tier without its row has no limit to read, and guessing one
     would either lock a buyer out or give seats away. */
  if (!product && license.tier !== 'enterprise') {
    return fail(
      null,
      'I could not read the limits for this license. Get in touch.'
    )
  }

  const repo = product?.githubRepo || purchase?.githubRepo
  if (!repo) {
    return fail(null, 'This license has no repository attached. Get in touch.')
  }

  const members = license.seatMembers || []
  const limit = licenseLimits(license, product).seats
  const snapshot = { used: listSeats(members), limit }

  const verdict = canAddSeat(members, username, limit)
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
      license: license.id,
      repo,
      reason: invite.reason,
    })
  }

  /* Appended only when the account is genuinely new to the license. Writing a
     row for someone already on it would spend a seat on a re-invitation,
     which is how a full team locks itself out by retrying. */
  let saved = true
  if (verdict.reason === 'new') {
    try {
      await payload.update({
        collection: 'licenses',
        id: license.id,
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
    } catch (err) {
      /* The invitation cannot be taken back, so say what is true: it went
         out, and the seat was not stored. Showing the account as added would
         be a seat that vanishes on the next load. */
      saved = false
      console.error('Seat record failed', license.id, err)
    }
  }

  const used =
    verdict.reason === 'new' && saved
      ? [...snapshot.used, username]
      : snapshot.used

  return {
    error: null,
    ok: {
      username,
      inviteUrl: invite.ok ? invite.url : null,
      manual: !invite.ok,
      unsaved: !saved,
    },
    seats: { used, limit },
  }
}

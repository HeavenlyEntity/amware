'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
import { inviteToRepo, removeFromRepo } from '@/lib/commerce/githubInvite'
import { CreemError, deactivateLicense } from '@/lib/commerce/creem'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'
import { currentKey, licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { licenseLimits } from '@/lib/commerce/license'
import {
  canAddSeat,
  hasSeat,
  listSeats,
  seatsFullMessage,
  type SeatMember,
} from './seats'

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
  /** Set by `removeSeat` only. */
  removed?: {
    username: string
    /** True when their repository access was left as it is: this license did
        not create it, or another paid license still covers the person. */
    accessKept: boolean
    /** True when GitHub let them go but the seat could not be freed.
        `seats` then still includes the account. */
    unsaved: boolean
  } | null
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

/* ------------------------------------------------------------------------
 * Removing a developer or a NetSuite account.
 *
 * Both are public server actions, like `addSeat`, and each verifies the
 * signed token itself. The form carries the token and one name; the license,
 * its seat list and every Creem instance id are read from the database, and
 * a name that is not on the stored list is refused rather than acted on. A
 * hand-made POST can therefore only ever remove something the token's own
 * license holds.
 * ---------------------------------------------------------------------- */

const lookupFailed =
  'I could not reach your license just now, and nothing was changed. Please try again in a moment.'

type Loaded = Awaited<ReturnType<typeof licenseFromClaims>>
type Payload = Awaited<ReturnType<typeof getPayloadClient>>
type Opened =
  | { ok: true; payload: Payload; found: NonNullable<Loaded> }
  | { ok: false; message: string }

/* Token to license, with the same answers `addSeat` gives. `licenseFromClaims`
   throws on anything but "not found", so a database failure is a try-again
   and never "no longer valid". */
async function openLicense(token: string): Promise<Opened> {
  const claims = verifyAccessToken(token)
  if (!claims) {
    return {
      ok: false,
      message:
        'This link is no longer valid. Request a fresh one from the access page.',
    }
  }
  try {
    const payload = await getPayloadClient()
    const found = await licenseFromClaims(payload, claims)
    if (!found) return { ok: false, message: 'This link is no longer valid.' }
    return { ok: true, payload, found }
  } catch (err) {
    console.error('License lookup for a removal failed', err)
    return { ok: false, message: lookupFailed }
  }
}

const sameName = (a?: string | null, b?: string | null) =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()

/* Tiers that are paid for. Lite is free and has its own repository, so a seat
   on someone's Lite license is not access to this one. */
const PAID_TIERS = ['pro', 'team', 'enterprise']

/* Does another paid license also hold this person? Pro and Team share a
   repository, and a sandbox license and a live one share the real repo, so
   the Creem environment is deliberately not compared: removing them there
   would take away what the other license still gives. The same check runs
   whichever of the two licenses the owner opens.

   `like` only narrows the search (it is a case-insensitive contains); the
   decision is made on the exact name here. */
async function coveredByAnotherLicense(
  payload: Payload,
  license: { id: number | string; stack?: string | null },
  username: string
): Promise<boolean> {
  const found = await payload.find({
    collection: 'licenses',
    where: {
      and: [
        { stack: { equals: license.stack } },
        { id: { not_equals: license.id } },
        { tier: { in: PAID_TIERS } },
        { 'seatMembers.githubUsername': { like: username } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return (found.docs ?? []).some(
    (other: {
      id: number | string
      tier?: string | null
      seatMembers?: SeatMember[] | null
    }) =>
      other.id !== license.id &&
      PAID_TIERS.includes(other.tier ?? '') &&
      hasSeat(other.seatMembers, username)
  )
}

export async function removeSeat(
  _prevState: AddSeatState,
  formData: FormData
): Promise<AddSeatState> {
  const token = String(formData.get('token') || '')
  const requested = String(formData.get('githubUsername') || '').trim()

  const opened = await openLicense(token)
  if (!opened.ok) return fail(null, opened.message)
  const { payload } = opened
  const { license, purchase, product } = opened.found

  if (!license.tier) {
    return fail(null, 'This license is no longer active. Get in touch.')
  }
  if (!product && license.tier !== 'enterprise') {
    return fail(
      null,
      'I could not read the limits for this license. Get in touch.'
    )
  }

  const members = license.seatMembers || []
  const limit = licenseLimits(license, product).seats
  const snapshot = { used: listSeats(members), limit }

  // The stored spelling, never the form's: only a listed developer is acted on.
  const username = snapshot.used.find((name) => sameName(name, requested))
  if (!username) {
    return fail(null, `@${requested} is not on this license.`, snapshot)
  }

  const repo = product?.githubRepo || purchase?.githubRepo
  if (!repo) {
    return fail(
      null,
      'This license has no repository attached. Get in touch.',
      snapshot
    )
  }

  /* Repository access is taken away only when this license is known to have
     created it. A seat row carries an `inviteUrl` only when `inviteToRepo`
     returned one, and it returns none for someone who was already a
     collaborator (state `already-a-collaborator`, url null). So a row with no
     link may be an existing collaborator, perhaps another customer, that an
     owner typed in; pressing Remove on it must not revoke them. A Lite
     license never removes anyone from a repo, and a person another paid
     license still covers keeps what that license gives. In every such case
     the seat is freed and GitHub is left alone. */
  const row = members.find((m: SeatMember) =>
    sameName(m.githubUsername, username)
  )
  const mayRevoke = PAID_TIERS.includes(license.tier) && Boolean(row?.inviteUrl)

  let accessKept = !mayRevoke
  if (mayRevoke) {
    try {
      accessKept = await coveredByAnotherLicense(payload, license, username)
    } catch (err) {
      console.error('Seat removal coverage check failed', license.id, err)
      return fail(null, lookupFailed, snapshot)
    }
  }

  /* GitHub first. If it refuses, the seat stays: freeing it would let the
     owner add someone else while the old account still reads the code. */
  if (!accessKept) {
    const gone = await removeFromRepo({ repo, username })
    if (!gone.ok) {
      console.error('Seat removal failed', {
        license: license.id,
        repo,
        reason: gone.reason,
      })
      return fail(
        null,
        `GitHub would not remove @${username} just now, so the seat is kept. Try again in a moment, or get in touch.`,
        snapshot
      )
    }
  }

  /* Written from a fresh read, not the one at the top: the GitHub call took
     time, and someone else on the same license may have added a developer in
     it. Payload cannot remove one array row atomically, so this narrows the
     window instead. */
  let saved = true
  let used = snapshot.used.filter((name) => !sameName(name, username))
  try {
    const fresh = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    const kept = (fresh.seatMembers || []).filter(
      (m: SeatMember) => !sameName(m.githubUsername, username)
    )
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { seatMembers: kept },
    })
    used = listSeats(kept)
  } catch (err) {
    saved = false
    used = snapshot.used
    console.error('Seat removal record failed', license.id, err)
  }

  return {
    error: null,
    ok: null,
    removed: { username, accessKept, unsaved: !saved },
    seats: { used, limit },
  }
}

export type RemoveAccountState = {
  error: { message: string } | null
  ok: {
    accountId: string
    /** True when Creem would not release the activation. The account is
        removed from the license regardless. */
    creemFailed: boolean
  } | null
  accounts: Array<{ accountId: string; status: string }> | null
}

const failAccount = (
  message: string,
  accounts: RemoveAccountState['accounts'] = null
): RemoveAccountState => ({ error: { message }, ok: null, accounts })

type AccountRow = {
  accountId?: string | null
  status?: string | null
  creemInstanceId?: string | null
}

/* Only what the page shows. The instance id stays on the server. */
const shown = (rows: AccountRow[]) =>
  rows.map((row) => ({
    accountId: String(row.accountId ?? ''),
    status: row.status || 'active',
  }))

export async function removeAccount(
  _prevState: RemoveAccountState,
  formData: FormData
): Promise<RemoveAccountState> {
  const token = String(formData.get('token') || '')
  const requested = String(formData.get('accountId') || '').trim()

  const opened = await openLicense(token)
  if (!opened.ok) return failAccount(opened.message)
  const { payload } = opened
  const { license } = opened.found

  if (!license.tier) {
    return failAccount('This license is no longer active. Get in touch.')
  }

  const rows: AccountRow[] = license.accounts || []
  const current = shown(rows)
  const row = rows.find((r) => sameName(r.accountId, requested))
  if (!row || !requested) {
    return failAccount(
      `${requested || 'That account'} is not on this license.`,
      current
    )
  }

  /* Creem is told only for an account it accepted: an `over_limit` row never
     got an instance, so there is nothing to release. Whatever Creem answers,
     the account leaves the license, because the table is the authority and
     Creem's count is a second record. */
  let creemFailed = false
  if (row.creemInstanceId) {
    try {
      const key = await currentKey(payload, license.id)
      if (!key) throw new Error('no license key to release the activation with')
      await deactivateLicense({ key, instanceId: row.creemInstanceId })
    } catch (err) {
      creemFailed = true
      console.error('Creem deactivation failed; removing the account anyway', {
        license: license.id,
        accountId: row.accountId,
        instanceId: row.creemInstanceId,
        status: err instanceof CreemError ? err.status : undefined,
      })
    }
  }

  try {
    const fresh = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    const kept = (fresh.accounts || []).filter(
      (r: AccountRow) => !sameName(r.accountId, requested)
    )
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { accounts: kept },
    })
    return {
      error: null,
      ok: { accountId: String(row.accountId), creemFailed },
      accounts: shown(kept),
    }
  } catch (err) {
    console.error('Account removal record failed', license.id, err)
    return failAccount(
      'I could not remove that account just now. Please try again in a moment.',
      current
    )
  }
}

'use server'

import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  readAccessToken,
  tryCreateAccessToken,
  verifyAccessToken,
} from '@/lib/commerce/accessToken'
import { sendLicenseLinkEmail } from '@/lib/commerce/fulfillment'
import { maskEmail } from '@/lib/commerce/onboardingDisplay'
import { inviteToRepo, removeFromRepo } from '@/lib/commerce/githubInvite'
import { CreemError, deactivateLicense } from '@/lib/commerce/creem'
import {
  checkGithubUsername,
  usernameMessage,
} from '@/lib/commerce/githubUsername'
import {
  claimLinkWindow,
  currentKey,
  licenseFromClaims,
  linkWindowOpen,
  releaseLinkWindow,
} from '@/lib/commerce/licenseRecord'
import { licenseLimits, upgradeReturn } from '@/lib/commerce/license'
import {
  coveredByAnotherLicense,
  licenseRepo,
  PAID_TIERS,
  repoOf,
} from '@/lib/commerce/repoAccess'
import type { License } from '@/payload-types'
import { reserveSeat, setSeatInvite } from '@/lib/commerce/licenseSeats'
import { withLicenseLock } from '@/lib/commerce/licenseLock'
import {
  canAddSeat,
  listSeats,
  seatLimit,
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
    /** Always false from `addSeat` now: the seat is stored before the
        invitation goes, and a seat that cannot be stored sends nothing. Kept
        so the form's state keeps one shape with `removed.unsaved`. */
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

  /* The kit row or the purchase the link names, else the license's own
     source: Enterprise has no kit row, and a link minted for a new license
     names no purchase. */
  let repo = repoOf({ product, purchase })
  if (!repo) {
    try {
      repo = await licenseRepo(payload, license)
    } catch (err) {
      console.error('Seat repository lookup failed', license.id, err)
      return fail(
        null,
        'I could not reach your license just now, and nothing was sent. Please try again in a moment.'
      )
    }
  }
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

  /* The seat is taken before the invitation goes, under the license's lock,
     against the seats as they are now rather than as they were read above.
     The check above only spares a full license a GitHub lookup; this is the
     one that holds when two adds race for the last seat, because only one of
     them can win it, and only the winner is invited. Someone already on the
     license takes no new seat: re-inviting is how an invitation nobody
     accepted gets a second chance, and it must not cost a full team a seat.
     When the seat cannot be stored, nothing has been sent. */
  let reserved: Awaited<ReturnType<typeof reserveSeat>>
  try {
    reserved = await reserveSeat(payload, {
      licenseId: license.id,
      username,
      product,
    })
  } catch (err) {
    console.error('Seat record failed', license.id, err)
    return fail(
      null,
      'I could not save that seat just now, and nothing was sent. Please try again in a moment.',
      snapshot
    )
  }
  const seats = { used: reserved.used, limit: reserved.limit }
  if (reserved.status === 'full') {
    return fail(
      'githubUsername',
      seatsFullMessage(
        reserved.used.length,
        seatLimit({ seats: reserved.limit })
      ),
      seats
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

  /* The link goes onto the seat just taken: it is what proves this license
     created the access. A failed invitation tells the buyer it will be sent
     by hand, so it puts the license in the review queue, where that gets
     done, whether or not the seat is new. Neither write can un-send the
     invitation, so a failure here is logged and the seat still counts. */
  try {
    await setSeatInvite(payload, {
      licenseId: license.id,
      username,
      inviteUrl:
        reserved.status === 'added' && invite.ok ? invite.url ?? null : null,
      needsReview: !invite.ok,
    })
  } catch (err) {
    console.error('Seat invite record failed', license.id, err)
  }

  return {
    error: null,
    ok: {
      username,
      inviteUrl: invite.ok ? invite.url : null,
      manual: !invite.ok,
      unsaved: false,
    },
    seats,
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

  let repo = repoOf({ product, purchase })
  if (!repo) {
    try {
      repo = await licenseRepo(payload, license)
    } catch (err) {
      console.error('Seat repository lookup failed', license.id, err)
      return fail(null, lookupFailed, snapshot)
    }
  }
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

  /* A paid license that frees a seat it cannot show it created is leaving
     repository access in place that nothing here can vouch for: the person
     may be a collaborator the owner typed in, or someone whose invitation
     link was never stored. A person should look at the repo. A Lite license
     has no paid repo to leave anyone in, and a person covered by another
     paid license is accounted for, so neither is flagged. */
  const unverifiedAccess = PAID_TIERS.includes(license.tier) && !row?.inviteUrl

  let accessKept = !mayRevoke
  if (mayRevoke) {
    try {
      accessKept = await coveredByAnotherLicense(payload, license, username)
    } catch (err) {
      // Code or name only: a database error's message carries the username.
      console.error(
        'Seat removal coverage check failed',
        license.id,
        err?.code ?? err?.name
      )
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

  /* Written from a fresh read under the license's lock, not the read at the
     top: the GitHub call took time, and someone may have added a developer
     in it. The lock holds from that read to the write, so nobody's seat is
     dropped by this one. */
  let saved = true
  let used = snapshot.used.filter((name) => !sameName(name, username))
  try {
    const kept = (await withLicenseLock(payload, license.id, async (tx) => {
      const fresh: License = await payload.findByID({
        collection: 'licenses',
        id: license.id,
        depth: 0,
        overrideAccess: true,
        ...tx,
      })
      const rest = (fresh.seatMembers || []).filter(
        (m: SeatMember) => !sameName(m.githubUsername, username)
      )
      await payload.update({
        collection: 'licenses',
        id: license.id,
        overrideAccess: true,
        data: {
          seatMembers: rest,
          ...(unverifiedAccess ? { needsReview: true } : {}),
        },
        ...tx,
      })
      return rest
    })) as SeatMember[]
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
    // A fresh read under the lock, so a report landing meanwhile is kept.
    const kept = (await withLicenseLock(payload, license.id, async (tx) => {
      const fresh: License = await payload.findByID({
        collection: 'licenses',
        id: license.id,
        depth: 0,
        overrideAccess: true,
        ...tx,
      })
      const rest = (fresh.accounts || []).filter(
        (r: AccountRow) => !sameName(r.accountId, requested)
      )
      await payload.update({
        collection: 'licenses',
        id: license.id,
        overrideAccess: true,
        data: { accounts: rest },
        ...tx,
      })
      return rest
    })) as AccountRow[]
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

/* ------------------------------------------------------------------------
 * The door on an expired license link.
 *
 * An access link lives 30 days, but an upgrade usually comes months later, so
 * the old email would be dead at the moment its owner is ready to pay. The
 * license page shows an expired but correctly signed link a button that comes
 * here, and this emails a fresh link to the license's owner.
 *
 * A public server action, and the only action that reads an expired link,
 * so it is deliberately narrow:
 *  - It verifies the signature itself with `readAccessToken`. A tampered link
 *    is `invalid` before any database read; only `expired` and `valid` go on.
 *  - The recipient is the license's stored `ownerEmail`. Nothing in the form
 *    but the token (and a wording hint, see below) is read, so the page cannot
 *    be used to mail anyone else, and the answer carries the address masked.
 *  - At most one mail in ten minutes per license, tracked on the license
 *    itself so a second link, a second tab or a second browser shares it.
 *    `lastLinkSentAt` is written BEFORE the mail goes, so a double click is
 *    stopped by the record rather than by the button. It is a read, then a
 *    write, not one atomic update: two requests that land inside the same few
 *    milliseconds can each pass the check and send one mail apiece. Two mails
 *    to the owner's own inbox is an acceptable worst case; the limit is there
 *    to stop a hand-made loop, which this still does.
 *  - A database failure is a "try again", never a throw at a buyer and never
 *    "invalid", which would tell a paying owner their link is dead. A failed
 *    mail is said plainly and gives the ten minutes back.
 * ---------------------------------------------------------------------- */

export type FreshLinkState = {
  status: 'idle' | 'sent' | 'limited' | 'failed' | 'retry' | 'invalid'
  message: string | null
}

const linkState = (
  status: FreshLinkState['status'],
  message: string
): FreshLinkState => ({ status, message })

export async function emailFreshLicenseLink(
  _prevState: FreshLinkState,
  formData: FormData
): Promise<FreshLinkState> {
  const read = readAccessToken(String(formData.get('token') || ''))
  // Tampered, foreign or unreadable: nothing is read from the database.
  if (read.state === 'invalid') {
    return linkState(
      'invalid',
      'This link is not valid. Request a new one from the access page.'
    )
  }
  const { claims } = read

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!site) {
    console.error('Fresh license link: NEXT_PUBLIC_SITE_URL is not set')
    return linkState(
      'failed',
      'I could not send the email just now, and nothing was sent. Please get in touch.'
    )
  }

  let payload: Payload
  let found: Loaded
  try {
    payload = await getPayloadClient()
    found = await licenseFromClaims(payload, claims)
  } catch (err) {
    console.error('Fresh license link lookup failed', err)
    return linkState(
      'retry',
      'I could not reach your license just now, and nothing was sent. Please try again in a moment.'
    )
  }
  if (!found) {
    return linkState(
      'invalid',
      'This link no longer leads to a license. Request a new one from the access page.'
    )
  }
  const { license, product } = found

  const owner = String(license.ownerEmail || '')
  if (!owner) {
    console.error('Fresh license link: license has no owner email', license.id)
    return linkState(
      'failed',
      'I could not find an address to send this to. Please get in touch.'
    )
  }
  // For the answers only. Never the address itself.
  const to = maskEmail(owner) ?? 'the address on the license'

  if (!linkWindowOpen(license)) {
    return linkState(
      'limited',
      `A new link was sent to ${to} a few minutes ago. Check that inbox, including spam, and try again in 10 minutes if it has not arrived.`
    )
  }

  /* The same claims, a new lifetime. */
  const signed = tryCreateAccessToken({
    purchaseId: claims.purchaseId ?? null,
    licenseId: claims.licenseId,
    itemType: claims.itemType,
    itemId: claims.itemId,
  })
  if (!signed.ok) {
    console.error('Fresh license link could not be signed', signed.reason)
    return linkState(
      'failed',
      'I could not make a new link just now, and nothing was sent. Please get in touch.'
    )
  }

  /* A buyer whose checkout outlived their link comes back with `upgraded`.
     Carrying it into the new address keeps "Confirming your upgrade. You
     don't need to pay again." on the page they open, until the payment
     lands. Only a known tier name is carried; the rest of the form is not. */
  const upgraded = upgradeReturn(null, formData.get('upgraded'))?.target
  const url = `${site}/access/seats/${signed.token}${
    upgraded ? `?upgraded=${upgraded}` : ''
  }`

  let previous: string | null
  try {
    previous = await claimLinkWindow(payload, license)
  } catch (err) {
    console.error('Fresh license link: could not record the send', err)
    return linkState(
      'retry',
      'I could not send the email just now, and nothing was sent. Please try again in a moment.'
    )
  }

  try {
    await sendLicenseLinkEmail({
      to: owner,
      itemName: product?.name || 'WareKit',
      url,
      reason: 'link',
    })
  } catch (err) {
    console.error('Fresh license link email failed', license.id, err)
    // Nothing went out, so the ten minutes are not spent.
    await releaseLinkWindow(payload, license, previous)
    return linkState(
      'failed',
      'I could not send the email just now, and nothing was sent. Please try again in a moment, or get in touch.'
    )
  }

  return linkState(
    'sent',
    `I sent a new link to ${to}. It can take a few minutes, and it may land in spam.`
  )
}

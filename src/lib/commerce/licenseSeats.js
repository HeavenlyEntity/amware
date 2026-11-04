/*
 * Writing a license's seats, one writer at a time.
 *
 * Every place that puts a developer on a license -- the license page, the
 * onboarding page, the webhook for an order that still carries a username --
 * goes through `reserveSeat`, and the invitation link GitHub hands back is
 * stored with `setSeatInvite`. Both read the license and write it under its
 * row lock (see licenseLock.js), so the seat limit is checked against the
 * seats as they are at that moment and no write can drop another's row.
 *
 * A seat is reserved BEFORE the invitation goes out. The invitation is the
 * thing that cannot be taken back, so it only goes to someone who already
 * holds a seat; two people racing for the last seat get one invitation
 * between them. A reserved seat whose invitation then fails stays: a person
 * finishes it by hand, which is what the buyer is told.
 *
 * A plain module, never a server action: every export of a 'use server' file
 * is a public endpoint. Imports are relative so the engine test project can
 * load it.
 */

import { licenseLimits } from './license'
import { withLicenseLock } from './licenseLock'
import { canAddSeat, listSeats } from './seats'

const sameName = (a, b) =>
  String(a ?? '')
    .trim()
    .toLowerCase() ===
  String(b ?? '')
    .trim()
    .toLowerCase()

const readLicense = (payload, licenseId, tx) =>
  payload.findByID({
    collection: 'licenses',
    id: licenseId,
    depth: 0,
    overrideAccess: true,
    ...tx,
  })

/**
 * Give `username` a seat on the license, unless they hold one already or the
 * license is full.
 *
 * `product` is the kit row the limit comes from (null for Enterprise, whose
 * limit is its override); the override is read from the license as it is
 * now. `enforceLimit: false` records the seat whatever the count, for a buyer
 * whose own seat was promised before the limit could be checked. `inviteUrl`
 * is stored with the seat when the invitation has already gone out.
 *
 * Returns `{ status: 'added' | 'member' | 'full', used, limit }`, where `used`
 * is the seats after this call. Throws when the license cannot be read or
 * written, and nothing was stored then.
 *
 * @param {any} payload
 * @param {{ licenseId: string | number, username: string, product?: any,
 *   enforceLimit?: boolean, inviteUrl?: string | null }} args
 * @returns {Promise<{ status: 'added' | 'member' | 'full', used: string[],
 *   limit: number }>}
 */
export async function reserveSeat(
  payload,
  { licenseId, username, product, enforceLimit = true, inviteUrl = null }
) {
  return withLicenseLock(payload, licenseId, async (tx) => {
    const license = await readLicense(payload, licenseId, tx)
    const members = license?.seatMembers ?? []
    const limit = licenseLimits(license, product).seats
    const used = listSeats(members)

    const verdict = canAddSeat(members, username, limit)
    if (verdict.reason === 'already-a-member') {
      return { status: 'member', used, limit }
    }
    if (!verdict.allowed && enforceLimit) {
      return { status: 'full', used, limit }
    }

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
      ...tx,
    })
    return { status: 'added', used: [...used, username], limit }
  })
}

/**
 * After the invitation: store its link on the seat it was sent for, and
 * queue the license for a person when it did not go out.
 *
 * The link goes only onto a row that has none. It is the proof this license
 * created the access (see `removeSeat` and `revokeLicenseAccess`), and a row
 * that already carries one keeps it. A seat removed in the meantime is not
 * put back. Throws when the license cannot be read or written.
 *
 * @param {any} payload
 * @param {{ licenseId: string | number, username: string,
 *   inviteUrl?: string | null, needsReview?: boolean }} args
 * @returns {Promise<void>}
 */
export async function setSeatInvite(
  payload,
  { licenseId, username, inviteUrl = null, needsReview = false }
) {
  if (!inviteUrl && !needsReview) return
  await withLicenseLock(payload, licenseId, async (tx) => {
    const data = {}
    if (inviteUrl) {
      const license = await readLicense(payload, licenseId, tx)
      let changed = false
      const members = (license?.seatMembers ?? []).map((row) => {
        if (
          changed ||
          row?.inviteUrl ||
          !sameName(row?.githubUsername, username)
        ) {
          return row
        }
        changed = true
        return { ...row, inviteUrl }
      })
      if (changed) data.seatMembers = members
    }
    if (needsReview) data.needsReview = true
    if (!Object.keys(data).length) return

    await payload.update({
      collection: 'licenses',
      id: licenseId,
      overrideAccess: true,
      data,
      ...tx,
    })
  })
}

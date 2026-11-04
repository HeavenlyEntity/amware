/*
 * Who has the kit repository through which license.
 *
 * A plain module, never a server action: `addSeat.ts` is 'use server', so
 * anything exported from it becomes a public endpoint, and the refund webhook
 * needs the same two answers. Both callers import them from here, so removing
 * a developer by hand and revoking a refunded license cannot drift apart.
 *
 * Imports are relative so the engine test project can load it.
 */

import { teamProductFor } from './licenseRecord'
import { hasSeat } from './seats'

/* Tiers that are paid for. Lite is free and has its own repository, so a seat
   on someone's Lite license is not access to this one. */
export const PAID_TIERS = ['pro', 'team', 'enterprise']

/** The repository a license's seats were invited to: the kit row that sets
    its limits, else the purchase it was sold on. */
export function repoOf({ product, purchase } = {}) {
  return product?.githubRepo || purchase?.githubRepo || null
}

/**
 * The repository for a license whose kit row cannot be found from its tier:
 * one that has lost it, and Enterprise, which never had one. Each sale copied
 * `githubRepo` from the product at purchase time, so a purchase on the license
 * still names it. Only a paid tier's rows are read: a Lite row names the Lite
 * repository, which no paid seat was invited to. An upgrade row names none;
 * the original sale does.
 *
 * Failing that, a license that is paid for, or holds an Enterprise quote, uses
 * the published Team row of its own stack. Enterprise has no `products` row of
 * its own, and the Team kit is the code it is sold. A license that was never
 * paid for does not: a refunded Lite license, say, has no claim on the paid
 * repository.
 *
 * Throws on a database failure, so a caller cannot mistake "could not look"
 * for "there is no repository".
 */
export async function licenseRepo(payload, license) {
  const found = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { license: { equals: license.id } },
        { githubRepo: { exists: true } },
      ],
    },
    sort: 'createdAt',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const row = (found.docs ?? []).find(
    (purchase) =>
      purchase?.githubRepo && PAID_TIERS.includes(purchase.grantsTier ?? '')
  )
  if (row?.githubRepo) return row.githubRepo

  const sold =
    PAID_TIERS.includes(license.tier ?? '') ||
    String(license.quoteCreemProductId ?? '').trim() !== ''
  if (!sold) return null
  return (await teamProductFor(payload, license.stack))?.githubRepo || null
}

/* Does another paid license also hold this person? Pro and Team share a
   repository, and a sandbox license and a live one share the real repo, so
   the Creem environment is deliberately not compared: removing them there
   would take away what the other license still gives. The same check runs
   whichever of the two licenses the owner opens.

   `like` only narrows the search (it is a case-insensitive contains); the
   decision is made on the exact name here. */
export async function coveredByAnotherLicense(payload, license, username) {
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
    (other) =>
      other.id !== license.id &&
      PAID_TIERS.includes(other.tier ?? '') &&
      hasSeat(other.seatMembers, username)
  )
}

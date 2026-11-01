/*
 * Reading and writing the license record.
 *
 * A plain module, never a server action: it must not carry 'use server',
 * because every export of such a file becomes a public endpoint. The webhook,
 * the free claim and the license page import it and pass in the Payload
 * client, which is why nothing here imports one.
 *
 * Imports are relative so the engine test project can load it.
 */

import {
  creemEnvironment,
  creemProductIdFor,
  creemUpgradeProductIdFor,
} from './creemEnv'
import { tryCreateAccessToken } from './accessToken'
import { highestTier, joinDecision, tierRank } from './license'

/**
 * Checkout metadata values are strings. Anything that is not a positive
 * integer is treated as absent, so a mangled value starts a new license
 * instead of pointing at the wrong one.
 */
export function licenseIdFrom(value) {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^[1-9]\d*$/.test(value)
      ? Number(value)
      : NaN
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export const relationId = (value) =>
  value && typeof value === 'object' ? value.id : value

/**
 * The private Creem product for this license's Enterprise quote, when it
 * belongs to the Creem world we are in. A sandbox license's quote is not a
 * live product, and the other way round.
 */
export function quoteProductIdFor(license, env = creemEnvironment()) {
  const id = license?.quoteCreemProductId
  if (!id) return null
  return (license.creemEnvironment || 'production') === env ? id : null
}

/**
 * The Creem product ids a paid checkout may legitimately carry.
 *
 * `upgrade` is the target tier named by the checkout metadata, or null for a
 * plain purchase. Ids come from the active Creem environment only: in
 * production a sandbox id is not expected, and in the sandbox a live one is
 * not. An upgrade accepts nothing but its own product, and the upgrade
 * products are never accepted for a plain purchase.
 */
export function expectedProductIds({
  item,
  license,
  upgrade,
  env = creemEnvironment(),
}) {
  const quote = quoteProductIdFor(license, env)

  if (upgrade === 'enterprise') return quote ? [quote] : []
  if (upgrade) {
    const id = creemUpgradeProductIdFor(item, env)
    return id ? [id] : []
  }

  const ids = []
  const base = creemProductIdFor(item, env)
  if (base) ids.push(base)
  // A plain purchase can still be an Enterprise quote, told apart by product.
  if (quote && !ids.includes(quote)) ids.push(quote)
  return ids
}

const isPaid = (row) => row?.status === 'paid'

const awaitsQuotePayment = (license) =>
  !license?.tier && String(license?.quoteCreemProductId ?? '').trim() !== ''

/**
 * Recompute a license's tier from its paid purchases and store it when it
 * changed. A refunded row stops counting the moment its status changes, so a
 * refund needs no history table. `tierChangedAt` moves only with the tier.
 *
 * `options.req` is a Payload request. A caller already inside a Payload
 * transaction, such as a collection hook, must pass it: every query then
 * joins that transaction and sees its uncommitted write, and none opens a
 * second connection beside the one the save holds.
 */
export async function recomputeTier(payload, licenseId, options = {}) {
  const req = options.req ? { req: options.req } : {}
  const rows = await payload.find({
    collection: 'purchases',
    where: {
      and: [{ license: { equals: licenseId } }, { status: { equals: 'paid' } }],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    ...req,
  })
  const tier = highestTier(
    (rows.docs ?? []).filter(isPaid).map((row) => row.grantsTier)
  )

  const license = await payload.findByID({
    collection: 'licenses',
    id: licenseId,
    depth: 0,
    overrideAccess: true,
    ...req,
  })
  const changed = (license?.tier ?? null) !== tier
  if (changed) {
    await payload.update({
      collection: 'licenses',
      id: licenseId,
      overrideAccess: true,
      data: { tier, tierChangedAt: new Date().toISOString() },
      ...req,
    })
  }
  return { tier, changed }
}

/**
 * The `afterChange` hook on Purchases: keep a license's tier from going
 * stale. An admin who flips a row to refunded, edits what it grants or moves
 * it to another license, and the dormant Whop path, all change a purchase
 * without the Creem webhook knowing, and the tier is derived from exactly
 * those fields.
 *
 * A change to `status`, `grantsTier` or `license` on a row recomputes the
 * license it now belongs to; a move recomputes the one it left too, or that
 * license would keep a tier nobody paid for and still count as cover for the
 * people on it. It writes to licenses, never to purchases, so it cannot
 * trigger itself, and it passes `req` through (see `recomputeTier`).
 *
 * A failure is swallowed only while the transaction is still alive. A query
 * given `req` that fails kills the shared transaction: Payload rolls it back
 * and deletes `req.transactionID`, and the save that triggered this hook is
 * then lost while the outer commit returns quietly. Swallowing that would
 * report a write that no longer exists, so with no `transactionID` left the
 * error is rethrown and the caller (the Creem webhook answers 500, so Creem
 * redelivers) finds out. With a live transaction nothing was undone, the
 * error is logged, and the next change or the webhook's own recompute puts
 * the tier right.
 */
export async function syncTierAfterChange({
  doc,
  previousDoc,
  operation,
  req,
}) {
  try {
    const next = relationId(doc?.license) ?? null
    const previous = relationId(previousDoc?.license) ?? null
    const moved = String(next) !== String(previous)
    const changed =
      operation === 'create' ||
      moved ||
      doc?.status !== previousDoc?.status ||
      (doc?.grantsTier ?? null) !== (previousDoc?.grantsTier ?? null)
    if (!changed) return doc

    const ids = []
    if (next != null) ids.push(next)
    if (moved && previous != null) ids.push(previous)
    for (const id of ids) {
      await recomputeTier(req.payload, id, { req })
    }
  } catch (err) {
    if (!req?.transactionID) throw err
    console.error('Tier recompute after a purchase change failed', err)
  }
  return doc
}

/**
 * Put a purchase on a license: the one it names, the one it raises, or a new
 * one. Returns the license, with its tier refreshed.
 *
 * `licenseId` comes from checkout metadata our server wrote, already coerced
 * with `licenseIdFrom`. Two sales are flagged for a person to refund: a Pro
 * owner who pays full price for Team joins their Pro license and moves up,
 * having overpaid, and a payment on a named license that already holds that
 * tier or above, such as a second tab's upgrade, raises nothing at all.
 *
 * A license with no tier that holds a quote is a deal waiting to be paid, not
 * a refund, so an unnamed purchase never joins it. Without that, a free Lite
 * claim, which needs no sign-in, could land on someone's pending Enterprise
 * license just by using its address.
 */
export async function attachPurchase(
  payload,
  { purchase, email, stack, grantsTier, licenseId, environment }
) {
  const ownerEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  const env = environment ?? creemEnvironment()
  const named = licenseIdFrom(licenseId)

  /* A named license must be on this stack and in this Creem environment,
     whoever calls. The caller's own check is not the only line of defence:
     this is the function that writes the tier. The buyer's email is not
     compared, because someone else's card can pay for a named upgrade. */
  let target = null
  if (named != null) {
    target = await payload.findByID({
      collection: 'licenses',
      id: named,
      depth: 0,
      overrideAccess: true,
    })
    if (
      target?.stack !== stack ||
      (target?.creemEnvironment || 'production') !== env
    ) {
      throw new Error(
        `License ${named} is not a ${stack} license in ${env}; purchase not attached`
      )
    }
  }

  let candidates = []
  if (named == null) {
    const found = await payload.find({
      collection: 'licenses',
      where: {
        and: [
          { ownerEmail: { equals: ownerEmail } },
          { stack: { equals: stack } },
          { creemEnvironment: { equals: env } },
        ],
      },
      depth: 0,
      limit: 50,
      sort: 'createdAt',
      overrideAccess: true,
    })
    candidates = (found.docs ?? []).filter((c) => !awaitsQuotePayment(c))
  }

  const decision = joinDecision({
    licenseId: named,
    candidates,
    tier: grantsTier,
  })

  let license
  let overpaid = false
  if (decision.join != null) {
    license = { id: decision.join }
    const joined = candidates.find((c) => c.id === decision.join)
    overpaid =
      named != null
        ? tierRank(target?.tier) >= tierRank(grantsTier)
        : joined?.tier === 'pro' && grantsTier === 'team'
  } else {
    license = await payload.create({
      collection: 'licenses',
      overrideAccess: true,
      data: { ownerEmail, stack, creemEnvironment: env },
    })
  }

  await payload.update({
    collection: 'purchases',
    id: purchase.id,
    overrideAccess: true,
    data: { license: license.id, grantsTier },
  })

  if (overpaid) {
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { needsReview: true },
    })
  }

  const { tier } = await recomputeTier(payload, license.id)
  return { ...license, tier }
}

/**
 * The license key to show: the newest paid purchase that has one. An upgrade
 * row issues none, so "newest paid purchase" alone would lose the key after
 * an upgrade.
 */
export async function currentKey(payload, licenseId) {
  const rows = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { license: { equals: licenseId } },
        { status: { equals: 'paid' } },
        { licenseKey: { exists: true } },
      ],
    },
    sort: '-createdAt',
    depth: 0,
    limit: 50,
    overrideAccess: true,
  })
  const newest = (rows.docs ?? [])
    .filter((row) => isPaid(row) && row.licenseKey)
    .sort((a, b) =>
      String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
    )[0]
  return newest?.licenseKey ?? null
}

/**
 * The Team row of a stack: the item an upgrade to Team is bought against, and
 * the price the difference is worked out from. Only a published row counts,
 * the same gate a normal purchase passes. Null when the stack has none.
 *
 * Reads the database and throws on a failure, as `licenseFromClaims` does, so
 * a caller can tell "no Team row" from "could not look".
 */
export async function teamProductFor(payload, stack) {
  if (!stack) return null
  const found = await payload.find({
    collection: 'products',
    where: {
      and: [
        { stack: { equals: stack } },
        { tier: { equals: 'team' } },
        { status: { equals: 'published' } },
      ],
    },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return found?.docs?.[0] ?? null
}

/**
 * The sale that put a license on `tier`: the newest paid row that grants it.
 * Never the row a token names, which is usually the older sale the upgrade was
 * bought from. Null when there is none.
 *
 * Reads the database and throws on a failure.
 */
export async function upgradeSaleFor(payload, licenseId, tier) {
  const found = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { license: { equals: licenseId } },
        { status: { equals: 'paid' } },
        { grantsTier: { equals: tier } },
      ],
    },
    sort: '-createdAt',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return found?.docs?.[0] ?? null
}

/* The slug of the one auth collection, Users. Only a signed-in member of it is
   an admin; there is no other kind of account on this site. */
const ADMIN_COLLECTION = 'users'

/**
 * The signed link to send an Enterprise customer, for the admin to read.
 *
 * Minted on read, for a signed-in admin only, and only for a license that
 * holds a quote: it is a way into a license, so it must never reach a public
 * response or a server read that has no user. A Local API call with
 * `overrideAccess` and no `user`, which is how the webhook and every license
 * route read, gets null. Nothing here throws: a missing secret, site address
 * or Team row, or a database that cannot be read, is a null field, because
 * this runs while an admin page is loading.
 *
 * The token names the license and no purchase, since a new Enterprise license
 * has none yet. Its item is the stack's Team row, the same row `startUpgrade`
 * charges against. Like every license link it lives 30 days, and the page
 * behind it offers to email a fresh one.
 */
export async function enterpriseLinkFor({ payload, license, user }) {
  if (user?.collection !== ADMIN_COLLECTION) return null
  if (!license?.id || !String(license.quoteCreemProductId ?? '').trim()) {
    return null
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!site) return null

  let team
  try {
    team = await teamProductFor(payload, license.stack)
  } catch (err) {
    console.error('Enterprise link: Team row lookup failed', license.id, err)
    return null
  }
  if (!team) return null

  const signed = tryCreateAccessToken({
    purchaseId: null,
    licenseId: license.id,
    itemType: 'product',
    itemId: team.id,
  })
  if (!signed.ok) {
    console.error('Enterprise link could not be signed', signed.reason)
    return null
  }
  return `${site}/access/seats/${signed.token}`
}

/**
 * The validator for `seatOverride` and `accountOverride`: `true`, or the
 * message to show. Both are required once a license is Enterprise or holds a
 * quote, because Enterprise has no kit row to take a limit from. Anywhere else
 * they may be empty, so editing an unrelated field on an old license passes.
 * A value that is given must be a positive number, whatever the tier.
 *
 * `data` is the whole license as it will be saved, which Payload builds from
 * the stored row and the edit, so a partial server update is checked against
 * the full record too.
 */
export function overrideError(value, data, label) {
  const sold =
    data?.tier === 'enterprise' ||
    String(data?.quoteCreemProductId ?? '').trim() !== ''
  if (value == null || value === '') {
    return sold ? `${label} is required on an Enterprise license.` : true
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return `${label} must be a positive number.`
  }
  return true
}

/* Payload throws with status 404 for a document that is not there. That is
   the only failure that means "not found"; a dropped connection or a timeout
   says nothing about whether the row exists. */
const isNotFound = (err) => err?.status === 404

/**
 * Resolve a verified token's claims to a license. `claims.licenseId` wins;
 * otherwise the purchase it names leads to one. The purchase is null when the
 * claims carried only a license. Returns null when nothing resolves.
 *
 * Only "not found" resolves to null. Any other failure, such as the database
 * being unreachable, is thrown, because treating it as a missing license
 * would tell a paying buyer something false, and would let a caller that
 * checks a limit fail open. Every caller catches it and shows its own
 * retry state.
 *
 * `product` is the kit row that sets this license's limits (its stack and
 * tier), or null for Enterprise, which has none.
 */
export async function licenseFromClaims(payload, claims) {
  const byId = async (collection, id) => {
    if (id == null) return null
    try {
      return await payload.findByID({
        collection,
        id,
        depth: 0,
        overrideAccess: true,
      })
    } catch (err) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  const purchase = await byId('purchases', claims?.purchaseId)
  const license = await byId(
    'licenses',
    claims?.licenseId ?? relationId(purchase?.license)
  )
  if (!license) return null

  let product = null
  if (license.tier && license.tier !== 'enterprise') {
    const found = await payload.find({
      collection: 'products',
      where: {
        and: [
          { stack: { equals: license.stack } },
          { tier: { equals: license.tier } },
        ],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    product = found?.docs?.[0] ?? null
  }

  return { license, purchase, product }
}

/*
 * The window between license-link mails.
 *
 * One license is mailed a fresh link at most once in ten minutes, whichever
 * door asked: the expired-link button on the license page and `/access/resend`
 * share this, so neither can be used to mail-bomb an owner whose address
 * someone knows. The record is `lastLinkSentAt` on the license, so a second
 * link, tab or browser shares it.
 *
 * Here, in a plain module, and not in `addSeat.ts` or `resendLink.js`: both of
 * those are 'use server', and every export of such a file is a public
 * endpoint.
 *
 * It is a read, then a write, not one atomic update. Two requests inside the
 * same few milliseconds can each pass `linkWindowOpen` and send one mail
 * apiece. Two mails to the owner's own inbox is an acceptable worst case.
 */
export const LINK_INTERVAL_MS = 10 * 60 * 1000

/** True when no link was mailed in the last ten minutes. A timestamp from the
    future does not block: it would otherwise lock a license until then. */
export function linkWindowOpen(license, now = Date.now()) {
  const last = Date.parse(String(license?.lastLinkSentAt ?? ''))
  if (!Number.isFinite(last)) return true
  const elapsed = now - last
  return !(elapsed >= 0 && elapsed < LINK_INTERVAL_MS)
}

/** Take the window, before the mail goes. Returns what `lastLinkSentAt` was,
    to hand to `releaseLinkWindow`. Throws if it cannot be recorded, and the
    caller must then send nothing. */
export async function claimLinkWindow(payload, license) {
  const previous = license.lastLinkSentAt ?? null
  await payload.update({
    collection: 'licenses',
    id: license.id,
    overrideAccess: true,
    data: { lastLinkSentAt: new Date().toISOString() },
  })
  return previous
}

/** Give the window back after a mail that did not go out, to what it was.
    Best effort: a failure here is logged and never thrown. */
export async function releaseLinkWindow(payload, license, previous) {
  try {
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { lastLinkSentAt: previous ?? null },
    })
  } catch (err) {
    console.error('Could not give the link window back', license.id, err)
  }
}

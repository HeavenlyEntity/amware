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
import { highestTier, joinDecision } from './license'

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

const relationId = (value) =>
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

/**
 * Recompute a license's tier from its paid purchases and store it when it
 * changed. A refunded row stops counting the moment its status changes, so a
 * refund needs no history table. `tierChangedAt` moves only with the tier.
 */
export async function recomputeTier(payload, licenseId) {
  const rows = await payload.find({
    collection: 'purchases',
    where: {
      and: [{ license: { equals: licenseId } }, { status: { equals: 'paid' } }],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const tier = highestTier(
    (rows.docs ?? []).filter(isPaid).map((row) => row.grantsTier)
  )

  const license = await payload.findByID({
    collection: 'licenses',
    id: licenseId,
    depth: 0,
    overrideAccess: true,
  })
  const changed = (license?.tier ?? null) !== tier
  if (changed) {
    await payload.update({
      collection: 'licenses',
      id: licenseId,
      overrideAccess: true,
      data: { tier, tierChangedAt: new Date().toISOString() },
    })
  }
  return { tier, changed }
}

/**
 * Put a purchase on a license: the one it names, the one it raises, or a new
 * one. Returns the license, with its tier refreshed.
 *
 * `licenseId` comes from checkout metadata our server wrote, already coerced
 * with `licenseIdFrom`. A Pro owner who pays full price for Team joins their
 * Pro license and moves up, having overpaid, so that license is flagged for
 * a person to refund the difference.
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
    candidates = found.docs ?? []
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
    overpaid = named == null && joined?.tier === 'pro' && grantsTier === 'team'
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
 * Resolve a verified token's claims to a license. `claims.licenseId` wins;
 * otherwise the purchase it names leads to one. The purchase is null when the
 * claims carried only a license. Returns null when nothing resolves, and
 * never throws at a buyer.
 *
 * `product` is the kit row that sets this license's limits (its stack and
 * tier), or null for Enterprise, which has none.
 */
export async function licenseFromClaims(payload, claims) {
  const byId = async (collection, id) =>
    id == null
      ? null
      : payload
          .findByID({ collection, id, depth: 0, overrideAccess: true })
          .catch(() => null)

  const purchase = await byId('purchases', claims?.purchaseId)
  const license = await byId(
    'licenses',
    claims?.licenseId ?? relationId(purchase?.license)
  )
  if (!license) return null

  let product = null
  if (license.tier && license.tier !== 'enterprise') {
    const found = await payload
      .find({
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
      .catch(() => null)
    product = found?.docs?.[0] ?? null
  }

  return { license, purchase, product }
}

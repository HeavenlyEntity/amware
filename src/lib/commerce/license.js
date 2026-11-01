/*
 * The rules a WareKit license follows.
 *
 * Pure functions, no imports, so the webhook, the admin, the account page and
 * the engine tests all read the same answer. A refunded license has a null
 * tier, and Enterprise has no `products` row, so every function here accepts
 * a null tier, a null license and a null product without throwing.
 */

const RANKS = { lite: 1, pro: 2, team: 3, enterprise: 4 }

/** Higher is bigger. A missing or unknown tier ranks 0, below Lite. */
export function tierRank(tier) {
  return Object.hasOwn(RANKS, tier) ? RANKS[tier] : 0
}

/** The highest real tier in the list, or null when there is none. */
export function highestTier(tiers) {
  let best = null
  for (const tier of tiers ?? []) {
    if (tierRank(tier) > tierRank(best)) best = tier
  }
  return best
}

/**
 * Which license a purchase joins.
 *
 * 1. Checkout metadata names one: join it (our server wrote it).
 * 2. A license with the same email and stack that the purchase would raise:
 *    join the highest of those, the oldest on a tie.
 * 3. Otherwise start a new license.
 *
 * `candidates` are the licenses already found for that email and stack.
 */
export function joinDecision({ licenseId, candidates, tier }) {
  if (licenseId != null) return { join: licenseId }

  let best = null
  for (const candidate of candidates ?? []) {
    if (tierRank(candidate.tier) >= tierRank(tier)) continue
    if (
      !best ||
      tierRank(candidate.tier) > tierRank(best.tier) ||
      (tierRank(candidate.tier) === tierRank(best.tier) &&
        candidate.id < best.id)
    ) {
      best = candidate
    }
  }
  return best ? { join: best.id } : { create: true }
}

function count(value) {
  return Number.isFinite(value) ? value : null
}

/**
 * What a license may use: the override if it has one, otherwise the value on
 * the product for its stack and tier. `product` is null for Enterprise.
 * Lite and a refunded license do not track accounts, so `accounts` is null.
 */
export function licenseLimits(license, product) {
  const seats = count(license?.seatOverride) ?? count(product?.seats) ?? 1

  if (tierRank(license?.tier) < tierRank('pro'))
    return { seats, accounts: null }

  const accounts =
    count(license?.accountOverride) ?? count(product?.netsuiteAccounts) ?? 1
  return { seats, accounts }
}

const KIT_NAMES = {
  'react-netsuite': 'WareKit React NetSuite',
  'next-netsuite': 'WareKit Next NetSuite',
}

/** The kit's name, without a tier: what a license with no kit row is called.
    Enterprise and a license with no tier have none to read one from. */
export function kitName(stack) {
  return Object.hasOwn(KIT_NAMES, stack) ? KIT_NAMES[stack] : null
}

/** The rows that count against a license's accounts. An `over_limit` row is
    a signal, not a use. */
export function activeAccounts(rows) {
  return Array.isArray(rows)
    ? rows.filter((row) => row?.status === 'active').length
    : 0
}

/**
 * The account number a buyer typed, reduced to the one Oracle issued.
 * Sandbox (`_SB1`, `-sb2`) and Release Preview (`_RP`) accounts share their
 * production account's number. Anything else counts as its own account.
 */
export function normalizeAccountId(raw) {
  if (typeof raw !== 'string') return null
  const id = raw
    .trim()
    .replace(/[_-](sb\d+|rp)$/i, '')
    .toUpperCase()
  return id && id.length <= 64 ? id : null
}

function isFull(used, limit) {
  return Number.isFinite(used) && Number.isFinite(limit) && used >= limit
}

/**
 * The one thing to offer a license holder next.
 *
 * A quote comes first. Pro is offered Team, and Team is offered a talk about
 * Enterprise only once it is at a limit. `urgent` means a limit is reached.
 */
export function nextAction({
  license,
  hasQuote,
  seatsUsed,
  seatLimit,
  accountsUsed,
  accountLimit,
} = {}) {
  const urgent =
    isFull(seatsUsed, seatLimit) || isFull(accountsUsed, accountLimit)

  if (hasQuote) return { kind: 'enterprise-quote', urgent }

  const tier = license?.tier
  if (tier === 'pro') return { kind: 'upgrade-team', urgent }
  if (tier === 'team' && urgent) return { kind: 'enterprise-contact', urgent }
  return { kind: null, urgent }
}

/**
 * What a Pro license pays to move to Team: the Team price less the Pro price,
 * or null when there is no honest number to show. A missing row, a price that
 * is not a number, or a Team price that is not above Pro's all mean the page
 * must not name an amount, so it offers no button.
 */
export function upgradeCost(proPrice, teamPrice) {
  if (!Number.isFinite(proPrice) || !Number.isFinite(teamPrice)) return null
  const cost = teamPrice - proPrice
  return cost > 0 ? cost : null
}

const UPGRADE_TARGETS = ['team', 'enterprise']

/**
 * The state of a buyer who has come back from Creem, read from the
 * `?upgraded=` the checkout was told to return with.
 *
 * That parameter is anyone's to write, so it only picks wording: the tier it
 * names is compared with the tier the database says the license holds, and
 * nothing is granted by it. An unknown value, or a license already past the
 * tier named, is ignored (null). A license below it is still `confirming`:
 * the webhook has not landed. A license exactly on it is `done`.
 */
export function upgradeReturn(tier, upgraded) {
  if (typeof upgraded !== 'string' || !UPGRADE_TARGETS.includes(upgraded)) {
    return null
  }
  const have = tierRank(tier)
  const want = tierRank(upgraded)
  if (have < want) return { target: upgraded, phase: 'confirming' }
  if (have === want) return { target: upgraded, phase: 'done' }
  return null
}

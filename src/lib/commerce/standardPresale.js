/*
 * What the Standard presale page may say and sell, decided in one place.
 *
 * `/products/standard` sells two kit rows (Pro and Team) through Creem. A
 * checkout must never be offered for a row that cannot be delivered, because
 * the buyer would pay and get nothing: no repository to invite them to, no
 * Creem product for this environment, a price of 0, a seat count that is not
 * the one the page promises, or a slug the post-payment page cannot read a
 * tier from.
 *
 * The rows come straight from Payload, so every field is treated as possibly
 * missing or of the wrong type. A malformed row is simply not ready; nothing
 * throws. Only the small return value crosses to the browser, and a plan that
 * is not ready carries no price and no slug, so a draft row cannot leak
 * either.
 *
 * Imported by the page and the engine test project: no server imports, no
 * `process.env`. The environment is the `env` argument.
 */
import { checkoutRoute } from './checkoutRoute'
import { tierFromSlug } from './onboardingDisplay'

export const STANDARD_STACK = 'standard'

export const BUILDING_CHOICES = [
  { id: 'ai-product', label: 'An AI product' },
  { id: 'team-saas', label: 'A SaaS for teams' },
  { id: 'membership', label: 'A membership or digital store' },
  { id: 'other', label: 'Something else' },
]

/** The id if it is one of BUILDING_CHOICES, else null. */
export function buildingAnswer(value) {
  const choice = BUILDING_CHOICES.find((c) => c.id === value)
  return choice ? choice.id : null
}

/* `checkoutRoute` only checks that an id is truthy, so a number, an object or
 * a blank string would pass it and Creem would then reject the checkout. The
 * id is sent to Creem as stored, so a padded one fails there too. */
function hasCreemId(row, env) {
  const id = env === 'sandbox' ? row.creemSandboxProductId : row.creemProductId
  return typeof id === 'string' && id !== '' && id === id.trim()
}

/* The `owner/repo` shape `inviteToRepo` (githubInvite.ts) accepts after it
 * trims; a URL or a bare repository name cannot be invited to. */
const REPO = /^[\w.-]+\/[\w.-]+$/

function hasRepo(row) {
  return typeof row.githubRepo === 'string' && REPO.test(row.githubRepo.trim())
}

/* The page promises one developer for Pro and five for Team from static copy,
 * while the licence enforces the row's `seats`, so the two must agree. */
const TIER_SEATS = { pro: 1, team: 5 }

function hasTierSeats(row, tier) {
  return row.seats === TIER_SEATS[tier]
}

function isReady(row, tier, env) {
  if (!row || typeof row !== 'object') return false
  return (
    row.status === 'published' &&
    row.type === 'boilerplate' &&
    row.stack === STANDARD_STACK &&
    row.tier === tier &&
    typeof row.price === 'number' &&
    Number.isFinite(row.price) &&
    row.price > 0 &&
    hasRepo(row) &&
    hasTierSeats(row, tier) &&
    row.slug === `warekit-standard-${tier}` &&
    tierFromSlug(row.slug) === tier &&
    hasCreemId(row, env) &&
    checkoutRoute(row, env) === 'creem'
  )
}

const SOLD_TIERS = ['pro', 'team']

/**
 * Whether a Standard row can be sold and delivered in `env`, judged for the
 * tier the row itself declares. The page decides what to offer with it (via
 * standardPresale) and the checkout action refuses with it, so the two can
 * never disagree about a row.
 */
export function standardRowReady(row, env) {
  if (!row || typeof row !== 'object') return false
  return SOLD_TIERS.includes(row.tier) && isReady(row, row.tier, env)
}

function planFor(rows, tier, env) {
  const row = rows.find(
    (candidate) => standardRowReady(candidate, env) && candidate.tier === tier
  )
  return row
    ? { state: 'ready', price: row.price, slug: row.slug }
    : { state: 'planned', price: null, slug: null }
}

/**
 * What the presale page may say and sell. Only this crosses to the browser.
 * @typedef {{ state: 'ready' | 'planned', price: number | null, slug: string | null }} Plan
 * @returns {{ open: boolean, pro: Plan, team: Plan }}
 */
export function standardPresale(rows, env) {
  const list = Array.isArray(rows) ? rows : []
  const pro = planFor(list, 'pro', env)
  const team = planFor(list, 'team', env)
  return {
    open: pro.state === 'ready' || team.state === 'ready',
    pro,
    team,
  }
}

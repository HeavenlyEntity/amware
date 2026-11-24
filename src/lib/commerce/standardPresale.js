/*
 * What the Standard presale page may say and sell, decided in one place.
 *
 * `/products/standard` sells two kit rows (Pro and Team) through Creem. A
 * checkout must never be offered for a row that cannot be delivered, because
 * the buyer would pay and get nothing: no repository to invite them to, no
 * Creem product for this environment, a price of 0, or a slug the
 * post-payment page cannot read a tier from.
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
    typeof row.githubRepo === 'string' &&
    row.githubRepo.trim() !== '' &&
    tierFromSlug(row.slug) === tier &&
    checkoutRoute(row, env) === 'creem'
  )
}

function planFor(rows, tier, env) {
  const row = rows.find((candidate) => isReady(candidate, tier, env))
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

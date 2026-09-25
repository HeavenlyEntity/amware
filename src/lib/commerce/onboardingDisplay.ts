/*
 * What the onboarding page may say about a purchase.
 *
 * That page has no signature: anyone holding a payment id can load it. So
 * these two decide how much of a licence key it shows and which next step it
 * offers, and they live here -- pure, relative imports only -- so the
 * `engine` test project can pin them down without rendering a page.
 */

export type Tier = 'lite' | 'pro' | 'team'

/* Deliberately the slug, not the product's own `tier` select field: the
 * slug is what the checkout, the catalogue and the page all agree on, and it
 * can't drift out of sync with an admin-edited field the way a second source
 * of truth could.
 *
 * Only a kit has a tier. Every WareKit slug starts `warekit-`; anything else
 * (a guide, a course) is `null`, so its buyer is offered implementation help
 * and never an upgrade to a kit they did not buy. */
export function tierFromSlug(slug: unknown): Tier | null {
  if (typeof slug !== 'string' || !slug.startsWith('warekit-')) return null
  if (slug.endsWith('-lite')) return 'lite'
  if (slug.endsWith('-team')) return 'team'
  return 'pro'
}

/* Enough of the key to recognise, never enough to use: the last four
 * characters and nothing else. Whop keys carry no brand prefix, so the
 * opening characters are as secret as the rest and none of them are shown.
 *
 * `null` rather than a shorter mask when the key has fewer than twelve
 * characters, so at least eight always stay hidden. */
const MIN_MASKABLE = 12
const SHOWN = 4

export function maskLicenseKey(key: unknown): string | null {
  if (typeof key !== 'string' || key.length < MIN_MASKABLE) return null
  return `••••${key.slice(-SHOWN)}`
}

/* One value from a search param. A repeated param (?payment_id=a&payment_id=b)
 * arrives as an array, and the first is taken; anything else that is not a
 * string is treated as absent -- never passed on to a query or a URL as-is. */
export function firstParam(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : ''
}

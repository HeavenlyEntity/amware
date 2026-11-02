/*
 * Which URLs third-party scripts may see.
 *
 * Everything under `/access` is either a bearer link, where the token in the
 * path is the whole of the proof and opens a license key, or the page that
 * asks for one. The Whop pixel and Vercel Analytics stay off all of it:
 * `SiteTelemetry` does not mount them there, and `whopTrack` refuses, because
 * a pixel loaded on an earlier page is still in memory after a client-side
 * move back to a license page.
 *
 * `/checkout/onboarding` is two pages. With `r` and `s` it is Creem's signed
 * link, a bearer link of its own that never expires, can answer an unanswered
 * purchase, and shows a license link: the pixel stays off it, and Analytics
 * gets the address without them. With Whop's `ref` or `payment_id` it holds no
 * secret and keeps the pixel.
 *
 * Both also send the `Referrer-Policy` set in next.config.mjs, so the page a
 * buyer moves to next never holds these addresses in `document.referrer`.
 *
 * Pure, with no imports, so the engine test project can load it.
 */

const ONBOARDING = '/checkout/onboarding'
const SECRET_PARAMS = ['r', 's']

/** True on a path no third-party script may run on. */
export function isBearerPath(pathname) {
  return typeof pathname === 'string' && /^\/access(\/|$)/.test(pathname)
}

/** True on an onboarding address that carries the signed link. */
export function isSignedOnboarding(pathname, search) {
  if (typeof pathname !== 'string') return false
  if (pathname.replace(/\/$/, '') !== ONBOARDING) return false
  const params = new URLSearchParams(search ?? '')
  return SECRET_PARAMS.some((param) => params.has(param))
}

/**
 * The `beforeSend` for Vercel Analytics. Returns the event to send, or null
 * to drop it, including one whose address cannot be read: an event is not
 * worth a token.
 */
export function redactAnalyticsEvent(event) {
  let url
  try {
    url = new URL(event.url, 'https://relative.invalid')
  } catch {
    return null
  }
  if (isBearerPath(url.pathname)) return null
  if (url.pathname.replace(/\/$/, '') !== ONBOARDING) return event

  for (const param of SECRET_PARAMS) url.searchParams.delete(param)
  const origin = url.origin === 'https://relative.invalid' ? '' : url.origin
  return { ...event, url: `${origin}${url.pathname}${url.search}${url.hash}` }
}

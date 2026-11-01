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
 * `/checkout/onboarding` keeps the pixel, which its purchase event needs. Its
 * `r` and `s` are a bearer link of their own, so Analytics gets the address
 * without them.
 *
 * Pure, with no imports, so the engine test project can load it.
 */

const ONBOARDING = '/checkout/onboarding'
const SECRET_PARAMS = ['r', 's']

/** True on a path no third-party script may run on. */
export function isBearerPath(pathname) {
  return typeof pathname === 'string' && /^\/access(\/|$)/.test(pathname)
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

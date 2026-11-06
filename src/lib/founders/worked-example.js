import { EXAMPLE } from './equity/example.js'
import { INITIAL, INITIAL_KEYS } from './offer-store.js'

/*
 * The worked example, as the desk's two calculators load it.
 *
 * The dock's "Open with the worked example" either calls the open page's
 * loader or navigates to the tool with `?example`. Both land here: the store
 * gets only the keys it owns (the equity wizard keeps `founders`, `path` and
 * the fractional fields in its own reducer), and the param is taken exactly
 * once, so a reload after editing the example keeps the edits.
 */

export const EXAMPLE_PARAM = 'example'

export const exampleHref = (href) => `${href}?${EXAMPLE_PARAM}`

const copyValue = (value) => (Array.isArray(value) ? [...value] : value)

/**
 * A whole store state holding the example, ready for `set()`. It starts from
 * INITIAL rather than merging into whatever is there, so a visitor's own
 * industry, geo or `askedAt` cannot leak into an "example" the example does
 * not set.
 */
export function exampleStorePatch() {
  const patch = {}
  for (const key of INITIAL_KEYS) {
    patch[key] = copyValue(key in EXAMPLE ? EXAMPLE[key] : INITIAL[key])
  }
  /* The example names five responsibilities, so the work question is
     answered; without this the job offer wizard would ask it again. */
  patch.workAnswered = true
  return patch
}

/** `EXAMPLE` narrowed to an arbitrary key set (the equity wizard's inputs). */
export function examplePatchFor(keys) {
  const patch = {}
  for (const key of keys) {
    if (key in EXAMPLE) patch[key] = copyValue(EXAMPLE[key])
  }
  return patch
}

/**
 * True when the URL asked for the example. Strips the param in the same
 * call, through the History API (which the App Router keeps in sync), so it
 * can only be acted on once.
 */
export function takeExampleParam() {
  if (typeof window === 'undefined') return false
  let url
  try {
    url = new URL(window.location.href)
  } catch {
    return false
  }
  if (!url.searchParams.has(EXAMPLE_PARAM)) return false
  url.searchParams.delete(EXAMPLE_PARAM)
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  )
  return true
}

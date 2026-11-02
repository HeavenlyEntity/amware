/*
 * Conversion events for the Whop Pixel.
 *
 * `WhopPixel`, in the site layout's <head>, installs `window.whop` before any
 * component in the page runs an effect, and its `track` queues until s.js
 * arrives -- so a call from a component is never too early. Whop itself sends
 * with `keepalive`, which is what makes "fire, then redirect to Creem" safe:
 * the request outlives the page.
 *
 * There is no pixel on a bearer link (see privatePaths.js), and every call
 * there is a silent no-op, including one made with a pixel still in memory
 * from an earlier page: an event carries the address it was fired from.
 *
 * Every event name lives here, once. Whop groups by the name string, so a
 * typo in one call site would report as a separate, empty funnel step and
 * nobody would notice for weeks. The standard names (`lead`, `schedule`,
 * `purchase`, `view_content`) are the ones Whop forwards to ad platforms as
 * their native events; the custom ones are ours and stay inside Whop.
 *
 * What is deliberately NOT tracked: anything Whop can see for itself. There
 * is nothing of that kind here yet -- checkout is Creem, not Whop -- but if
 * a Whop checkout is ever added, do not fire `purchase` for it. Whop records
 * its own sales and rejects the duplicate.
 */

import { isBearerPath, isSignedOnboarding } from './privatePaths'

export const WHOP_EVENT = {
  /** A page view. The head snippet fires the first; route changes fire the rest. */
  page: 'page',
  /** The contact form was sent. Standard. */
  lead: 'lead',
  /** An intro call was booked through the Cal.com embed. Standard. */
  schedule: 'schedule',
  /** A sale completed on Creem. Standard; `value` is required and must be positive. */
  purchase: 'purchase',
  /** A key page was read: a post, a kit, a course, pricing, services. Standard. */
  viewContent: 'view_content',
  /** The buy button was pressed, just before the redirect to Creem. Custom. */
  beginCheckout: 'begin_checkout',
  /** A free Lite kit was claimed. Custom -- no money, but a real conversion. */
  kitClaimed: 'kit_claimed',
} as const

export type WhopEvent = (typeof WHOP_EVENT)[keyof typeof WHOP_EVENT]

/* The fields Whop documents, plus three content fields of our own. Whop
   matches customers on the plain-text identity fields -- a hashed email is
   dropped, so nothing here hashes anything. */
export type WhopEventData = {
  value?: number
  currency?: string
  /** One id per real conversion. Whop collapses repeats of (name, event_id). */
  event_id?: string
  email?: string
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  external_id?: string
  content_type?: string
  content_id?: string
  content_name?: string
}

type WhopGlobal = { track: (...args: unknown[]) => void }

function pixel(): WhopGlobal | null {
  if (typeof window === 'undefined') return null
  const { pathname, search } = window.location ?? {}
  if (isBearerPath(pathname) || isSignedOnboarding(pathname, search)) {
    return null
  }
  const w = (window as unknown as { whop?: WhopGlobal }).whop
  return w && typeof w.track === 'function' ? w : null
}

/**
 * Fire one event. Returns whether it was handed to the pixel, so a caller
 * that cares (a test, mostly) can tell "sent" from "no pixel on this page".
 * Never throws: analytics must not be able to break a purchase flow.
 */
export function whopTrack(event: WhopEvent, data: WhopEventData = {}): boolean {
  const w = pixel()
  if (!w) return false

  /* Whop rejects a purchase with no positive value, because an ad platform
     cannot optimise toward a sale of unknown size. Refusing here keeps a
     malformed event out of the queue instead of letting it fail out of
     sight on Whop's side. */
  if (event === WHOP_EVENT.purchase) {
    if (typeof data.value !== 'number' || !(data.value > 0)) return false
  }

  const clean = Object.fromEntries(
    Object.entries(data).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  )

  try {
    if (Object.keys(clean).length) w.track(event, clean)
    else w.track(event)
  } catch {
    return false
  }
  return true
}

/** Creem and the purchases table store cents; Whop wants major units. */
export function centsToValue(cents: number): number {
  return Math.round(cents) / 100
}

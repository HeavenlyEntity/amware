/**
 * The one place a license's update term is worked out.
 *
 * A paid Pro or Team license gets 12 months of updates. This module holds the
 * constants and every piece of date arithmetic for that: the end date, whether
 * a license has ended, when Renew opens, which reminder is due, and how a date
 * is shown to a buyer.
 *
 * It must never import anything, read the clock (callers pass `now`), touch a
 * database or the network, or let any other file do date arithmetic on a
 * license. Every date argument is a Date or an ISO string; every date it
 * returns is an ISO string from `toISOString()`.
 */

export const TERM_MONTHS = 12
export const RENEW_WINDOW_DAYS = 60
export const FIRST_REMINDER_DAYS = 30
export const LAST_REMINDER_DAYS = 7
export const TERM_TIERS = ['pro', 'team']

const DAY_MS = 24 * 60 * 60 * 1000
const TIERS_WITH_A_TERM = [...TERM_TIERS, 'enterprise']

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toMs = (value) => {
  const date = toDate(value)
  return date ? date.getTime() : null
}

/** The same day and time of day `months` later, in UTC, clamped to month end. */
export function addMonths(value, months) {
  const date = toDate(value)
  if (!date) return null
  const monthIndex = date.getUTCMonth() + months
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  )
}

/** Whether two values are the same instant, whatever shape they were written in. */
export function sameInstant(a, b) {
  const left = toMs(a)
  const right = toMs(b)
  return left !== null && right !== null && left === right
}

/** The end date a payment at `paidAt` gives, from the current end date `until`. */
export function nextUntil(until, paidAt) {
  const paid = toMs(paidAt)
  if (paid === null) return null
  const current = toMs(until)
  const base = current !== null && paid <= current ? current : paid
  const next = addMonths(base, TERM_MONTHS)
  return next ? next.toISOString() : null
}

/**
 * Works the end date out from a license's purchases.
 * `keep` is true when the stored date must be left alone: the tier carries a
 * term but no purchase is left to work one out from.
 */
export function computeUpdatesUntil(purchases, tier) {
  if (!TERM_TIERS.includes(tier)) return { until: null, keep: false }

  const paid = (Array.isArray(purchases) ? purchases : [])
    .filter((row) => row?.status === 'paid' && toMs(row.createdAt) !== null)
    .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))

  const start = paid.find(
    (row) =>
      (row.kind ?? 'sale') === 'sale' && TERM_TIERS.includes(row.grantsTier)
  )
  if (!start) return { until: null, keep: true }

  let until = addMonths(start.createdAt, TERM_MONTHS).toISOString()
  for (const row of paid) {
    if (row.kind === 'renewal') until = nextUntil(until, row.createdAt)
  }
  return { until, keep: false }
}

/** The later of the worked-out date and the admin override. */
export function dateInForce(computed, override) {
  const a = toMs(computed)
  const b = toMs(override)
  if (a === null && b === null) return null
  return new Date(Math.max(a ?? -Infinity, b ?? -Infinity)).toISOString()
}

/** Where a license stands in its term at `now`. */
export function termState(license, now) {
  const tier = license?.tier
  const until = TIERS_WITH_A_TERM.includes(tier)
    ? dateInForce(license.updatesComputedUntil, license.updatesUntilOverride)
    : null
  const selfRenew = TERM_TIERS.includes(tier)
  const untilMs = toMs(until)
  const nowMs = toMs(now)
  if (untilMs === null || nowMs === null) {
    return {
      until: null,
      ended: false,
      selfRenew,
      renewOpen: false,
      renewOpensOn: null,
    }
  }
  const opensMs = untilMs - RENEW_WINDOW_DAYS * DAY_MS
  return {
    until,
    ended: nowMs >= untilMs,
    selfRenew,
    renewOpen: selfRenew && nowMs >= opensMs,
    renewOpensOn: new Date(opensMs).toISOString(),
  }
}

/**
 * The one thing the daily job should do for this license right now, or null.
 * A missed reminder sends only the nearest one that still applies.
 */
export function dueAction(license, now) {
  const { until, ended } = termState(license, now)
  /* No date in force (an Enterprise license with no override): a license
     whose access was withdrawn has it given back; any other does nothing. */
  if (!until) {
    return license?.accessWithdrawnAt &&
      TIERS_WITH_A_TERM.includes(license.tier)
      ? 'restore'
      : null
  }

  if (ended) {
    if (!license.accessWithdrawnAt) return 'withdraw'
    if (!sameInstant(license.endedNoticeSentFor, until)) return 'notify-ended'
    return null
  }
  if (license.accessWithdrawnAt) return 'restore'

  const left = toMs(until) - toMs(now)
  const lastSent = sameInstant(license.lastReminderSentFor, until)
  const firstSent = sameInstant(license.firstReminderSentFor, until)
  if (left <= LAST_REMINDER_DAYS * DAY_MS && !lastSent) return 'last-reminder'
  if (left <= FIRST_REMINDER_DAYS * DAY_MS && !firstSent && !lastSent) {
    return 'first-reminder'
  }
  return null
}

/**
 * What the page shows after a buyer returns from the renewal checkout:
 * 'confirming' until the end date moves past the one the checkout started from.
 */
export function renewalReturn(until, renewed) {
  const from = toMs(renewed)
  if (from === null) return null
  const current = toMs(until)
  return current !== null && current > from ? 'done' : 'confirming'
}

const termDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `10 December 2027`, in UTC; empty when the value is not a date. */
export function formatTermDate(value) {
  const date = toDate(value)
  return date ? termDateFormat.format(date) : ''
}

/** Whether a value is a real price: a finite number greater than 0. */
export function isRenewalPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** `$199.00`; null unless the price is a finite number greater than 0. */
export function priceLabel(price) {
  return isRenewalPrice(price) ? `$${price.toFixed(2)}` : null
}

import crypto from 'node:crypto'

import type { LeadStage } from './stages'

/* Reading Cal.com webhooks for the Leads list. Shapes per Cal.com's webhook
   docs (payload version 2021-10-20): BOOKING_* events nest the booking under
   `payload`; MEETING_ENDED sends it flat. Booking answers arrive in
   `responses`, keyed by each question's identifier, as { label, value }. */

/** Cal.com signs the raw body with HMAC-SHA256 under the webhook's secret
    and sends the hex digest in X-Cal-Signature-256. No secret, no trust. */
export function verifyCalSignature(
  rawBody: string,
  signature: string | null,
  secret: string = process.env.CALCOM_WEBHOOK_SECRET || ''
): boolean {
  if (!signature || !secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export type CallKind = 'intro' | 'strategy' | 'other'

/** Which side of the business a lead came in through. */
export type LeadTrack = 'consulting' | 'build'

/* The Build & support side's events by exact slug. Its booking questions
   reuse the identifiers below (business_name, online_at, help_with), so a
   build booking fills the same profile fields. */
const BUILD_EVENT_SLUGS = new Set(['build-intro-call'])

/** Build for the Build & support call; every other event is the
    consulting side's. */
export function trackOfEvent(slug: unknown): LeadTrack {
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
  return BUILD_EVENT_SLUGS.has(s) ? 'build' : 'consulting'
}

/* The booking-question identifiers to use in Cal.com for both calls. They
   are listed in docs/design/2026-11-12-services-advisory/intro-call-form.md;
   a question with any other identifier is ignored. */
export const ANSWER_FIELDS = {
  based_in: 'basedIn',
  business_name: 'business',
  sells: 'sells',
  found_via: 'foundVia',
  online_at: 'website',
  years_in_business: 'yearsInBusiness',
  help_with: 'helpWith',
} as const

export type LeadAnswers = Partial<
  Record<(typeof ANSWER_FIELDS)[keyof typeof ANSWER_FIELDS], string>
>

export type CalEvent =
  | {
      action: 'booked' | 'rescheduled' | 'cancelled'
      email: string
      name: string
      phone: string | null
      answers: LeadAnswers
      track: LeadTrack
      call: {
        kind: CallKind
        bookingUid: string
        previousUid: string | null
        startsAt: string | null
      }
    }
  | { action: 'ended'; email: string; bookingUid: string }
  | { action: 'ignored'; reason: string }

/** Which call a booking is, from its event slug first ("intro-call",
    "strategy-call"), then its length. Anything else still records the lead
    but does not move its stage. */
export function callKind(slug: unknown, length: unknown): CallKind {
  const s = typeof slug === 'string' ? slug.toLowerCase() : ''
  if (s.includes('intro')) return 'intro'
  if (s.includes('strategy')) return 'strategy'
  if (length === 15) return 'intro'
  if (length === 45) return 'strategy'
  return 'other'
}

const text = (v: unknown): string =>
  typeof v === 'string'
    ? v.trim()
    : Array.isArray(v)
    ? v.filter((x) => typeof x === 'string').join(', ')
    : ''

const answer = (responses: any, key: string): string =>
  text(responses?.[key]?.value)

export const normalizeEmail = (email: unknown): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : ''

/** Turns a webhook body into what the Leads list needs, or says why not. */
export function parseCalEvent(body: any): CalEvent {
  const trigger = body?.triggerEvent
  if (trigger === 'MEETING_ENDED') {
    const email = normalizeEmail(body?.attendees?.[0]?.email)
    const bookingUid = text(body?.uid)
    if (!email || !bookingUid) {
      return { action: 'ignored', reason: 'meeting without attendee or uid' }
    }
    return { action: 'ended', email, bookingUid }
  }

  const action =
    trigger === 'BOOKING_CREATED'
      ? 'booked'
      : trigger === 'BOOKING_RESCHEDULED'
      ? 'rescheduled'
      : trigger === 'BOOKING_CANCELLED'
      ? 'cancelled'
      : null
  if (!action) return { action: 'ignored', reason: `trigger ${trigger}` }

  const p = body?.payload ?? {}
  const attendee = p.attendees?.[0] ?? {}
  const email = normalizeEmail(answer(p.responses, 'email') || attendee.email)
  const bookingUid = text(p.uid)
  if (!email || !bookingUid) {
    return { action: 'ignored', reason: 'booking without email or uid' }
  }

  const answers: LeadAnswers = {}
  for (const [key, field] of Object.entries(ANSWER_FIELDS)) {
    const value = answer(p.responses, key)
    if (value) answers[field] = value
  }

  return {
    action,
    email,
    name: answer(p.responses, 'name') || text(attendee.name) || email,
    phone:
      answer(p.responses, 'attendeePhoneNumber') ||
      text(attendee.phoneNumber) ||
      null,
    answers,
    track: trackOfEvent(p.type),
    call: {
      kind: callKind(p.type, p.length),
      bookingUid,
      previousUid:
        action === 'rescheduled' ? text(p.rescheduleUid) || null : null,
      startsAt: text(p.startTime) || null,
    },
  }
}

/** The stage a booking moves a lead to, before advanceStage decides. */
export function stageFor(
  kind: CallKind,
  event: 'booked' | 'ended'
): LeadStage | null {
  if (kind === 'other') return null
  if (kind === 'intro')
    return event === 'booked' ? 'intro-booked' : 'intro-done'
  return event === 'booked' ? 'strategy-booked' : 'strategy-done'
}

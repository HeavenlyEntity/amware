import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  callKind,
  parseCalEvent,
  stageFor,
  trackOfEvent,
  verifyCalSignature,
} from '../calcom'
import { advanceStage } from '../stages'

const sign = (body, secret) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

const booking = (trigger, payload = {}) => ({
  triggerEvent: trigger,
  createdAt: '2026-11-13T10:00:00.000Z',
  payload: {
    type: 'intro-call',
    length: 15,
    uid: 'bk_1',
    startTime: '2026-11-20T17:00:00Z',
    attendees: [{ name: 'Dana Reyes', email: 'Dana@Example.com' }],
    responses: {
      name: { label: 'your_name', value: 'Dana Reyes' },
      email: { label: 'email_address', value: 'Dana@Example.com' },
      attendeePhoneNumber: { label: 'phone_number', value: '+15550100' },
      business_name: {
        label: 'What’s your business called?',
        value: 'Salon Co',
      },
      online_at: { label: 'Where can I see it?', value: '' },
      found_via: {
        label: 'How do customers find you?',
        value: 'Referrals or word of mouth',
      },
      help_with: {
        label: 'How can I best help?',
        value: 'Bookings keep failing.',
      },
      will_attend: { label: 'I’ll be there', value: true },
    },
    ...payload,
  },
})

describe('verifyCalSignature', () => {
  it('accepts the hex HMAC of the raw body and nothing else', () => {
    const body = '{"a":1}'
    expect(verifyCalSignature(body, sign(body, 's3cret'), 's3cret')).toBe(true)
    expect(verifyCalSignature(body, sign(body, 'other'), 's3cret')).toBe(false)
    expect(verifyCalSignature('{"a":2}', sign(body, 's3cret'), 's3cret')).toBe(
      false
    )
  })

  it('trusts nothing without a secret or a signature', () => {
    expect(verifyCalSignature('{}', sign('{}', ''), '')).toBe(false)
    expect(verifyCalSignature('{}', null, 's3cret')).toBe(false)
  })
})

describe('callKind', () => {
  it('reads the slug first, then the length', () => {
    expect(callKind('intro-call', 45)).toBe('intro')
    expect(callKind('strategy-call', 15)).toBe('strategy')
    expect(callKind('chat', 15)).toBe('intro')
    expect(callKind(undefined, 45)).toBe('strategy')
    expect(callKind('on-demand-outcome', 60)).toBe('other')
  })
})

describe('parseCalEvent', () => {
  it('reads MEETING_ENDED flat or nested under payload', () => {
    const flat = {
      triggerEvent: 'MEETING_ENDED',
      uid: 'bk_1',
      attendees: [{ email: 'Dana@Example.com' }],
    }
    const nested = { triggerEvent: 'MEETING_ENDED', payload: { ...flat } }
    for (const body of [flat, nested]) {
      expect(parseCalEvent(body)).toEqual({
        action: 'ended',
        email: 'dana@example.com',
        bookingUid: 'bk_1',
      })
    }
  })

  it('reads a new booking into the lead and its call', () => {
    expect(parseCalEvent(booking('BOOKING_CREATED'))).toEqual({
      action: 'booked',
      email: 'dana@example.com',
      name: 'Dana Reyes',
      phone: '+15550100',
      answers: {
        business: 'Salon Co',
        foundVia: 'Referrals or word of mouth',
        helpWith: 'Bookings keep failing.',
      },
      track: 'consulting',
      call: {
        kind: 'intro',
        bookingUid: 'bk_1',
        previousUid: null,
        startsAt: '2026-11-20T17:00:00Z',
      },
    })
  })

  it('files the Build & support call under build, as an intro call', () => {
    const event = parseCalEvent(
      booking('BOOKING_CREATED', { type: 'build-intro-call' })
    )
    expect(event.track).toBe('build')
    expect(event.call.kind).toBe('intro')
    expect(trackOfEvent('intro-call')).toBe('consulting')
    expect(trackOfEvent('strategy-call')).toBe('consulting')
    expect(trackOfEvent(undefined)).toBe('consulting')
  })

  it('keeps the old uid on a reschedule so the same call moves', () => {
    const event = parseCalEvent(
      booking('BOOKING_RESCHEDULED', { uid: 'bk_2', rescheduleUid: 'bk_1' })
    )
    expect(event.action).toBe('rescheduled')
    expect(event.call).toMatchObject({
      bookingUid: 'bk_2',
      previousUid: 'bk_1',
    })
  })

  it('reads a cancellation', () => {
    expect(parseCalEvent(booking('BOOKING_CANCELLED')).action).toBe('cancelled')
  })

  it('reads the flat Meeting Ended event', () => {
    expect(
      parseCalEvent({
        triggerEvent: 'MEETING_ENDED',
        uid: 'bk_1',
        attendees: [{ email: 'dana@example.com' }],
      })
    ).toEqual({
      action: 'ended',
      email: 'dana@example.com',
      bookingUid: 'bk_1',
    })
  })

  it('drops other triggers and bookings it cannot tie to a person', () => {
    expect(parseCalEvent({ triggerEvent: 'BOOKING_PAID' }).action).toBe(
      'ignored'
    )
    expect(
      parseCalEvent(booking('BOOKING_CREATED', { uid: '', attendees: [] }))
        .action
    ).toBe('ignored')
  })
})

describe('stages', () => {
  it('maps each call to its booked and done stage', () => {
    expect(stageFor('intro', 'booked')).toBe('intro-booked')
    expect(stageFor('strategy', 'ended')).toBe('strategy-done')
    expect(stageFor('other', 'booked')).toBeNull()
  })

  it('only moves forward, and never past a stage set by hand', () => {
    expect(advanceStage(undefined, 'intro-booked')).toBe('intro-booked')
    expect(advanceStage('contacted', 'intro-booked')).toBe('intro-booked')
    expect(advanceStage('strategy-booked', 'intro-done')).toBe(
      'strategy-booked'
    )
    expect(advanceStage('won', 'strategy-booked')).toBe('won')
    expect(advanceStage('not-a-fit', 'intro-booked')).toBe('not-a-fit')
  })
})

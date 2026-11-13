import { describe, expect, it, vi } from 'vitest'

import { recordCalEvent, recordContact } from '../record'

const fakePayload = (existing = null) => ({
  find: vi.fn().mockResolvedValue({ docs: existing ? [existing] : [] }),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({}),
})

const booked = (over = {}) => ({
  action: 'booked',
  email: 'dana@example.com',
  name: 'Dana Reyes',
  phone: '+15550100',
  answers: { business: 'Salon Co' },
  call: {
    kind: 'intro',
    bookingUid: 'bk_1',
    previousUid: null,
    startsAt: '2026-11-20T17:00:00Z',
  },
  ...over,
})

describe('recordCalEvent', () => {
  it('creates a lead from a first booking', async () => {
    const payload = fakePayload()
    expect(await recordCalEvent(payload, booked())).toBe('created')
    expect(payload.create).toHaveBeenCalledWith({
      collection: 'leads',
      data: {
        email: 'dana@example.com',
        name: 'Dana Reyes',
        source: 'calcom',
        stage: 'intro-booked',
        phone: '+15550100',
        business: 'Salon Co',
        calls: [
          {
            kind: 'intro',
            status: 'booked',
            startsAt: '2026-11-20T17:00:00Z',
            bookingUid: 'bk_1',
          },
        ],
      },
    })
  })

  it('adds the strategy call to the same lead and moves it forward', async () => {
    const lead = {
      id: 7,
      stage: 'intro-done',
      researchNotes: 'kept',
      calls: [
        { id: 'c1', kind: 'intro', status: 'completed', bookingUid: 'bk_1' },
      ],
    }
    const payload = fakePayload(lead)
    const event = booked({
      answers: {},
      call: {
        kind: 'strategy',
        bookingUid: 'bk_9',
        previousUid: null,
        startsAt: null,
      },
    })
    expect(await recordCalEvent(payload, event)).toBe('updated')
    const { data } = payload.update.mock.calls[0][0]
    expect(data.stage).toBe('strategy-booked')
    expect(data.calls).toHaveLength(2)
    expect(data.calls[0].id).toBe('c1')
    expect(data).not.toHaveProperty('researchNotes')
  })

  it('ignores a retried booking it already has', async () => {
    const payload = fakePayload({
      id: 7,
      stage: 'intro-booked',
      calls: [
        { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
      ],
    })
    expect(await recordCalEvent(payload, booked())).toBe('unchanged')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('moves a rescheduled call instead of adding one', async () => {
    const payload = fakePayload({
      id: 7,
      stage: 'intro-booked',
      calls: [
        { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
      ],
    })
    await recordCalEvent(
      payload,
      booked({
        action: 'rescheduled',
        call: {
          kind: 'intro',
          bookingUid: 'bk_2',
          previousUid: 'bk_1',
          startsAt: 'later',
        },
      })
    )
    const { calls } = payload.update.mock.calls[0][0].data
    expect(calls).toEqual([
      {
        id: 'c1',
        kind: 'intro',
        status: 'rescheduled',
        bookingUid: 'bk_2',
        startsAt: 'later',
      },
    ])
  })

  it('marks a cancelled call without moving the stage', async () => {
    const payload = fakePayload({
      id: 7,
      stage: 'intro-booked',
      calls: [
        { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
      ],
    })
    expect(await recordCalEvent(payload, booked({ action: 'cancelled' }))).toBe(
      'updated'
    )
    expect(payload.update.mock.calls[0][0].data).toEqual({
      calls: [
        { id: 'c1', kind: 'intro', status: 'cancelled', bookingUid: 'bk_1' },
      ],
    })
  })

  it('marks a finished call done and moves the lead to "done"', async () => {
    const payload = fakePayload({
      id: 7,
      stage: 'intro-booked',
      calls: [
        { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
      ],
    })
    await recordCalEvent(payload, {
      action: 'ended',
      email: 'dana@example.com',
      bookingUid: 'bk_1',
    })
    const { data } = payload.update.mock.calls[0][0]
    expect(data.stage).toBe('intro-done')
    expect(data.calls[0].status).toBe('completed')
  })

  it('never moves a lead past a stage set by hand', async () => {
    const payload = fakePayload({ id: 7, stage: 'won', calls: [] })
    await recordCalEvent(payload, booked())
    expect(payload.update.mock.calls[0][0].data.stage).toBe('won')
  })
})

describe('recordContact', () => {
  it('starts a new person at Contacted', async () => {
    const payload = fakePayload()
    expect(
      await recordContact(payload, {
        name: 'Sam',
        email: ' Sam@Example.com ',
        message: 'Our app is down.',
      })
    ).toBe('created')
    expect(payload.create.mock.calls[0][0].data).toEqual({
      email: 'sam@example.com',
      name: 'Sam',
      source: 'contact-form',
      stage: 'contacted',
      helpWith: 'Our app is down.',
    })
  })

  it('leaves an existing lead as it is', async () => {
    const payload = fakePayload({ id: 3, stage: 'strategy-booked' })
    expect(
      await recordContact(payload, { name: 'Sam', email: 'sam@example.com' })
    ).toBe('unchanged')
    expect(payload.create).not.toHaveBeenCalled()
  })
})

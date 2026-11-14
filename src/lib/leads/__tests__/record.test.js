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

  it("earns the ebook when a lead's first intro call ends, once", async () => {
    const lead = {
      id: 7,
      name: 'Dana Reyes',
      email: 'dana@example.com',
      stage: 'intro-booked',
      calls: [
        { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
      ],
    }
    const ended = {
      action: 'ended',
      email: 'dana@example.com',
      bookingUid: 'bk_1',
    }

    const first = {}
    await recordCalEvent(fakePayload(lead), ended, first)
    expect(first.ebookTo).toEqual({
      email: 'dana@example.com',
      name: 'Dana Reyes',
    })

    // A retried MEETING_ENDED finds the call already done.
    const retry = {}
    const done = {
      ...lead,
      calls: [{ ...lead.calls[0], status: 'completed' }],
    }
    expect(await recordCalEvent(fakePayload(done), ended, retry)).toBe(
      'unchanged'
    )
    expect(retry.ebookTo).toBeUndefined()

    // A second intro call ending earns nothing more.
    const second = {}
    await recordCalEvent(
      fakePayload({
        ...lead,
        calls: [
          { id: 'c0', kind: 'intro', status: 'completed', bookingUid: 'bk_0' },
          { id: 'c1', kind: 'intro', status: 'booked', bookingUid: 'bk_1' },
        ],
      }),
      ended,
      second
    )
    expect(second.ebookTo).toBeUndefined()

    // Nor does a strategy call.
    const strategy = {}
    await recordCalEvent(
      fakePayload({
        ...lead,
        calls: [
          { id: 'c2', kind: 'strategy', status: 'booked', bookingUid: 'bk_1' },
        ],
      }),
      ended,
      strategy
    )
    expect(strategy.ebookTo).toBeUndefined()
  })

  it('names a lead that a checklist sign-up created under its email', async () => {
    const lead = {
      id: 3,
      name: 'dana@example.com',
      email: 'dana@example.com',
      stage: 'contacted',
      calls: [],
    }
    const payload = fakePayload(lead)
    expect(await recordCalEvent(payload, booked())).toBe('updated')
    expect(payload.update.mock.calls[0][0].data.name).toBe('Dana Reyes')
  })

  it('lets the first booking decide the track, then keeps it', async () => {
    const fresh = fakePayload()
    await recordCalEvent(fresh, booked({ track: 'build' }))
    expect(fresh.create.mock.calls[0][0].data.track).toBe('build')

    // A checklist sign-up who books the consulting call is consulting.
    const signUp = fakePayload({
      id: 3,
      name: 'dana@example.com',
      email: 'dana@example.com',
      stage: 'contacted',
      track: 'build',
      calls: [],
    })
    await recordCalEvent(signUp, booked({ track: 'consulting' }))
    expect(signUp.update.mock.calls[0][0].data.track).toBe('consulting')

    // A lead with a booking already keeps its track on a second call.
    const booked1 = fakePayload({
      id: 4,
      name: 'Dana Reyes',
      email: 'dana@example.com',
      stage: 'intro-done',
      track: 'consulting',
      calls: [
        { id: 'c1', kind: 'intro', status: 'completed', bookingUid: 'bk_0' },
      ],
    })
    await recordCalEvent(booked1, booked({ track: 'build' }))
    expect(booked1.update.mock.calls[0][0].data).not.toHaveProperty('track')
  })

  it('keeps a name the lead already has', async () => {
    const lead = {
      id: 3,
      name: 'Dana R. (referral)',
      email: 'dana@example.com',
      stage: 'contacted',
      calls: [],
    }
    const payload = fakePayload(lead)
    await recordCalEvent(payload, booked())
    expect(payload.update.mock.calls[0][0].data).not.toHaveProperty('name')
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
      track: 'consulting',
      helpWith: 'Our app is down.',
    })
  })

  it('files a checklist sign-up under Build & support', async () => {
    const payload = fakePayload()
    await recordContact(payload, {
      name: 'sam@example.com',
      email: 'sam@example.com',
      track: 'build',
    })
    expect(payload.create.mock.calls[0][0].data.track).toBe('build')
  })

  it('leaves an existing lead as it is', async () => {
    const payload = fakePayload({ id: 3, stage: 'strategy-booked' })
    expect(
      await recordContact(payload, { name: 'Sam', email: 'sam@example.com' })
    ).toBe('unchanged')
    expect(payload.create).not.toHaveBeenCalled()
  })
})

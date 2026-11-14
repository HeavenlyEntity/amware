import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/resend', () => ({ sendBookingGifts: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { sendBookingGifts } from '@/lib/resend'
import { POST } from '../route'

const SECRET = 'whsec_test'

const request = (body, signature) => {
  const raw = JSON.stringify(body)
  return new Request('https://example.com/webhooks/calcom', {
    method: 'POST',
    headers: {
      'x-cal-signature-256':
        signature ??
        crypto.createHmac('sha256', SECRET).update(raw).digest('hex'),
    },
    body: raw,
  })
}

const created = {
  triggerEvent: 'BOOKING_CREATED',
  payload: {
    type: 'intro-call',
    length: 15,
    uid: 'bk_1',
    startTime: '2026-11-20T17:00:00Z',
    attendees: [{ name: 'Dana', email: 'dana@example.com' }],
    responses: {
      name: { value: 'Dana' },
      email: { value: 'dana@example.com' },
    },
  },
}

let payload
beforeEach(() => {
  vi.clearAllMocks()
  process.env.CALCOM_WEBHOOK_SECRET = SECRET
  payload = {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn(),
  }
  getPayloadClient.mockResolvedValue(payload)
})

describe('POST /webhooks/calcom', () => {
  it('records a signed booking as a lead', async () => {
    const res = await POST(request(created))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, result: 'created' })
    expect(payload.create).toHaveBeenCalledOnce()
  })

  it('mails the free downloads for a new intro-call booking, once', async () => {
    await POST(request(created))
    expect(sendBookingGifts).toHaveBeenCalledWith({
      email: 'dana@example.com',
      name: 'Dana',
      track: 'consulting',
    })

    // A retried BOOKING_CREATED finds the call already there.
    payload.find.mockResolvedValue({
      docs: [
        {
          id: 1,
          email: 'dana@example.com',
          stage: 'intro-booked',
          calls: [{ kind: 'intro', status: 'booked', bookingUid: 'bk_1' }],
        },
      ],
    })
    sendBookingGifts.mockClear()
    const res = await POST(request(created))
    expect(await res.json()).toEqual({ ok: true, result: 'unchanged' })
    expect(sendBookingGifts).not.toHaveBeenCalled()
  })

  it('mails the Build & support gifts for the build call', async () => {
    await POST(
      request({
        ...created,
        payload: { ...created.payload, type: 'build-intro-call' },
      })
    )
    expect(sendBookingGifts).toHaveBeenCalledWith(
      expect.objectContaining({ track: 'build' })
    )
  })

  it('mails nothing for a strategy call or a cancellation', async () => {
    await POST(
      request({
        ...created,
        payload: {
          ...created.payload,
          type: 'strategy-call',
          length: 45,
          uid: 'bk_9',
        },
      })
    )
    await POST(request({ ...created, triggerEvent: 'BOOKING_CANCELLED' }))
    expect(sendBookingGifts).not.toHaveBeenCalled()
  })

  it('mails nothing when the lead already had an intro call', async () => {
    payload.find.mockResolvedValue({
      docs: [
        {
          id: 1,
          email: 'dana@example.com',
          stage: 'intro-booked',
          calls: [{ kind: 'intro', status: 'cancelled', bookingUid: 'bk_0' }],
        },
      ],
    })
    const res = await POST(request(created))
    expect(await res.json()).toEqual({ ok: true, result: 'updated' })
    expect(sendBookingGifts).not.toHaveBeenCalled()
  })

  it('still answers 200 when the gift mail fails', async () => {
    sendBookingGifts.mockRejectedValue(new Error('resend down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(request(created))
    expect(res.status).toBe(200)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('refuses a body that is not signed with the secret', async () => {
    const res = await POST(request(created, 'deadbeef'))
    expect(res.status).toBe(401)
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('acknowledges events it does not track without touching the database', async () => {
    const res = await POST(
      request({ triggerEvent: 'BOOKING_PAID', payload: {} })
    )
    expect(await res.json()).toEqual({ ok: true, result: 'ignored' })
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('answers 500 when the write fails, so a retry can land', async () => {
    payload.create.mockRejectedValue(new Error('db down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(request(created))
    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})

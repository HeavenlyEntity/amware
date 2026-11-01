import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/creem', () => ({ activateLicense: vi.fn() }))
vi.mock('@/lib/commerce/fulfillment', () => ({ sendOverLimitEmail: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { activateLicense } from '@/lib/commerce/creem'
import * as report from '../report/route'
import * as status from '../status/route'

const KEY = 'KEY-SECRET-123'
const OWNER = 'owner@example.com'

const license = {
  id: 5,
  ownerEmail: OWNER,
  stack: 'next-netsuite',
  tier: 'pro',
  seatMembers: [{ githubUsername: 'a' }],
  accounts: [],
}
const purchase = {
  id: 11,
  license: 5,
  licenseKey: KEY,
  status: 'paid',
  creemEnvironment: 'production',
  createdAt: '2026-10-01T00:00:00.000Z',
}

function fakePayload() {
  const state = { ...license, accounts: [] }
  const payload = {
    find: vi.fn(async ({ collection }) =>
      collection === 'products'
        ? { docs: [{ seats: 1, netsuiteAccounts: 1 }] }
        : { docs: [purchase] }
    ),
    findByID: vi.fn(async ({ collection }) => {
      if (collection === 'licenses') return structuredClone(state)
      return purchase
    }),
    update: vi.fn(async ({ data }) => Object.assign(state, data)),
  }
  getPayloadClient.mockResolvedValue(payload)
  return payload
}

const call = (route, body, init = {}) =>
  route.POST(
    new Request('https://example.com/licenses/x', {
      method: 'POST',
      body,
      ...init,
    })
  )

const good = JSON.stringify({
  key: KEY,
  accountId: '7654321',
  kit: 'next-netsuite',
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  activateLicense.mockResolvedValue({ instanceId: 'inst_secret' })
})

describe('POST /licenses/report', () => {
  it('answers 400 JSON for an empty body', async () => {
    fakePayload()
    for (const body of [undefined, '']) {
      const res = await call(report, body)
      expect(res.status).toBe(400)
      expect(res.headers.get('content-type')).toMatch(/json/)
      expect(await res.json()).toMatchObject({ error: 'bad_request' })
    }
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('answers 400 JSON for text that is not JSON', async () => {
    const res = await call(report, 'not json')
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toMatch(/json/)
  })

  it('answers 400 for a wrongly typed body', async () => {
    const res = await call(
      report,
      JSON.stringify({ key: 1, accountId: '7', kit: 'next-netsuite' })
    )
    expect(res.status).toBe(400)
  })

  it('answers 413 above 2 KB, however it is declared', async () => {
    const big = JSON.stringify({ key: KEY, pad: 'x'.repeat(3000) })
    expect((await call(report, big)).status).toBe(413)
    const lying = await call(report, big, {
      headers: { 'content-length': '20' },
    })
    expect(lying.status).toBe(413)
    expect(lying.headers.get('content-type')).toMatch(/json/)
  })

  it('answers 400 for an unusable account ID', async () => {
    fakePayload()
    const res = await call(
      report,
      JSON.stringify({ key: KEY, accountId: '   ', kit: 'next-netsuite' })
    )
    expect(res.status).toBe(400)
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('answers 200 JSON on success and never exposes the key', async () => {
    fakePayload()
    const res = await call(report, good)
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/json/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(JSON.parse(text)).toEqual({
      status: 'ok',
      tier: 'pro',
      used: 1,
      limit: 1,
    })
    expect(text).not.toContain(KEY)
    expect(text).not.toContain(OWNER)
    expect(text).not.toContain('inst_secret')
  })

  it('answers 200 invalid for a key that opens nothing', async () => {
    const payload = fakePayload()
    payload.find.mockResolvedValue({ docs: [] })
    const res = await call(report, good)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'invalid' })
  })

  it('answers 503 JSON, not a 500 page, when the database throws', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection lost'))
    const res = await call(report, good)
    expect(res.status).toBe(503)
    expect(res.headers.get('content-type')).toMatch(/json/)
    expect(await res.json()).toMatchObject({ error: 'unavailable' })
  })

  it('answers 503 when a query throws, and logs nothing that holds the key', async () => {
    const payload = fakePayload()
    payload.find.mockRejectedValue(
      new Error(`Failed query: select where licenseKey = ${KEY}`)
    )
    const res = await call(report, good)
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain(KEY)
    expect(JSON.stringify(console.error.mock.calls)).not.toContain(KEY)
  })

  it('answers every other method with a JSON 405', async () => {
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      const res = await report[method](
        new Request('https://example.com/licenses/report', { method })
      )
      expect(res.status).toBe(405)
      expect(res.headers.get('allow')).toBe('POST')
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    }
  })

  it('is dynamic', () => {
    expect(report.dynamic).toBe('force-dynamic')
    expect(status.dynamic).toBe('force-dynamic')
  })
})

describe('POST /licenses/status', () => {
  const ask = JSON.stringify({ key: KEY, kit: 'next-netsuite' })

  it('answers 200 JSON with the counts and no key', async () => {
    fakePayload()
    const res = await call(status, ask)
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(JSON.parse(text)).toEqual({
      status: 'ok',
      tier: 'pro',
      developers: { used: 1, limit: 1 },
      accounts: { used: 0, limit: 1 },
    })
    expect(text).not.toContain(KEY)
    expect(text).not.toContain(OWNER)
  })

  it('does not need an account ID', async () => {
    fakePayload()
    expect((await call(status, ask)).status).toBe(200)
  })

  it('answers 400 for an empty body and 413 above 2 KB', async () => {
    expect((await call(status, '')).status).toBe(400)
    expect(
      (await call(status, JSON.stringify({ key: KEY, pad: 'x'.repeat(3000) })))
        .status
    ).toBe(413)
  })

  it('answers 503 JSON when the database throws', async () => {
    getPayloadClient.mockRejectedValue(new Error('down'))
    const res = await call(status, ask)
    expect(res.status).toBe(503)
    expect(res.headers.get('content-type')).toMatch(/json/)
  })

  it('answers GET with a JSON 405', async () => {
    const res = await status.GET(new Request('https://example.com/x'))
    expect(res.status).toBe(405)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@whop/sdk/helpers', () => ({ unwrapWebhook: vi.fn() }))

import { unwrapWebhook } from '@whop/sdk/helpers'
import {
  WhopError,
  verifyWhopWebhook,
  whopRequest,
  customFieldAnswer,
  checkoutRefFrom,
  validCheckoutRef,
} from '../whop'

/* The thin edge between this code and Whop: the webhook helper's throw
   becomes a null, and a failed API call becomes a WhopError that carries
   the status so a caller can tell 404 from 500. */

beforeEach(() => {
  process.env.WHOP_WEBHOOK_SECRET = 'ws_test'
  process.env.WHOP_API_KEY = 'apik_test'
  unwrapWebhook.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyWhopWebhook', () => {
  it('returns the parsed event when the signature holds', () => {
    unwrapWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: {},
    })
    const event = verifyWhopWebhook('{"x":1}', { 'webhook-id': 'msg_1' })
    expect(event?.type).toBe('payment.succeeded')
    expect(unwrapWebhook).toHaveBeenCalledWith('{"x":1}', {
      headers: { 'webhook-id': 'msg_1' },
      key: 'ws_test',
    })
  })

  it('returns null, never throws, when the signature does not hold', () => {
    unwrapWebhook.mockImplementation(() => {
      throw new Error('bad signature')
    })
    expect(verifyWhopWebhook('{}', {})).toBeNull()
  })

  it('returns null without a secret configured, so nothing is ever trusted by default', () => {
    delete process.env.WHOP_WEBHOOK_SECRET
    unwrapWebhook.mockReturnValue({ type: 'payment.succeeded' })
    expect(verifyWhopWebhook('{}', {})).toBeNull()
    expect(unwrapWebhook).not.toHaveBeenCalled()
  })
})

describe('whopRequest', () => {
  it('sends the key and JSON body, and returns the parsed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'plan_1' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const out = await whopRequest('/plans', { method: 'POST', body: { a: 1 } })
    expect(out).toEqual({ id: 'plan_1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.whop.com/api/v1/plans')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer apik_test')
    expect(init.body).toBe('{"a":1}')
  })

  it('throws a WhopError carrying the status on a non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'not found',
      })
    )
    await expect(whopRequest('/plans/x')).rejects.toMatchObject({
      name: 'WhopError',
      status: 404,
    })
  })

  it('talks to the sandbox host when the environment says so', async () => {
    process.env.WHOP_ENV = 'sandbox'
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await whopRequest('/accounts/me')
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://sandbox-api.whop.com/api/v1/accounts/me'
    )
    delete process.env.WHOP_ENV
  })

  it('refuses to run without an API key', async () => {
    delete process.env.WHOP_API_KEY
    await expect(whopRequest('/plans')).rejects.toBeInstanceOf(WhopError)
  })
})

describe('customFieldAnswer', () => {
  it('finds an answer by field name, ignoring case and surrounding space', () => {
    const payment = {
      custom_field_responses: [
        { name: 'Discord username', value: 'grace#1' },
        { name: 'GitHub username', value: '  octocat  ' },
      ],
    }
    expect(customFieldAnswer(payment, 'GitHub username')).toBe('octocat')
    expect(customFieldAnswer(payment, 'github USERNAME')).toBe('octocat')
  })

  it('is null when the field is absent, blank, or the payment has no fields', () => {
    expect(customFieldAnswer({}, 'GitHub username')).toBeNull()
    expect(customFieldAnswer(null, 'GitHub username')).toBeNull()
    expect(
      customFieldAnswer(
        { custom_field_responses: [{ name: 'GitHub username', value: '   ' }] },
        'GitHub username'
      )
    ).toBeNull()
  })

  it('reads the alternative shapes Whop has been observed to send', () => {
    const asAnswer = {
      custom_fields: [{ name: 'GitHub username', answer: 'octocat' }],
    }
    const asMetadata = {
      metadata: {
        custom_fields: [{ name: 'GitHub username', response: 'octocat' }],
      },
    }
    expect(customFieldAnswer(asAnswer, 'GitHub username')).toBe('octocat')
    expect(customFieldAnswer(asMetadata, 'GitHub username')).toBe('octocat')
  })
})

describe('checkoutRefFrom', () => {
  const ref = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  it('reads a UUID reference from the payment metadata', () => {
    expect(checkoutRefFrom({ metadata: { checkout_ref: ref } })).toBe(ref)
  })
  it('refuses anything that is not a UUID', () => {
    expect(
      checkoutRefFrom({ metadata: { checkout_ref: 'drop table' } })
    ).toBeNull()
    expect(checkoutRefFrom({ metadata: { checkout_ref: 42 } })).toBeNull()
    expect(checkoutRefFrom({ metadata: null })).toBeNull()
    expect(checkoutRefFrom(null)).toBeNull()
  })
})

describe('validCheckoutRef', () => {
  const ref = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'

  it('accepts a canonical UUID, exactly as checkoutRefFrom would', () => {
    expect(validCheckoutRef(ref)).toBe(ref)
  })

  it('lower-cases a mixed-case UUID before it can reach a query', () => {
    expect(validCheckoutRef(ref.toUpperCase())).toBe(ref)
  })

  it('refuses anything that is not a canonical UUID, never throwing', () => {
    expect(validCheckoutRef('drop table')).toBeNull()
    expect(validCheckoutRef('')).toBeNull()
    expect(validCheckoutRef(42)).toBeNull()
    expect(validCheckoutRef(null)).toBeNull()
    expect(validCheckoutRef(undefined)).toBeNull()
    expect(validCheckoutRef(['not', 'a', 'string'])).toBeNull()
  })
})

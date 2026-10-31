import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Relative imports and mocks for the three things that reach the outside
   world: the CMS, Creem, and Next's redirect. The module uses no `@/` alias,
   so it runs in the engine project. */
vi.mock('../../getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('../creem', () => ({
  createCheckoutSession: vi.fn(),
  CreemError: class CreemError extends Error {
    constructor(message, status) {
      super(message)
      this.name = 'CreemError'
      this.status = status
    }
  },
}))
// The real redirect throws; the stand-in does too, so nothing after it runs.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { getPayloadClient } from '../../getPayloadClient'
import { CreemError, createCheckoutSession } from '../creem'
import { redirect } from 'next/navigation'
import { startDigitalCheckout } from '../digitalCheckout'

const NOT_ON_SALE = {
  error: {
    message:
      'This item is not on sale yet. Nothing has been charged. Check back shortly or get in touch.',
  },
}

const guide = {
  id: 12,
  slug: 'key-rotation-guide',
  type: 'digital',
  status: 'published',
  creemProductId: 'prod_guide',
  downloadUrl: 'https://example.com/guide.pdf',
}

const form = (fields) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const withDoc = (doc) => {
  const find = vi.fn().mockResolvedValue({ docs: doc ? [doc] : [] })
  getPayloadClient.mockResolvedValue({ find })
  return find
}

const run = (fields = { slug: guide.slug }) =>
  startDigitalCheckout({ error: null }, form(fields))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
  process.env.ACCESS_LINK_SECRET = 'test-link-secret'
  process.env.CREEM_WEBHOOK_SECRET = 'test-webhook-secret'
  delete process.env.ACCESS_TOKEN_SECRET
  createCheckoutSession.mockResolvedValue({
    checkoutUrl: 'https://creem.io/pay/abc',
  })
})

describe('startDigitalCheckout', () => {
  it('looks the product up by slug among published products', async () => {
    const find = withDoc(guide)
    await run().catch(() => {})
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'products',
        where: {
          slug: { equals: 'key-rotation-guide' },
          status: { equals: 'published' },
        },
      })
    )
  })

  it('returns the not-on-sale error for a draft or unknown slug', async () => {
    withDoc(null)
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns the not-on-sale error for a non-digital product', async () => {
    withDoc({ ...guide, type: 'boilerplate' })
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns the not-on-sale error for a product with nothing to deliver', async () => {
    withDoc({ ...guide, downloadUrl: null, downloadFile: null })
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns the not-on-sale error for a product with no Creem id', async () => {
    withDoc({ ...guide, creemProductId: null })
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('throws on a request with no slug', async () => {
    withDoc(guide)
    await expect(run({})).rejects.toThrow('Invalid checkout request')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns the not-on-sale error when Creem does not know the product', async () => {
    withDoc(guide)
    createCheckoutSession.mockRejectedValue(new CreemError('nope', 404))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(redirect).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('throws on any other Creem failure', async () => {
    withDoc(guide)
    createCheckoutSession.mockRejectedValue(new CreemError('boom', 500))
    await expect(run()).rejects.toThrow('boom')
    createCheckoutSession.mockRejectedValue(new Error('network'))
    await expect(run()).rejects.toThrow('network')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects a good product to the Creem checkout', async () => {
    withDoc(guide)
    await expect(run()).rejects.toThrow(
      'NEXT_REDIRECT:https://creem.io/pay/abc'
    )

    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
    const args = createCheckoutSession.mock.calls[0][0]
    expect(args.productId).toBe('prod_guide')
    expect(args.metadata).toEqual({
      itemType: 'product',
      itemId: '12',
      slug: 'key-rotation-guide',
    })
    expect(args.successUrl).toBe(
      `https://example.com/checkout/success?r=${args.requestId}`
    )
    expect(args.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(redirect).toHaveBeenCalledWith('https://creem.io/pay/abc')
  })

  it('throws when the site URL is not configured', async () => {
    withDoc(guide)
    delete process.env.NEXT_PUBLIC_SITE_URL
    await expect(run()).rejects.toThrow('NEXT_PUBLIC_SITE_URL')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('throws before calling Creem when the access-link secret is missing', async () => {
    withDoc(guide)
    delete process.env.ACCESS_LINK_SECRET
    await expect(run()).rejects.toThrow('ACCESS_LINK_SECRET')
    expect(createCheckoutSession).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('accepts the legacy access-link secret name', async () => {
    withDoc(guide)
    delete process.env.ACCESS_LINK_SECRET
    process.env.ACCESS_TOKEN_SECRET = 'legacy'
    await expect(run()).rejects.toThrow('NEXT_REDIRECT')
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
  })

  it('throws before calling Creem when the webhook secret is missing', async () => {
    withDoc(guide)
    delete process.env.CREEM_WEBHOOK_SECRET
    await expect(run()).rejects.toThrow('CREEM_WEBHOOK_SECRET')
    expect(createCheckoutSession).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})

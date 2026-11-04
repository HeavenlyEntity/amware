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
import { verifyOnboardingLink } from '../onboardingLink'
import { startCreemCheckout } from '../creemCheckout'

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
}

const kit = {
  id: 31,
  slug: 'warekit-next-netsuite-pro',
  type: 'boilerplate',
  status: 'published',
  creemProductId: 'prod_kit',
  creemSandboxProductId: 'prod_kit_test',
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
  startCreemCheckout({ error: null }, form(fields))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
  process.env.CREEM_WEBHOOK_SECRET = 'test-webhook-secret'
  delete process.env.ACCESS_LINK_SECRET
  delete process.env.ACCESS_TOKEN_SECRET
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  createCheckoutSession.mockResolvedValue({
    checkoutUrl: 'https://creem.io/pay/abc',
  })
})

describe('startCreemCheckout', () => {
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

  it('returns the not-on-sale error for a service, which sells through Whop', async () => {
    withDoc({ ...guide, type: 'service' })
    expect(await run()).toEqual(NOT_ON_SALE)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns the not-on-sale error for a kit with only a Whop plan', async () => {
    withDoc({ ...kit, creemProductId: null, whopPlanId: 'plan_1' })
    expect(await run({ slug: kit.slug })).toEqual(NOT_ON_SALE)
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

  it('sells without an access-link secret, because Creem delivers the file', async () => {
    withDoc(guide)
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

  it('keeps a digital buyer on /checkout/success', async () => {
    withDoc(guide)
    await run().catch(() => {})
    const { successUrl, requestId } = createCheckoutSession.mock.calls[0][0]
    expect(successUrl).toBe(
      `https://example.com/checkout/success?r=${requestId}`
    )
    expect(successUrl).not.toContain('/checkout/onboarding')
  })

  describe('selling a kit', () => {
    beforeEach(() => {
      process.env.ACCESS_LINK_SECRET = 'test-link-secret'
    })

    const runKit = () => run({ slug: kit.slug })

    it('sends a kit buyer back to the signed onboarding link', async () => {
      withDoc(kit)
      await expect(runKit()).rejects.toThrow(
        'NEXT_REDIRECT:https://creem.io/pay/abc'
      )

      const args = createCheckoutSession.mock.calls[0][0]
      const url = new URL(args.successUrl)
      expect(url.origin + url.pathname).toBe(
        'https://example.com/checkout/onboarding'
      )
      expect(url.searchParams.get('r')).toBe(args.requestId)
      expect(
        verifyOnboardingLink(args.requestId, url.searchParams.get('s'))
      ).toBe(true)
    })

    it('opens the checkout with the kit product and the same metadata shape', async () => {
      withDoc(kit)
      await runKit().catch(() => {})
      const args = createCheckoutSession.mock.calls[0][0]
      expect(args.productId).toBe('prod_kit')
      expect(args.metadata).toEqual({
        itemType: 'product',
        itemId: '31',
        slug: 'warekit-next-netsuite-pro',
      })
    })

    it('refuses before calling Creem when the onboarding link cannot be signed', async () => {
      withDoc(kit)
      delete process.env.ACCESS_LINK_SECRET
      await expect(runKit()).rejects.toThrow('ACCESS_LINK_SECRET')
      expect(createCheckoutSession).not.toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('uses the sandbox product in sandbox and never the live one', async () => {
      process.env.CREEM_ENV = 'sandbox'
      withDoc(kit)
      await runKit().catch(() => {})
      expect(createCheckoutSession.mock.calls[0][0].productId).toBe(
        'prod_kit_test'
      )
    })

    it('does not sell a kit with only a sandbox id in production', async () => {
      withDoc({ ...kit, creemProductId: null })
      expect(await runKit()).toEqual(NOT_ON_SALE)
      expect(createCheckoutSession).not.toHaveBeenCalled()
    })

    it('does not sell a kit with only a live id in sandbox', async () => {
      process.env.CREEM_ENV = 'sandbox'
      withDoc({ ...kit, creemSandboxProductId: null })
      expect(await runKit()).toEqual(NOT_ON_SALE)
      expect(createCheckoutSession).not.toHaveBeenCalled()
    })
  })
})

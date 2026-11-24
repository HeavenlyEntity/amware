import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* Same doubles as the upgrade action's test: the CMS, Creem and Next's
   redirect are mocked, the token is signed and verified for real. */
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
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { getPayloadClient } from '../../getPayloadClient'
import { createCheckoutSession } from '../creem'
import { createAccessToken } from '../accessToken'
import { startRenewal } from '../licenseRenew'

const STACK = 'next-netsuite'
const UNTIL = '2027-12-10T15:00:00.000Z'
const proRow = {
  id: 6,
  slug: 'warekit-next-netsuite-pro',
  stack: STACK,
  tier: 'pro',
  price: 499,
  renewalPrice: 199,
  creemRenewalProductId: 'prod_renew_live',
  creemRenewalSandboxProductId: 'prod_renew_test',
}

/* The database as the action sees it: one license and the kit rows, matched
   on stack and tier the way licenseFromClaims asks for them. */
function world({
  license = {},
  products = [proRow],
  purchase = { id: 42, license: 9 },
} = {}) {
  const rows = {
    licenses: {
      id: 9,
      tier: 'pro',
      stack: STACK,
      updatesComputedUntil: UNTIL,
      ...license,
    },
    purchases: purchase,
  }
  const find = vi.fn(async ({ collection, where }) => {
    if (collection !== 'products') return { docs: [] }
    const clauses = Object.assign(
      {},
      ...where.and.map((clause) => {
        const [field, test] = Object.entries(clause)[0]
        return { [field]: test.equals }
      })
    )
    return {
      docs: products.filter(
        (row) => row.stack === clauses.stack && row.tier === clauses.tier
      ),
    }
  })
  const findByID = vi.fn(async ({ collection, id }) => {
    const row = rows[collection]
    if (!row || row.id !== id) {
      throw Object.assign(new Error('Not Found'), { status: 404 })
    }
    return row
  })
  getPayloadClient.mockResolvedValue({ find, findByID })
  return { find, findByID }
}

const token = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 6,
    ...claims,
  }).token

const form = (fields) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-11-20T00:00:00.000Z'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
  process.env.CREEM_WEBHOOK_SECRET = 'test-webhook-secret'
  process.env.ACCESS_LINK_SECRET = 'renew-test-secret'
  delete process.env.ACCESS_TOKEN_SECRET
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  createCheckoutSession.mockResolvedValue({
    checkoutUrl: 'https://creem.io/pay/renew',
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('startRenewal', () => {
  it('opens a checkout for the renewal product of the tier the license holds', async () => {
    world()
    const tok = token()
    await expect(startRenewal(null, form({ token: tok }))).rejects.toThrow(
      'NEXT_REDIRECT:'
    )
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod_renew_live',
        successUrl: `https://example.com/access/seats/${tok}?renewed=${encodeURIComponent(
          UNTIL
        )}`,
        metadata: {
          itemType: 'product',
          itemId: '6',
          slug: 'warekit-next-netsuite-pro',
          licenseId: '9',
          renewal: '1',
        },
      })
    )
  })

  it('uses the test-mode renewal product in the sandbox', async () => {
    process.env.CREEM_ENV = 'sandbox'
    world({ license: { creemEnvironment: 'sandbox' } })
    await expect(startRenewal(null, form({ token: token() }))).rejects.toThrow(
      'NEXT_REDIRECT:'
    )
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod_renew_test' })
    )
  })

  it('refuses before the 60-day window opens, says when it opens, and that nothing was charged', async () => {
    vi.setSystemTime(new Date('2027-10-01T00:00:00.000Z'))
    world()
    const result = await startRenewal(null, form({ token: token() }))
    expect(result.error.message).toBe(
      'Renewal opens on 11 October 2027, 60 days before your updates end. Nothing was charged.'
    )
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('is offered at any time after the end date', async () => {
    vi.setSystemTime(new Date('2028-06-01T00:00:00.000Z'))
    world()
    await expect(startRenewal(null, form({ token: token() }))).rejects.toThrow(
      'NEXT_REDIRECT:'
    )
  })

  it.each([
    ['a license with no paid tier', { tier: null }],
    ['a Lite license', { tier: 'lite' }],
    [
      'an Enterprise license',
      { tier: 'enterprise', updatesUntilOverride: UNTIL },
    ],
    [
      'a license from the other Creem environment',
      { creemEnvironment: 'sandbox' },
    ],
    ['a license with no end date', { updatesComputedUntil: null }],
  ])('refuses %s, saying nothing was charged', async (_name, over) => {
    world({ license: over })
    const result = await startRenewal(null, form({ token: token() }))
    expect(result.error.message).toContain('Nothing was charged.')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses when the kit row has no renewal product or no renewal price', async () => {
    for (const row of [
      { ...proRow, creemRenewalProductId: null },
      { ...proRow, renewalPrice: null },
    ]) {
      world({ products: [row] })
      expect(
        (await startRenewal(null, form({ token: token() }))).error.message
      ).toContain('Nothing was charged.')
    }
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a kit row whose renewal price is 0, as it does a missing price', async () => {
    world({ products: [{ ...proRow, renewalPrice: null }] })
    const missing = await startRenewal(null, form({ token: token() }))
    world({ products: [{ ...proRow, renewalPrice: 0 }] })
    const zero = await startRenewal(null, form({ token: token() }))
    expect(zero.error.message).toBe(missing.error.message)
    expect(zero.error.message).toContain('Nothing was charged.')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a link that is not valid', async () => {
    world()
    const result = await startRenewal(null, form({ token: 'nope' }))
    expect(result.error.message).toContain('This link is no longer valid.')
    expect(result.error.message).toContain('Nothing was charged.')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('says nothing was charged when the lookup fails', async () => {
    getPayloadClient.mockRejectedValue(new Error('db down'))
    const result = await startRenewal(null, form({ token: token() }))
    expect(result.error.message).toContain('Nothing was charged.')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses when checkout is not configured', async () => {
    delete process.env.CREEM_WEBHOOK_SECRET
    world()
    const result = await startRenewal(null, form({ token: token() }))
    expect(result.error.message).toContain('Nothing was charged.')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('says nothing was charged when Creem fails', async () => {
    world()
    createCheckoutSession.mockRejectedValue(new Error('boom'))
    expect(
      (await startRenewal(null, form({ token: token() }))).error.message
    ).toBe('Nothing was charged. Try again or get in touch.')
  })
})

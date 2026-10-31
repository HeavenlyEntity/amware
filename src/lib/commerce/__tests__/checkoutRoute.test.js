import { describe, expect, it } from 'vitest'
import { checkoutRoute } from '../checkoutRoute'

describe('checkoutRoute', () => {
  it('sends a kit with a Whop plan to Whop', () => {
    expect(checkoutRoute({ type: 'boilerplate', whopPlanId: 'plan_1' })).toBe(
      'whop'
    )
  })

  it('does not treat a Creem id as a way to sell a kit', () => {
    expect(
      checkoutRoute({ type: 'boilerplate', creemProductId: 'prod_1' })
    ).toBe(null)
  })

  it('sends a digital product with a Creem id and a deliverable to Creem', () => {
    expect(
      checkoutRoute({
        type: 'digital',
        creemProductId: 'prod_1',
        downloadUrl: 'https://x/y.pdf',
      })
    ).toBe('creem')
    expect(
      checkoutRoute({
        type: 'digital',
        creemProductId: 'prod_1',
        downloadFile: 7,
      })
    ).toBe('creem')
  })

  it('does not put a digital product on sale with nothing to deliver', () => {
    expect(checkoutRoute({ type: 'digital', creemProductId: 'prod_1' })).toBe(
      null
    )
  })

  it('does not sell a digital product through Whop', () => {
    expect(checkoutRoute({ type: 'digital', whopPlanId: 'plan_1' })).toBe(null)
  })

  it('does not sell a digital product without a Creem id', () => {
    expect(
      checkoutRoute({ type: 'digital', downloadUrl: 'https://x/y.pdf' })
    ).toBe(null)
  })

  it('reads the sandbox plan in the sandbox environment', () => {
    const kit = {
      type: 'boilerplate',
      whopPlanId: 'plan_live',
      whopSandboxPlanId: 'plan_sbx',
    }
    expect(checkoutRoute(kit, 'sandbox')).toBe('whop')
    expect(
      checkoutRoute({ type: 'boilerplate', whopPlanId: 'plan_live' }, 'sandbox')
    ).toBe(null)
  })

  it('returns null for no product', () => {
    expect(checkoutRoute(null)).toBe(null)
    expect(checkoutRoute(undefined)).toBe(null)
  })
})

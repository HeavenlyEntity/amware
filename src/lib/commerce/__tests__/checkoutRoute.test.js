import { describe, expect, it } from 'vitest'
import { checkoutRoute } from '../checkoutRoute'

describe('checkoutRoute', () => {
  it('sends a kit with a Creem id to Creem and ignores a Whop plan', () => {
    expect(
      checkoutRoute({
        type: 'boilerplate',
        creemProductId: 'prod_1',
        whopPlanId: 'plan_1',
      })
    ).toBe('creem')
  })

  it('leaves a kit with only a Whop plan off sale', () => {
    expect(checkoutRoute({ type: 'boilerplate', whopPlanId: 'plan_1' })).toBe(
      null
    )
  })

  it('keeps a kit with only a sandbox id off sale in production', () => {
    expect(
      checkoutRoute(
        { type: 'boilerplate', creemSandboxProductId: 'prod_test' },
        'production'
      )
    ).toBe(null)
  })

  it('sells a kit with only a sandbox id in sandbox', () => {
    expect(
      checkoutRoute(
        { type: 'boilerplate', creemSandboxProductId: 'prod_test' },
        'sandbox'
      )
    ).toBe('creem')
  })

  it('keeps selling a service through Whop', () => {
    expect(checkoutRoute({ type: 'service', whopPlanId: 'plan_1' })).toBe(
      'whop'
    )
    expect(checkoutRoute({ type: 'service', creemProductId: 'prod_1' })).toBe(
      null
    )
  })

  it('does not let the Creem environment change how a service is routed', () => {
    const service = { type: 'service', whopPlanId: 'plan_live' }
    expect(checkoutRoute(service, 'sandbox')).toBe('whop')
    expect(
      checkoutRoute(
        { type: 'service', whopSandboxPlanId: 'plan_sbx' },
        'sandbox'
      )
    ).toBe(null)
  })

  it('sends a digital product with a Creem id to Creem, which delivers the file', () => {
    expect(checkoutRoute({ type: 'digital', creemProductId: 'prod_1' })).toBe(
      'creem'
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

  it('reads the sandbox id for a digital product in sandbox', () => {
    const guide = {
      type: 'digital',
      creemProductId: 'prod_live',
      creemSandboxProductId: 'prod_test',
    }
    expect(checkoutRoute(guide, 'sandbox')).toBe('creem')
    expect(
      checkoutRoute({ type: 'digital', creemProductId: 'prod_live' }, 'sandbox')
    ).toBe(null)
  })

  it('returns null for no product', () => {
    expect(checkoutRoute(null)).toBe(null)
    expect(checkoutRoute(undefined)).toBe(null)
  })
})

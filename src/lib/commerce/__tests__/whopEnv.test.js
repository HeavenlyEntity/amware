import { afterEach, describe, expect, it } from 'vitest'

import {
  depositPlanId,
  isWhopSandbox,
  planId,
  whopEnvironment,
} from '../whopEnv'

/* One switch decides which Whop a page talks to. The failure that matters
   is a sandbox plan reaching a real customer, so the default is production
   and the sandbox id is only ever chosen when the switch says so. */

afterEach(() => {
  delete process.env.WHOP_ENV
  delete process.env.NEXT_PUBLIC_WHOP_ENV
})

const service = { whopPlanId: 'plan_live', whopSandboxPlanId: 'plan_sand' }

describe('whopEnvironment', () => {
  it('is production when nothing is set, and for any value that is not "sandbox"', () => {
    expect(whopEnvironment()).toBe('production')
    process.env.WHOP_ENV = 'staging'
    expect(whopEnvironment()).toBe('production')
    expect(isWhopSandbox()).toBe(false)
  })

  it('is sandbox from either variable', () => {
    process.env.WHOP_ENV = 'sandbox'
    expect(whopEnvironment()).toBe('sandbox')
    delete process.env.WHOP_ENV
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    expect(isWhopSandbox()).toBe(true)
  })
})

describe('depositPlanId', () => {
  it('picks the live plan by default and the sandbox plan in the sandbox', () => {
    expect(depositPlanId(service)).toBe('plan_live')
    expect(depositPlanId(service, 'sandbox')).toBe('plan_sand')
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    expect(depositPlanId(service)).toBe('plan_sand')
  })

  it("never falls back to the other environment's plan", () => {
    expect(depositPlanId({ whopPlanId: 'plan_live' }, 'sandbox')).toBeNull()
    expect(
      depositPlanId({ whopSandboxPlanId: 'plan_sand' }, 'production')
    ).toBeNull()
    expect(depositPlanId(null)).toBeNull()
    expect(depositPlanId({ whopPlanId: '' })).toBeNull()
  })
})

describe('planId', () => {
  const product = { whopPlanId: 'plan_live', whopSandboxPlanId: 'plan_sand' }

  it('picks the live plan by default and the sandbox plan when asked', () => {
    expect(planId(product)).toBe('plan_live')
    expect(planId(product, 'sandbox')).toBe('plan_sand')
  })

  it('is null for nothing, and for an item whose id for this environment is empty', () => {
    expect(planId(null)).toBeNull()
    expect(planId(undefined)).toBeNull()
    expect(planId({ whopPlanId: '' })).toBeNull()
    expect(planId({ whopPlanId: 'plan_live' }, 'sandbox')).toBeNull()
  })

  it('reads the same shape depositPlanId does, so services keep working', () => {
    expect(planId(product)).toBe(depositPlanId(product))
  })
})

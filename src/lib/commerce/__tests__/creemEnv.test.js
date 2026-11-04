import { afterEach, describe, expect, it } from 'vitest'

import {
  creemEnvironment,
  creemProductIdFor,
  creemUpgradeProductIdFor,
} from '../creemEnv'

/* One switch decides which Creem a page talks to. The failure that matters
   is a test-mode product reaching a real customer, so the default is
   production and the sandbox id is only chosen when the switch says so. */

afterEach(() => {
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
})

const item = {
  creemProductId: 'live',
  creemSandboxProductId: 'test',
  creemUpgradeProductId: 'live_up',
  creemUpgradeSandboxProductId: 'test_up',
}

describe('creemEnvironment', () => {
  it('treats an unset environment as production', () => {
    expect(creemEnvironment()).toBe('production')
  })

  it('is production for any value that is not "sandbox"', () => {
    process.env.CREEM_ENV = 'staging'
    expect(creemEnvironment()).toBe('production')
  })

  it('is sandbox from either variable', () => {
    process.env.CREEM_ENV = 'sandbox'
    expect(creemEnvironment()).toBe('sandbox')
    delete process.env.CREEM_ENV
    process.env.NEXT_PUBLIC_CREEM_ENV = 'sandbox'
    expect(creemEnvironment()).toBe('sandbox')
  })

  it('prefers the public variable, as the Whop switch does', () => {
    process.env.NEXT_PUBLIC_CREEM_ENV = 'production'
    process.env.CREEM_ENV = 'sandbox'
    expect(creemEnvironment()).toBe('production')
  })
})

describe('creemProductIdFor', () => {
  it('uses the sandbox id only in sandbox', () => {
    expect(creemProductIdFor(item, 'production')).toBe('live')
    expect(creemProductIdFor(item, 'sandbox')).toBe('test')
  })

  it('defaults to the current environment', () => {
    expect(creemProductIdFor(item)).toBe('live')
    process.env.CREEM_ENV = 'sandbox'
    expect(creemProductIdFor(item)).toBe('test')
  })

  it('does not fall back to the other environment id', () => {
    expect(
      creemProductIdFor({ creemSandboxProductId: 'test' }, 'production')
    ).toBeNull()
    expect(creemProductIdFor({ creemProductId: 'live' }, 'sandbox')).toBeNull()
  })

  it('returns null for no item or an empty id', () => {
    expect(creemProductIdFor(null)).toBeNull()
    expect(creemProductIdFor(undefined)).toBeNull()
    expect(creemProductIdFor({ creemProductId: '' })).toBeNull()
  })
})

describe('creemUpgradeProductIdFor', () => {
  it('uses the sandbox upgrade id only in sandbox', () => {
    expect(creemUpgradeProductIdFor(item, 'production')).toBe('live_up')
    expect(creemUpgradeProductIdFor(item, 'sandbox')).toBe('test_up')
  })

  it('does not fall back to the other environment id', () => {
    expect(
      creemUpgradeProductIdFor({ creemUpgradeSandboxProductId: 't' })
    ).toBeNull()
    expect(
      creemUpgradeProductIdFor({ creemUpgradeProductId: 'l' }, 'sandbox')
    ).toBeNull()
  })

  it('returns null for no item', () => {
    expect(creemUpgradeProductIdFor(null)).toBeNull()
  })
})

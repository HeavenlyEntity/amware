import { describe, expect, it } from 'vitest'

import {
  highestTier,
  joinDecision,
  licenseLimits,
  nextAction,
  normalizeAccountId,
  tierRank,
  upgradeCost,
  upgradeReturn,
} from '../license'

/* The rules a license follows, kept pure so the webhook, the admin, the
   account page and the kit all read the same answer. A refunded license has
   a null tier, so every function has to cope with that without throwing. */

describe('tierRank', () => {
  it('orders the tiers', () => {
    expect(tierRank('lite')).toBeLessThan(tierRank('pro'))
    expect(tierRank('pro')).toBeLessThan(tierRank('team'))
    expect(tierRank('team')).toBeLessThan(tierRank('enterprise'))
  })

  it('ranks a missing or unknown tier below Lite', () => {
    for (const tier of [null, undefined, '', 'gold']) {
      expect(tierRank(tier)).toBeLessThan(tierRank('lite'))
    }
  })
})

describe('highestTier', () => {
  it('takes the highest tier and ignores nulls', () => {
    expect(highestTier(['lite', 'pro', null])).toBe('pro')
    expect(highestTier([])).toBeNull()
  })

  it('returns null when nothing is a real tier', () => {
    expect(highestTier([null, undefined, 'gold'])).toBeNull()
  })

  it('reaches Enterprise', () => {
    expect(highestTier(['team', 'enterprise', 'pro'])).toBe('enterprise')
  })

  it('treats a missing list as empty', () => {
    expect(highestTier(undefined)).toBeNull()
  })
})

describe('joinDecision', () => {
  it('joins the license named in metadata', () => {
    expect(
      joinDecision({ licenseId: 7, candidates: [], tier: 'team' })
    ).toEqual({ join: 7 })
  })

  it('prefers the metadata license over an email match', () => {
    expect(
      joinDecision({
        licenseId: 7,
        candidates: [{ id: 1, tier: 'lite' }],
        tier: 'pro',
      })
    ).toEqual({ join: 7 })
  })

  it('joins by email only when the tier goes up', () => {
    expect(
      joinDecision({ candidates: [{ id: 1, tier: 'lite' }], tier: 'pro' })
    ).toEqual({ join: 1 })
  })

  it('starts a new license for a second purchase at the same tier', () => {
    expect(
      joinDecision({ candidates: [{ id: 1, tier: 'pro' }], tier: 'pro' })
    ).toEqual({ create: true })
  })

  it('starts a new license when the purchase is a lower tier', () => {
    expect(
      joinDecision({ candidates: [{ id: 1, tier: 'team' }], tier: 'pro' })
    ).toEqual({ create: true })
  })

  it('starts a new license when there is nothing to join', () => {
    expect(joinDecision({ candidates: [], tier: 'pro' })).toEqual({
      create: true,
    })
    expect(joinDecision({ tier: 'pro' })).toEqual({ create: true })
  })

  it('moves the highest eligible license up, oldest first on a tie', () => {
    expect(
      joinDecision({
        candidates: [
          { id: 5, tier: 'lite' },
          { id: 3, tier: 'pro' },
          { id: 2, tier: 'pro' },
          { id: 9, tier: 'team' },
        ],
        tier: 'team',
      })
    ).toEqual({ join: 2 })
  })

  it('lets a refunded license, which has no tier, be joined again', () => {
    expect(
      joinDecision({ candidates: [{ id: 4, tier: null }], tier: 'lite' })
    ).toEqual({ join: 4 })
  })

  it('does not join anything for a purchase with no tier', () => {
    expect(
      joinDecision({ candidates: [{ id: 4, tier: null }], tier: null })
    ).toEqual({ create: true })
  })
})

describe('licenseLimits', () => {
  it('reads limits from the product and defaults accounts to 1', () => {
    expect(
      licenseLimits({ tier: 'team' }, { seats: 5, netsuiteAccounts: 3 })
    ).toEqual({ seats: 5, accounts: 3 })
    expect(licenseLimits({ tier: 'pro' }, { seats: 1 })).toEqual({
      seats: 1,
      accounts: 1,
    })
  })

  it('prefers Enterprise overrides', () => {
    expect(
      licenseLimits(
        { tier: 'enterprise', seatOverride: 20, accountOverride: 12 },
        null
      )
    ).toEqual({ seats: 20, accounts: 12 })
  })

  it('lets an override beat the product on any paid tier', () => {
    expect(
      licenseLimits(
        { tier: 'team', seatOverride: 8, accountOverride: 6 },
        { seats: 5, netsuiteAccounts: 3 }
      )
    ).toEqual({ seats: 8, accounts: 6 })
  })

  it('falls back to the product where only one override is set', () => {
    expect(
      licenseLimits(
        { tier: 'team', seatOverride: 8 },
        { seats: 5, netsuiteAccounts: 3 }
      )
    ).toEqual({ seats: 8, accounts: 3 })
  })

  it('gives an Enterprise license with no overrides one of each', () => {
    expect(licenseLimits({ tier: 'enterprise' }, null)).toEqual({
      seats: 1,
      accounts: 1,
    })
  })

  it('does not track accounts on Lite', () => {
    expect(licenseLimits({ tier: 'lite' }, { seats: 1 }).accounts).toBeNull()
  })

  it('copes with a refunded license and a missing product', () => {
    expect(() => licenseLimits({ tier: null }, null)).not.toThrow()
    expect(licenseLimits({ tier: null }, null)).toEqual({
      seats: 1,
      accounts: null,
    })
    expect(() => licenseLimits(null, null)).not.toThrow()
  })

  it('ignores values that are not numbers', () => {
    expect(
      licenseLimits(
        { tier: 'team', seatOverride: null, accountOverride: undefined },
        { seats: '5', netsuiteAccounts: null }
      )
    ).toEqual({ seats: 1, accounts: 1 })
  })
})

describe('normalizeAccountId', () => {
  it.each([
    ['1234567', '1234567'],
    ['1234567_SB1', '1234567'],
    ['1234567-sb2', '1234567'],
    ['1234567_RP', '1234567'],
    [' tstdrv123 ', 'TSTDRV123'],
  ])('normalises %s', (raw, want) => {
    expect(normalizeAccountId(raw)).toBe(want)
  })

  it.each(['', '   ', null, undefined, 'x'.repeat(65)])('rejects %s', (raw) => {
    expect(normalizeAccountId(raw)).toBeNull()
  })

  it('keeps a 64 character id', () => {
    expect(normalizeAccountId('a'.repeat(64))).toBe('A'.repeat(64))
  })

  it('rejects a suffix with nothing in front of it', () => {
    expect(normalizeAccountId('_SB1')).toBeNull()
  })

  it('leaves other formats as their own account', () => {
    expect(normalizeAccountId('1234567_SBX')).toBe('1234567_SBX')
  })

  it('rejects things that are not text', () => {
    expect(normalizeAccountId({})).toBeNull()
  })
})

describe('nextAction', () => {
  it('offers Team to a Pro license and marks it urgent at a limit', () => {
    const base = {
      license: { tier: 'pro' },
      seatsUsed: 1,
      seatLimit: 1,
      accountsUsed: 0,
      accountLimit: 1,
    }
    expect(nextAction(base)).toEqual({ kind: 'upgrade-team', urgent: true })
    expect(nextAction({ ...base, seatsUsed: 0 })).toEqual({
      kind: 'upgrade-team',
      urgent: false,
    })
  })

  it('is urgent when only the accounts are used up', () => {
    expect(
      nextAction({
        license: { tier: 'pro' },
        seatsUsed: 0,
        seatLimit: 1,
        accountsUsed: 1,
        accountLimit: 1,
      })
    ).toEqual({ kind: 'upgrade-team', urgent: true })
  })

  it('puts a quote ahead of everything else', () => {
    expect(
      nextAction({
        license: { tier: 'pro' },
        hasQuote: true,
        seatsUsed: 0,
        seatLimit: 1,
        accountsUsed: 0,
        accountLimit: 1,
      }).kind
    ).toBe('enterprise-quote')
  })

  it('offers Enterprise contact only to a Team license at a limit', () => {
    const team = {
      license: { tier: 'team' },
      seatsUsed: 5,
      seatLimit: 5,
      accountsUsed: 1,
      accountLimit: 3,
    }
    expect(nextAction(team)).toEqual({
      kind: 'enterprise-contact',
      urgent: true,
    })
    expect(nextAction({ ...team, seatsUsed: 2 })).toEqual({
      kind: null,
      urgent: false,
    })
  })

  it('offers nothing to Lite or Enterprise', () => {
    const full = {
      seatsUsed: 9,
      seatLimit: 1,
      accountsUsed: 9,
      accountLimit: 1,
    }
    expect(nextAction({ ...full, license: { tier: 'lite' } }).kind).toBeNull()
    expect(
      nextAction({ ...full, license: { tier: 'enterprise' } }).kind
    ).toBeNull()
  })

  it('does not count accounts when the tier does not track them', () => {
    expect(
      nextAction({
        license: { tier: 'pro' },
        seatsUsed: 0,
        seatLimit: 1,
        accountsUsed: 4,
        accountLimit: null,
      })
    ).toEqual({ kind: 'upgrade-team', urgent: false })
  })

  it('copes with a refunded license and missing numbers', () => {
    expect(nextAction({ license: { tier: null } })).toEqual({
      kind: null,
      urgent: false,
    })
    expect(nextAction({ license: null })).toEqual({
      kind: null,
      urgent: false,
    })
    expect(nextAction({})).toEqual({ kind: null, urgent: false })
  })
})

describe('upgradeCost', () => {
  it('is the Team price less the Pro price', () => {
    expect(upgradeCost(499, 999)).toBe(500)
  })

  it('has no number when a price is missing or not a number', () => {
    expect(upgradeCost(undefined, 999)).toBeNull()
    expect(upgradeCost(499, null)).toBeNull()
    expect(upgradeCost('499', 999)).toBeNull()
    expect(upgradeCost(499, NaN)).toBeNull()
  })

  it('has no number when Team does not cost more than Pro', () => {
    expect(upgradeCost(999, 999)).toBeNull()
    expect(upgradeCost(999, 499)).toBeNull()
  })
})

describe('upgradeReturn', () => {
  it('is confirming while the license is below the tier named', () => {
    expect(upgradeReturn('pro', 'team')).toEqual({
      target: 'team',
      phase: 'confirming',
    })
    expect(upgradeReturn(null, 'enterprise')).toEqual({
      target: 'enterprise',
      phase: 'confirming',
    })
  })

  it('is done once the license is on the tier named', () => {
    expect(upgradeReturn('team', 'team')).toEqual({
      target: 'team',
      phase: 'done',
    })
  })

  it('ignores a license already past the tier named', () => {
    expect(upgradeReturn('enterprise', 'team')).toBeNull()
  })

  it('ignores anything that is not an upgrade target', () => {
    expect(upgradeReturn('pro', undefined)).toBeNull()
    expect(upgradeReturn('pro', '')).toBeNull()
    expect(upgradeReturn('pro', 'gold')).toBeNull()
    expect(upgradeReturn('pro', 'pro')).toBeNull()
    expect(upgradeReturn('lite', ['team'])).toBeNull()
    expect(upgradeReturn('pro', 'constructor')).toBeNull()
    expect(upgradeReturn('pro', '__proto__')).toBeNull()
  })
})

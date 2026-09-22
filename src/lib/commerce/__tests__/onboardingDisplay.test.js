import { describe, expect, it } from 'vitest'

/* Relative import: the engine project defines no `@/` alias, and these are
   pure functions over plain values. */
import { maskLicenseKey, tierFromSlug } from '../onboardingDisplay'

/* The onboarding page has no signature: anyone holding a payment id can
   load it. These two decide what that page is allowed to show, so they are
   tested on their own rather than through a rendered page. */

describe('maskLicenseKey', () => {
  it('shows only the last four characters of a twelve-character key', () => {
    expect(maskLicenseKey('ABCDEFGH1234')).toBe('••••1234')
  })

  it('shows only the last four characters of a forty-character key', () => {
    const key = 'WHOPKEY' + 'x'.repeat(29) + 'WXYZ'
    expect(key).toHaveLength(40)
    const masked = maskLicenseKey(key)
    expect(masked).toBe('••••WXYZ')
    /* Whop keys carry no brand prefix, so the opening characters are as
       secret as the rest. The old mask showed seven of them. */
    expect(masked).not.toContain('WHOPKEY')
  })

  it('shows nothing for a key too short to keep eight characters hidden', () => {
    expect(maskLicenseKey('A'.repeat(11))).toBeNull()
  })

  it('shows nothing for an empty key', () => {
    expect(maskLicenseKey('')).toBeNull()
  })

  it('shows nothing for a value that is not a string', () => {
    for (const value of [null, undefined, 123456789012, {}, ['ABCDEFGH1234']]) {
      expect(maskLicenseKey(value)).toBeNull()
    }
  })
})

describe('tierFromSlug', () => {
  it('reads the tier off every real kit slug', () => {
    expect(tierFromSlug('warekit-next-netsuite-lite')).toBe('lite')
    expect(tierFromSlug('warekit-next-netsuite-pro')).toBe('pro')
    expect(tierFromSlug('warekit-next-netsuite-team')).toBe('team')
    expect(tierFromSlug('warekit-react-netsuite-lite')).toBe('lite')
    expect(tierFromSlug('warekit-react-netsuite-pro')).toBe('pro')
    expect(tierFromSlug('warekit-react-netsuite-team')).toBe('team')
  })

  it('gives no tier to a slug that only looks like a kit', () => {
    expect(tierFromSlug('warekit')).toBeNull()
  })

  it('gives no tier to an item that is not a kit, so a guide buyer is never offered Team', () => {
    expect(tierFromSlug('switch-clone-quick-key-rotation-guide')).toBeNull()
  })

  it('gives no tier when there is no slug at all', () => {
    for (const value of ['', null, undefined, 42]) {
      expect(tierFromSlug(value)).toBeNull()
    }
  })
})

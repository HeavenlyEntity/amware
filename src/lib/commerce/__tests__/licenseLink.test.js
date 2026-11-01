import { beforeEach, describe, expect, it } from 'vitest'
import { verifyAccessToken, DEFAULT_TTL_MS } from '../accessToken'
import { LICENSE_LINK_WINDOW_MS, licenseLinkFor } from '../licenseLink'

const NOW = Date.parse('2026-11-01T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const purchase = (ageMs) => ({
  id: 99,
  createdAt: new Date(NOW - ageMs).toISOString(),
})

beforeEach(() => {
  process.env.ACCESS_LINK_SECRET = 'test-secret-for-license-link'
})

describe('licenseLinkFor', () => {
  it('shares the token lifetime rather than keeping its own 30 days', () => {
    expect(LICENSE_LINK_WINDOW_MS).toBe(DEFAULT_TTL_MS)
    expect(LICENSE_LINK_WINDOW_MS).toBe(30 * DAY)
  })

  it('mints a link that opens the license, inside the window', () => {
    const { url, expired } = licenseLinkFor({
      purchase: purchase(29 * DAY),
      licenseId: 5,
      itemId: 7,
      now: NOW,
    })
    expect(expired).toBe(false)
    expect(url).toMatch(/^\/access\/seats\//)
    expect(verifyAccessToken(url.split('/').pop())).toMatchObject({
      purchaseId: 99,
      licenseId: 5,
      itemId: 7,
    })
  })

  it('mints nothing past the window, and says it is expired', () => {
    expect(
      licenseLinkFor({ purchase: purchase(31 * DAY), itemId: 7, now: NOW })
    ).toEqual({ url: null, expired: true })
  })

  it('treats a missing or unreadable creation date as expired', () => {
    for (const createdAt of [undefined, null, 'not a date']) {
      expect(
        licenseLinkFor({ purchase: { id: 1, createdAt }, itemId: 7, now: NOW })
      ).toEqual({ url: null, expired: true })
    }
  })

  it('mints nothing, without calling it expired, when it cannot sign', () => {
    delete process.env.ACCESS_LINK_SECRET
    delete process.env.ACCESS_TOKEN_SECRET
    expect(
      licenseLinkFor({ purchase: purchase(DAY), itemId: 7, now: NOW })
    ).toEqual({ url: null, expired: false })
  })

  it('mints nothing when it does not know what the link opens', () => {
    expect(licenseLinkFor({ purchase: purchase(DAY), now: NOW })).toEqual({
      url: null,
      expired: false,
    })
  })
})

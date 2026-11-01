import { describe, expect, it, beforeEach, afterEach } from 'vitest'

/* Relative import: the engine project defines no `@/` alias, and this module
   reaches nothing but node crypto. */
import {
  createAccessToken,
  tryCreateAccessToken,
  verifyAccessToken,
} from '../accessToken'

const claims = { purchaseId: 7, itemType: 'product', itemId: 3 }

beforeEach(() => {
  process.env.ACCESS_LINK_SECRET = 'a-test-signing-secret'
})

afterEach(() => {
  delete process.env.ACCESS_LINK_SECRET
})

describe('createAccessToken', () => {
  it('round-trips through verify', () => {
    const { token, jti } = createAccessToken(claims)
    const payload = verifyAccessToken(token)
    expect(payload).toMatchObject({ ...claims, jti })
  })

  it('carries a license id with no purchase', () => {
    const { token } = createAccessToken({
      purchaseId: null,
      licenseId: 12,
      itemType: 'product',
      itemId: 3,
    })
    const payload = verifyAccessToken(token)
    expect(payload).toMatchObject({ purchaseId: null, licenseId: 12 })
  })

  it('keeps both claims when a link names a purchase and a license', () => {
    const { token } = createAccessToken({ ...claims, licenseId: 12 })
    expect(verifyAccessToken(token)).toMatchObject({
      purchaseId: 7,
      licenseId: 12,
    })
  })

  it('leaves licenseId out of a link that has none', () => {
    const { token } = createAccessToken(claims)
    expect(verifyAccessToken(token)).not.toHaveProperty('licenseId')
  })

  it('stays loud when the secret is missing', () => {
    delete process.env.ACCESS_LINK_SECRET
    // Deliberate: a missing secret is a deployment fault, and the direct
    // caller of this function is expected to want to know.
    expect(() => createAccessToken(claims)).toThrow(/ACCESS_LINK_SECRET/)
  })

  /* The regression that made the bug possible: the secret used to be read
     once at module load, so a module imported before the environment was
     populated signed with '' forever -- and no test could set it. */
  it('reads the secret at call time, not at import time', () => {
    delete process.env.ACCESS_LINK_SECRET
    expect(tryCreateAccessToken(claims).ok).toBe(false)
    process.env.ACCESS_LINK_SECRET = 'arrived-late'
    expect(tryCreateAccessToken(claims).ok).toBe(true)
  })
})

describe('the rename from ACCESS_TOKEN_SECRET', () => {
  afterEach(() => {
    delete process.env.ACCESS_TOKEN_SECRET
  })

  it('still accepts the old name, so a deployed environment does not break', () => {
    delete process.env.ACCESS_LINK_SECRET
    process.env.ACCESS_TOKEN_SECRET = 'set-under-the-old-name'
    const r = tryCreateAccessToken(claims)
    expect(r.ok).toBe(true)
  })

  it('prefers the new name when both are set', () => {
    process.env.ACCESS_LINK_SECRET = 'new'
    const { token } = createAccessToken(claims)
    process.env.ACCESS_TOKEN_SECRET = 'old'
    // Verified under the new name only: if the old one won, this would fail.
    expect(verifyAccessToken(token)).not.toBeNull()
  })
})

describe('tryCreateAccessToken', () => {
  it('returns a failure instead of throwing when unconfigured', () => {
    delete process.env.ACCESS_LINK_SECRET
    /* This is the whole point. Thrown inside the payment webhook, this
       500'd the POST after the purchase row was already written: Creem
       retried, hit the idempotency check, got "ok (duplicate)" and stopped.
       The order sat at 'pending' forever, the buyer got no link, and nothing
       anywhere recorded a failure. */
    expect(() => tryCreateAccessToken(claims)).not.toThrow()
    expect(tryCreateAccessToken(claims)).toEqual({
      ok: false,
      reason: 'not-configured',
    })
  })

  it('returns the same token the throwing version would', () => {
    const r = tryCreateAccessToken(claims)
    expect(r.ok).toBe(true)
    expect(verifyAccessToken(r.token)).toMatchObject({ ...claims, jti: r.jti })
  })
})

describe('verifyAccessToken', () => {
  it('rejects a token signed with a different secret', () => {
    const { token } = createAccessToken(claims)
    process.env.ACCESS_LINK_SECRET = 'a-different-secret'
    expect(verifyAccessToken(token)).toBeNull()
  })

  it('rejects an expired token', () => {
    const { token } = createAccessToken({ ...claims, ttlMs: -1 })
    expect(verifyAccessToken(token)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const { token } = createAccessToken(claims)
    const [body, sig] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ ...claims, jti: 'x', exp: Date.now() + 10000 })
    ).toString('base64url')
    expect(verifyAccessToken(`${forged}.${sig}`)).toBeNull()
    expect(verifyAccessToken(`${body}.${sig}x`)).toBeNull()
  })

  it('rejects everything when the secret is missing, rather than accepting anything', () => {
    const { token } = createAccessToken(claims)
    delete process.env.ACCESS_LINK_SECRET
    // An empty HMAC key is still a valid key. Without this guard, a
    // misconfigured deployment would happily verify tokens it had signed
    // with the empty string.
    expect(verifyAccessToken(token)).toBeNull()
  })
})

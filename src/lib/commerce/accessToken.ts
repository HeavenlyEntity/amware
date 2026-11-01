import crypto from 'crypto'

export type AccessTokenPayload = {
  /** Null on a link minted for a license that has no purchase yet, such as a
      new Enterprise license; `licenseId` then names it. */
  purchaseId: string | number | null
  /** The license this link opens. Absent on links minted before licenses
      existed, which reach their license through `purchaseId`. */
  licenseId?: string | number
  itemType: 'product' | 'course' | 'service'
  itemId: string | number
  jti: string
  exp: number // epoch ms
}

/*
 * ACCESS_LINK_SECRET signs OUR OWN access links -- the `/access/<token>` URL
 * emailed to someone who buys a digital download. It is an HMAC key we
 * generate, not a credential issued by anyone.
 *
 * It has nothing to do with GitHub. GITHUB_TOKEN is the GitHub one, and
 * anything GitHub-related carries that prefix. The old name here was
 * ACCESS_TOKEN_SECRET, which read like a third-party access token and sat
 * one line away from GITHUB_TOKEN in .env.example -- so it is still accepted
 * for environments that have it, with a warning, and should be renamed.
 *
 * Generate one with:  openssl rand -hex 32
 *
 * Read at call time, not at module load. A module-level capture binds
 * whatever the environment happened to hold the first time this file was
 * imported, which in a serverless runtime is not always after the
 * environment is populated -- and it makes the value untestable.
 */
let warnedLegacy = false
const secret = () => {
  const current = process.env.ACCESS_LINK_SECRET
  if (current) return current
  const legacy = process.env.ACCESS_TOKEN_SECRET
  if (legacy && !warnedLegacy) {
    warnedLegacy = true
    console.warn(
      'ACCESS_TOKEN_SECRET is the old name for ACCESS_LINK_SECRET. It still ' +
        'works, but rename it: it signs our own download links and is not a ' +
        'GitHub token, which the old name implied.'
    )
  }
  return legacy || ''
}
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest())
}

export function createAccessToken(
  input: Omit<AccessTokenPayload, 'jti' | 'exp'> & { ttlMs?: number }
): { token: string; jti: string; exp: number } {
  if (!secret()) throw new Error('ACCESS_LINK_SECRET is not configured')
  const jti = crypto.randomUUID()
  const exp = Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS)
  const payload: AccessTokenPayload = {
    purchaseId: input.purchaseId,
    ...(input.licenseId != null ? { licenseId: input.licenseId } : {}),
    itemType: input.itemType,
    itemId: input.itemId,
    jti,
    exp,
  }
  const body = b64url(JSON.stringify(payload))
  const token = `${body}.${sign(body)}`
  return { token, jti, exp }
}

export type AccessTokenFailure =
  /** ACCESS_LINK_SECRET is unset, so nothing can be signed at all. */
  | 'not-configured'
  /** Signing itself failed. Should not happen; recorded rather than guessed. */
  | 'unsignable'

export type AccessTokenResult =
  | { ok: true; token: string; jti: string; exp: number }
  | { ok: false; reason: AccessTokenFailure }

/* The non-throwing variant, for the two places that must not throw.
 *
 * `createAccessToken` throwing is right: a missing secret is a deployment
 * fault and should be loud. But it was called bare inside the payment
 * webhook, where throwing meant the POST 500'd after the purchase row had
 * already been written -- so Creem retried, hit the idempotency check,
 * got "ok (duplicate)", and stopped. The order sat at fulfillmentStatus
 * 'pending' forever and the buyer never received their link, with no failure
 * recorded anywhere. A misconfiguration that hides itself is worse than one
 * that shouts.
 *
 * Same shape as inviteToRepo: the caller decides what a failure means,
 * because only the caller knows whether money has changed hands.
 */
export function tryCreateAccessToken(
  input: Omit<AccessTokenPayload, 'jti' | 'exp'> & { ttlMs?: number }
): AccessTokenResult {
  if (!secret()) return { ok: false, reason: 'not-configured' }
  try {
    return { ok: true, ...createAccessToken(input) }
  } catch {
    return { ok: false, reason: 'unsignable' }
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  if (!token || !secret()) return null
  const dotIdx = token.indexOf('.')
  if (dotIdx === -1) return null
  const body = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  if (!body || !sig || sig.includes('.')) return null
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let payload: AccessTokenPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null
  return payload
}

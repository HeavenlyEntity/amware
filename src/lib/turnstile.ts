import { APIError } from 'payload'

export async function verifyContactToken(token: string | null) {
  if (!token || token.length > 2048) {
    throw new APIError('Please complete the security check and try again.', 400)
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    throw new APIError(
      'Security verification is unavailable. Please try again later.',
      503
    )
  }

  let result: { success?: boolean; hostname?: string; action?: string }
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      }
    )
    if (!response.ok) throw new Error('Verification service unavailable')
    result = await response.json()
  } catch {
    throw new APIError(
      'Security verification is unavailable. Please try again later.',
      503
    )
  }

  const hostnames = (
    process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'amware.dev,www.amware.dev'
  )
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
  if (
    result?.success !== true ||
    result.action !== 'contact' ||
    !hostnames.includes(result.hostname ?? '')
  ) {
    throw new APIError(
      'Security verification failed. Please try the security check again.',
      400
    )
  }
}

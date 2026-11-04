import crypto from 'crypto'

const API_KEY = process.env.CREEM_API_KEY || ''
const WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || ''

// Creem routes by host: a `creem_test_…` key only works against
// test-api.creem.io, and a live key only against api.creem.io. Derive the base
// URL from the key prefix so switching environments is just swapping the key —
// no separate URL to keep in sync. An explicit CREEM_API_URL still overrides.
const DEFAULT_API_URL = API_KEY.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io'
const API_URL = (() => {
  const u = new URL(process.env.CREEM_API_URL || DEFAULT_API_URL)
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('CREEM_API_URL must be http(s)')
  }
  return u.origin
})()

/* Carries Creem's status so a caller can tell "this product is not in the
   environment this key belongs to" (404) from everything else. That one is
   configuration drift -- a test-mode id against a live key, or the reverse
   -- and it is the failure a buyer is most likely to meet. */
export class CreemError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'CreemError'
    this.status = status
  }
}

export type CreateCheckoutArgs = {
  productId: string
  requestId: string
  successUrl: string
  email?: string
  metadata?: Record<string, string | number>
}

export async function createCheckoutSession(
  args: CreateCheckoutArgs
): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_URL}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      product_id: args.productId,
      request_id: args.requestId,
      success_url: args.successUrl,
      ...(args.email ? { customer: { email: args.email } } : {}),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const safe =
      process.env.NODE_ENV === 'production' ? '' : detail.slice(0, 200)
    throw new CreemError(
      `Creem checkout failed (${res.status})${safe ? ': ' + safe : ''}`,
      res.status
    )
  }
  const data = await res.json()
  const checkoutUrl = data.checkout_url || data.checkoutUrl
  if (!checkoutUrl) throw new Error('Creem response missing checkout_url')
  return { checkoutUrl }
}

export type CreemProduct = {
  id: string
  /** Price in minor units (cents). 1000 = $10.00. */
  price: number
  currency: string
  billingType: 'onetime' | 'recurring' | string
  billingPeriod?: string
  name?: string
  status?: string
}

// GET /v1/products?product_id=… — retrieve a single product for price sync.
export async function retrieveProduct(
  productId: string
): Promise<CreemProduct> {
  if (!API_KEY) throw new Error('CREEM_API_KEY is not configured')
  const url = new URL(`${API_URL}/v1/products`)
  url.searchParams.set('product_id', productId)

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-key': API_KEY },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const safe =
      process.env.NODE_ENV === 'production' ? '' : detail.slice(0, 200)
    throw new Error(
      `Creem product lookup failed (${res.status})${safe ? ': ' + safe : ''}`
    )
  }
  const data = await res.json()
  if (typeof data?.price !== 'number') {
    throw new Error('Creem product response missing a numeric price')
  }
  return {
    id: data.id,
    price: data.price,
    currency: data.currency,
    billingType: data.billing_type,
    billingPeriod: data.billing_period,
    name: data.name,
    status: data.status,
  }
}

const LICENSE_TIMEOUT_MS = 8000

/* The two license calls run inside a server action a person is waiting on, so
   they are bounded, and every failure comes back as a CreemError. The caller
   then has one thing to catch, and a dropped connection (status 0) is told
   apart from Creem refusing (its own status). The key never appears in a
   message: the detail is Creem's body, and only outside production. */
async function licenseCall(
  path: '/v1/licenses/activate' | '/v1/licenses/deactivate',
  body: Record<string, string>,
  timeoutMs: number = LICENSE_TIMEOUT_MS
): Promise<Response> {
  if (!API_KEY) throw new CreemError('CREEM_API_KEY is not configured', 0)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new CreemError('Creem license call could not reach Creem', 0)
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const safe =
      process.env.NODE_ENV === 'production' ? '' : detail.slice(0, 200)
    throw new CreemError(
      `Creem license call failed (${res.status})${safe ? ': ' + safe : ''}`,
      res.status
    )
  }
  return res
}

// POST /v1/licenses/activate — Creem does not merge repeat activations, so a
// caller checks its own table first. `instanceName` is the NetSuite account.
// `timeoutMs` shortens the wait for a caller with a tighter deadline, such as
// the report route, whose client gives up at 3 seconds. Left out, it is 8.
export async function activateLicense(args: {
  key: string
  instanceName: string
  timeoutMs?: number
}): Promise<{ instanceId: string }> {
  const res = await licenseCall(
    '/v1/licenses/activate',
    {
      key: args.key,
      instance_name: args.instanceName,
    },
    args.timeoutMs
  )
  const data = await res.json().catch(() => null)
  const instanceId = data?.instance?.id
  if (typeof instanceId !== 'string' || !instanceId) {
    throw new CreemError('Creem activation response missing instance id', 200)
  }
  return { instanceId }
}

// POST /v1/licenses/deactivate — frees one activation, by the instance id
// that activate returned.
export async function deactivateLicense(args: {
  key: string
  instanceId: string
}): Promise<void> {
  await licenseCall('/v1/licenses/deactivate', {
    key: args.key,
    instance_id: args.instanceId,
  })
}

// HMAC-SHA256 of the raw request body, compared to the `creem-signature` header.
export function verifyCreemSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature || !WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

import { unwrapWebhook } from '@whop/sdk/helpers'
import { whopEnvironment } from './whopEnv'

/*
 * Whop, for the engagements.
 *
 * Whop takes the deposit that starts a retainer; Creem keeps the kits and
 * downloads. The two never meet: a service carries a `whopPlanId`, the
 * checkout embed mounts from that plan id alone, and Whop tells us about
 * the sale on its webhook. There is no server call before checkout and no
 * session to create -- the plan is the product, and the plan id in the
 * payment payload is how a sale finds its service again.
 *
 * `whopRequest` is only used by the setup simulation (creating the product,
 * the plans and the webhook) and by nothing at request time, so a missing
 * WHOP_API_KEY cannot break a page. The webhook needs only
 * WHOP_WEBHOOK_SECRET. Which Whop -- live or sandbox -- is decided by
 * whopEnv.ts; the key and the secret must belong to the same one.
 */

/* The live account. The sandbox account has its own id; the setup resolves
   it from the key rather than hardcoding a second one here. */
export const WHOP_ACCOUNT_ID = 'biz_PGSOCOwANQSket'

export function whopApiUrl(): string {
  return whopEnvironment() === 'sandbox'
    ? 'https://sandbox-api.whop.com/api/v1'
    : 'https://api.whop.com/api/v1'
}

export class WhopError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'WhopError'
    this.status = status
  }
}

export async function whopRequest<T = unknown>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const key = process.env.WHOP_API_KEY
  if (!key) throw new WhopError('WHOP_API_KEY is not configured', 0)
  const res = await fetch(`${whopApiUrl()}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new WhopError(
      `Whop ${init.method || 'GET'} ${path} failed (${res.status})${
        detail ? ': ' + detail.slice(0, 300) : ''
      }`,
      res.status
    )
  }
  return (await res.json()) as T
}

/* The fields of a Payment this code reads. The full object is much larger;
   see Whop's Payment schema. `total` is what the customer paid, in major
   units, before Whop's fees. */
export type WhopPayment = {
  id: string
  status?: string | null
  total?: number | null
  usd_total?: number | null
  currency?: string | null
  paid_at?: string | null
  plan?: {
    id?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  product?: { id?: string | null; title?: string | null } | null
  user?: {
    id?: string | null
    email?: string | null
    name?: string | null
    username?: string | null
  } | null
  membership?: { id?: string | null; license_key?: string | null } | null
  /* The shape @whop/sdk@1.1.4's Payment actually has: the membership as a
     flat id. Read alongside the nested one above, which older payloads
     carry, because revocation finds a purchase by this id. */
  membership_id?: string | null
  metadata?: Record<string, unknown> | null
  checkout_configuration_id?: string | null
}

export type WhopEvent = {
  id: string
  type: string
  api_version?: string
  timestamp?: string
  account_id?: string
  company_id?: string
  data: WhopPayment | Record<string, unknown>
}

/* Standard Webhooks: HMAC-SHA256 over `{id}.{timestamp}.{body}` with the
   `ws_…` secret, base64 in the `webhook-signature` header, and a five-minute
   tolerance on the timestamp. Whop's own helper does the check; this only
   turns its throw into a null so the route can answer 401 without a try
   block of its own. Never throws, never parses the body before verifying. */
export function verifyWhopWebhook(
  raw: string,
  headers: Record<string, string>
): WhopEvent | null {
  const key = process.env.WHOP_WEBHOOK_SECRET
  if (!key) return null
  try {
    return unwrapWebhook(raw, { headers, key }) as WhopEvent
  } catch {
    return null
  }
}

/* One custom-field answer off a payment.
 *
 * Whop's own example names the field "Discord username", so a plain text
 * field holding a handle is the documented use, not a trick. What is not
 * documented is the exact path the answers arrive on, which is why
 * docs/whop-custom-fields.md holds a captured payload.
 *
 * This reads every shape that capture could plausibly take rather than
 * betting the kit's whole delivery path on one of them. The cost of
 * looking in four places is nothing; the cost of guessing wrong is a
 * buyer who paid and got no repository.
 *
 * Matching is case-insensitive and trimmed because the field name is
 * typed into a dashboard by a human, and "Github username" on the plan
 * must not silently mean no invitation.
 */
export function customFieldAnswer(
  payment: Record<string, any> | null | undefined,
  name: string
): string | null {
  if (!payment) return null
  const wanted = name.trim().toLowerCase()
  const pools = [
    payment.custom_field_responses,
    payment.custom_fields,
    payment.metadata?.custom_fields,
    payment.checkout_configuration?.custom_field_responses,
  ]
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue
    const hit = pool.find(
      (f) =>
        typeof f?.name === 'string' && f.name.trim().toLowerCase() === wanted
    )
    const value = hit?.value ?? hit?.answer ?? hit?.response
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/* The reference our checkout component minted and handed to Whop as order
 * metadata. It is how a return page finds the purchase without trusting
 * anything Whop puts in the URL. Client-minted, so it proves nothing on
 * its own: it is a lookup handle, never an authorisation. Anything that is
 * not a UUID is dropped rather than stored. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function checkoutRefFrom(
  payment: { metadata?: Record<string, unknown> | null } | null | undefined
): string | null {
  const ref = payment?.metadata?.checkout_ref
  return typeof ref === 'string' && UUID.test(ref) ? ref.toLowerCase() : null
}

/* The same reference, read back off the URL a buyer's browser returns with
 * rather than off payment metadata. Client-minted, so it is validated just
 * as strictly and by the same pattern -- canonical UUID only, lower-cased --
 * and anything else is null, exactly like an absent one, rather than ever
 * reaching a query. */
export function validCheckoutRef(value: unknown): string | null {
  return typeof value === 'string' && UUID.test(value)
    ? value.toLowerCase()
    : null
}

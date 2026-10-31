import { planId, type WhopEnvironment } from './whopEnv'

/*
 * Which checkout sells a product, decided in one place.
 *
 * Kits sell through Whop, digital products through Creem. The product page,
 * the catalogue card and the checkout action all ask here, so a page can
 * never show a buy button the server would refuse, or the reverse.
 *
 * This file is imported by a client component, so it stays free of server
 * imports: only `planId`, which is itself client-safe.
 *
 * A Creem id with nothing to deliver is not on sale. Taking the money first
 * and finding there is no file second is the failure this guards against.
 */
export type CheckoutRoute = 'whop' | 'creem'

type Sellable = {
  type?: string | null
  whopPlanId?: string | null
  whopSandboxPlanId?: string | null
  creemProductId?: string | null
  downloadFile?: unknown
  downloadUrl?: string | null
}

export function checkoutRoute(
  product: Sellable | null | undefined,
  env?: WhopEnvironment
): CheckoutRoute | null {
  if (!product) return null
  if (product.type === 'digital') {
    const deliverable = product.downloadFile || product.downloadUrl
    return product.creemProductId && deliverable ? 'creem' : null
  }
  return planId(product, env) ? 'whop' : null
}

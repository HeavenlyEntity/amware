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
 * A digital product needs only its Creem id. The paid file is attached to the
 * product in Creem's dashboard, and Creem delivers it through its purchase
 * email and customer portal, so nothing on this side can say whether a file
 * is there. Confirm that in Creem before publishing a product.
 */
export type CheckoutRoute = 'whop' | 'creem'

type Sellable = {
  type?: string | null
  whopPlanId?: string | null
  whopSandboxPlanId?: string | null
  creemProductId?: string | null
}

export function checkoutRoute(
  product: Sellable | null | undefined,
  env?: WhopEnvironment
): CheckoutRoute | null {
  if (!product) return null
  if (product.type === 'digital') {
    return product.creemProductId ? 'creem' : null
  }
  return planId(product, env) ? 'whop' : null
}

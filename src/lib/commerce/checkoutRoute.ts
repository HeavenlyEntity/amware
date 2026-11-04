import { planId } from './whopEnv'
import { creemProductIdFor, type CreemEnvironment } from './creemEnv'

/*
 * Which checkout sells a product, decided in one place.
 *
 * Kits and digital products sell through Creem; anything else (services,
 * courses) keeps its Whop plan. The product page, the catalogue card and the
 * checkout action all ask here, so a page can never show a buy button the
 * server would refuse, or the reverse.
 *
 * `env` is a Creem environment. It picks the live or the sandbox product id
 * for kits and digital products, and defaults to the current one. The Whop
 * branch ignores it and reads its own environment, because the two switches
 * are independent: a kit left with only a sandbox id is off sale in
 * production, and a service's Whop plan is untouched by Creem's test mode.
 *
 * This file is imported by a client component, so it stays free of server
 * imports: only `planId` and `creemProductIdFor`, which are client-safe.
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
  creemSandboxProductId?: string | null
}

export function checkoutRoute(
  product: Sellable | null | undefined,
  env?: CreemEnvironment
): CheckoutRoute | null {
  if (!product) return null
  if (product.type === 'digital' || product.type === 'boilerplate') {
    return creemProductIdFor(product, env) ? 'creem' : null
  }
  return planId(product) ? 'whop' : null
}

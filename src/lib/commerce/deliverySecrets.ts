/*
 * What a digital sale needs in the environment before any money is taken.
 *
 * Delivery is the signed access link the Creem webhook emails. If
 * ACCESS_LINK_SECRET is unset the webhook cannot sign it: the order is
 * recorded as failed and nothing is sent. If CREEM_WEBHOOK_SECRET is unset
 * every webhook is rejected with a 401, so the sale is never recorded at all.
 * Either way the buyer has paid for a download that cannot arrive.
 *
 * Lives outside digitalCheckout.ts because a 'use server' module may only
 * export async functions. Read at call time, as accessToken.ts does, and with
 * the same legacy fallback it still honours.
 */
export function assertDigitalDeliveryConfigured(): void {
  if (!process.env.ACCESS_LINK_SECRET && !process.env.ACCESS_TOKEN_SECRET) {
    // No signing secret means no way to deliver. Fail loudly rather than
    // taking money for a download that cannot be handed over.
    throw new Error('ACCESS_LINK_SECRET is required to deliver a purchase')
  }
  if (!process.env.CREEM_WEBHOOK_SECRET) {
    // Without it every Creem webhook is rejected, so a paid order would never
    // be recorded or delivered.
    throw new Error('CREEM_WEBHOOK_SECRET is required to record a purchase')
  }
}

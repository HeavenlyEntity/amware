'use server'

import crypto from 'crypto'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '../getPayloadClient'
import { CreemError, createCheckoutSession } from './creem'
import { checkoutRoute } from './checkoutRoute'
import { assertDigitalDeliveryConfigured } from './deliverySecrets'

/* A 'use server' module may only export async functions, so the initial state
 * lives with the component that owns it. Types are erased, so the type export
 * is fine. */
export type DigitalCheckoutState = {
  error: { message: string } | null
}

const NOT_ON_SALE: DigitalCheckoutState = {
  error: {
    message:
      'This item is not on sale yet. Nothing has been charged. Check back shortly or get in touch.',
  },
}

/*
 * Digital products sell through Creem; kits sell through Whop and never reach
 * this action.
 *
 * Returns instead of throwing for the one failure a buyer can see: an item
 * that is not purchasable yet. Throwing sent that to the Next error boundary,
 * which costs the buyer the page they were on and offers no way back.
 *
 * Everything else still throws. A missing NEXT_PUBLIC_SITE_URL or a Creem
 * failure is not the buyer's to fix, and swallowing it into a polite message
 * would hide a fault that needs to be seen.
 *
 * Imports are relative, not `@/`, so the engine test project can load this
 * module without an alias.
 */
export async function startDigitalCheckout(
  _prevState: DigitalCheckoutState,
  formData: FormData
): Promise<DigitalCheckoutState> {
  const slug = String(formData.get('slug') || '')
  // Only reachable if the hidden input was stripped or tampered with, so this
  // is a fault rather than a buyer mistake.
  if (!slug) throw new Error('Invalid checkout request')

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 0,
    limit: 1,
  })
  const item = docs[0]
  // The same gate the product page used to show the button, so a stale page
  // cannot buy what the server would not have offered.
  if (!item || checkoutRoute(item) !== 'creem' || !item.creemProductId) {
    return NOT_ON_SALE
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!site) throw new Error('NEXT_PUBLIC_SITE_URL is not configured')

  // Before Creem is called: a charge that cannot be delivered is worse than
  // an error page.
  assertDigitalDeliveryConfigured()

  const requestId = crypto.randomUUID()

  /* The success page gets the request id, unsigned. It uses it for one thing:
     to report the sale to the ads pixel with its real amount. It grants
     nothing -- delivery is the signed access link the webhook emails -- so it
     needs no signature, and a guessed id (a UUID) would reveal only that a
     sale of some amount happened. */
  const successUrl = `${site}/checkout/success?r=${requestId}`

  let checkoutUrl: string
  try {
    ;({ checkoutUrl } = await createCheckoutSession({
      productId: item.creemProductId,
      requestId,
      successUrl,
      metadata: { itemType: 'product', itemId: String(item.id), slug },
    }))
  } catch (err) {
    /* Creem not knowing the product is the same situation as the CMS not
       having one: the item cannot be bought right now, and nothing has been
       charged. It happens when the product id and the API key belong to
       different Creem modes -- a test id in production, say -- which is a
       configuration slip, not a fault the buyer can do anything about. It is
       still logged loudly. Every other Creem failure keeps throwing. */
    if (err instanceof CreemError && err.status === 404) {
      console.error('Creem does not know this product in the current mode', {
        slug,
        creemProductId: item.creemProductId,
      })
      return NOT_ON_SALE
    }
    throw err
  }

  redirect(checkoutUrl) // external redirect to Creem's hosted page
}

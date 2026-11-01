'use server'

import crypto from 'crypto'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '../getPayloadClient'
import { CreemError, createCheckoutSession } from './creem'
import { checkoutRoute } from './checkoutRoute'
import { creemProductIdFor } from './creemEnv'
import { onboardingPath } from './onboardingLink'

/* A 'use server' module may only export async functions, so the initial state
 * lives with the component that owns it. Types are erased, so the type export
 * is fine. */
export type CreemCheckoutState = {
  error: { message: string } | null
}

const NOT_ON_SALE: CreemCheckoutState = {
  error: {
    message:
      'This item is not on sale yet. Nothing has been charged. Check back shortly or get in touch.',
  },
}

/*
 * Kits and digital products both sell through Creem, and both start here.
 * Services keep Whop and never reach this action.
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
export async function startCreemCheckout(
  _prevState: CreemCheckoutState,
  formData: FormData
): Promise<CreemCheckoutState> {
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
  const productId = creemProductIdFor(item)
  if (!item || checkoutRoute(item) !== 'creem' || !productId) {
    return NOT_ON_SALE
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!site) throw new Error('NEXT_PUBLIC_SITE_URL is not configured')

  // Before Creem is called: without this secret every webhook is rejected, so
  // a paid order would never be recorded here.
  if (!process.env.CREEM_WEBHOOK_SECRET) {
    throw new Error('CREEM_WEBHOOK_SECRET is required to record a purchase')
  }

  const requestId = crypto.randomUUID()

  /* A kit buyer lands on the onboarding page, where the signed link proves
     they paid and collects the GitHub username for the repo invite. The link
     is signed with our own secret. Without it the buyer would pay and land on
     a page that cannot recognise them, so this refuses before Creem is
     called, as the missing webhook secret does above. */
  let successUrl: string
  if (item.type === 'boilerplate') {
    const path = onboardingPath(requestId)
    if (!path) {
      throw new Error('ACCESS_LINK_SECRET is required to sell a kit')
    }
    successUrl = `${site}${path}`
  } else {
    /* A digital buyer gets the request id, unsigned. The success page uses it
       for one thing: to report the sale to the ads pixel with its real
       amount. It grants nothing -- Creem delivers the file through its own
       email and portal -- so it needs no signature, and a guessed id (a UUID)
       would reveal only that a sale of some amount happened. */
    successUrl = `${site}/checkout/success?r=${requestId}`
  }

  let checkoutUrl: string
  try {
    ;({ checkoutUrl } = await createCheckoutSession({
      productId,
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
        creemProductId: productId,
      })
      return NOT_ON_SALE
    }
    throw err
  }

  redirect(checkoutUrl) // external redirect to Creem's hosted page
}

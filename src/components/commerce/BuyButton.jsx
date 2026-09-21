'use client'

import Script from 'next/script'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Checkout is Whop's embed now, mounted from a plan id alone.
 *
 * There is no server action any more: Creem needed one to mint a session
 * before the buyer could be sent anywhere, and Whop does not -- the plan
 * IS the product. That deletes a round trip, a signed return URL and the
 * whole "this item is not on sale yet, nothing has been charged" recovery
 * path, because a missing plan id is now visible before the press rather
 * than after it.
 *
 * This is the vanilla loader + data-attribute embed, not the
 * @whop/checkout/react component DepositCheckout uses: that component
 * renders straight to an iframe with no mount point of its own, and the
 * deposit flow's Sheet-driven UX (received state, theming, onComplete)
 * has no equivalent need here. Nothing else on the site loads
 * js.whop.com/static/checkout/loader.js, so this is the only copy, not a
 * second one.
 *
 * The GitHub username is a custom field on the plan, so it is asked
 * inside this embed, before the card. Nothing on our side collects it. */

export function BuyButton({ planId, itemType, slug, name, price }) {
  if (!planId) {
    return (
      <p
        role="status"
        className="mt-8 text-sm text-zinc-600 dark:text-zinc-400"
      >
        This item is not on sale yet. Nothing has been charged. Check back
        shortly or get in touch.
      </p>
    )
  }

  /* Fired as the embed opens rather than on a redirect: there is no longer
     a navigation for the event to outlive. No event id -- each open is an
     attempt, and Whop should see how many attempts a sale takes. */
  const reportCheckout = () =>
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: itemType,
      content_id: slug,
      content_name: name,
    })

  return (
    <div className="mt-8">
      <Script
        src="https://js.whop.com/static/checkout/loader.js"
        strategy="lazyOnload"
        onReady={reportCheckout}
      />
      <div data-whop-checkout-plan-id={planId} />
    </div>
  )
}

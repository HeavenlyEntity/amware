'use client'

import { useEffect } from 'react'
import { WhopCheckout } from './WhopCheckout'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Kit checkout, on the one Whop Elements checkout the deposit flow also
 * uses. The plan is the product, so there is no session to mint. The
 * GitHub username is a custom field on the plan, asked inside the checkout
 * before the card.
 *
 * Elements has no completion callback: a finished checkout redirects the
 * whole browser tab to the return URL, so WhopCheckout owns the whole
 * post-payment hand-off -- minting the reference, mounting only once the
 * origin is known, and sending the buyer back to onboarding. This
 * component never navigates anywhere itself any more.
 */

const ONBOARDING = '/checkout/onboarding'

export function BuyButton({ planId, itemType, slug, name, price }) {
  /* Fired once when the checkout is on screen. No event id: each open is an
     attempt, and Whop should see how many attempts a sale takes. */
  useEffect(() => {
    if (!planId) return
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: itemType,
      content_id: slug,
      content_name: name,
    })
  }, [planId, itemType, slug, name, price])

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

  return (
    <WhopCheckout planId={planId} returnPath={ONBOARDING} className="mt-8" />
  )
}

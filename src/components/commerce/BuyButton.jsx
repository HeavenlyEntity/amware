'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Kit checkout, on the same Whop embed the deposit flow already uses.
 *
 * The plan is the product, so there is no session to mint. The GitHub
 * username is a custom field on the plan, asked inside the embed before
 * the card.
 *
 * The earlier version mounted Whop's bare loader script, which has no
 * completion callback: a buyer finished paying and the page never moved.
 * onComplete is what carries them to onboarding, where the licence key,
 * the repo and the next step live. returnUrl covers the payment methods
 * that leave the page (bank redirects, some wallets) and come back.
 *
 * The receipt id is passed along so onboarding can find the order. If
 * Whop gives none, the buyer still lands there: the page shows a
 * thank-you and the email carries the rest. */

const ONBOARDING = '/checkout/onboarding'

export function BuyButton({ planId, itemType, slug, name, price }) {
  const router = useRouter()

  /* Fired once when the embed is on screen. No event id: each open is an
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

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''

  return (
    <div className="mt-8">
      <WhopCheckoutEmbed
        planId={planId}
        returnUrl={`${site}${ONBOARDING}`}
        onComplete={(_plan, receiptId) =>
          router.push(
            receiptId
              ? `${ONBOARDING}?payment_id=${encodeURIComponent(receiptId)}`
              : ONBOARDING
          )
        }
      />
    </div>
  )
}

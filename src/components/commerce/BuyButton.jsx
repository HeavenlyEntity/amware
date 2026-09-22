'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { whopEnvironment } from '@/lib/commerce/whopEnv'
import { useMounted } from '@/hooks/use-client-value'

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
 * thank-you and the email carries the rest.
 *
 * environment is the same source DepositCheckout reads: whichever Whop
 * world planId already resolved this plan id from. Defaulting to
 * production would send a sandbox plan id to Whop's live API and fail.
 *
 * origin has to be window.location, not an env var, so it is always
 * absolute -- and window does not exist during server rendering. useMounted
 * is the codebase's own answer to that: a useState-plus-effect here would
 * trip react-hooks/set-state-in-effect, the same reason use-client-value.js
 * exists. The embed waits for the mounted flag rather than ever mounting
 * with a relative returnUrl -- the same guard DepositCheckout gets from
 * reading window.location.origin only after its sheet is clicked open. */

const ONBOARDING = '/checkout/onboarding'

export function BuyButton({ planId, itemType, slug, name, price }) {
  const router = useRouter()
  const environment = whopEnvironment()
  const mounted = useMounted()
  const origin = mounted ? window.location.origin : ''

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

  return (
    <div className="mt-8">
      {origin && (
        <WhopCheckoutEmbed
          planId={planId}
          environment={environment}
          returnUrl={`${origin}${ONBOARDING}`}
          onComplete={(_plan, receiptId) =>
            router.push(
              receiptId
                ? `${ONBOARDING}?payment_id=${encodeURIComponent(receiptId)}`
                : ONBOARDING
            )
          }
        />
      )}
    </div>
  )
}

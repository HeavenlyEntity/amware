'use client'

import { useActionState, useEffect, useState } from 'react'
import { startCreemCheckout } from '@/lib/commerce/creemCheckout'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { ChevronCta } from '@/components/site/ChevronCta'

/* Checkout for kits and digital products, on Creem's hosted page. BuyButton
 * and Whop keep the products that still sell there, and the product page
 * chooses between them with checkoutRoute.
 *
 * The action redirects the whole tab to Creem on success, so this component
 * only ever sees the failure state. begin_checkout fires on submit, with the
 * same fields BuyButton sends: Whop sends with keepalive, so the request
 * outlives the redirect.
 *
 * The knob says where it is: a spinner while the action runs, and a check
 * once the browser has actually started leaving for Creem. That moment has
 * no callback, so it is read off `beforeunload`, listened for only while the
 * action is pending. A page restored from the back-forward cache is not
 * leaving any more, so `pageshow` takes the check back.
 */

export function CreemBuyButton({
  slug,
  name,
  price,
  className = 'mt-8',
  children = 'Buy now',
}) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(startCreemCheckout, {
    error: null,
  })
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!isPending) return undefined
    const onLeave = () => setLeaving(true)
    const onShow = (event) => {
      if (event.persisted) setLeaving(false)
    }
    window.addEventListener('beforeunload', onLeave)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      window.removeEventListener('pageshow', onShow)
    }
  }, [isPending])

  const redirecting = isPending && leaving

  const track = () =>
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: 'product',
      content_id: slug,
      content_name: name,
    })

  return (
    <form action={formAction} onSubmit={track} className={className}>
      <input type="hidden" name="slug" value={slug} />
      {state.error && (
        <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">
          {state.error.message}
        </p>
      )}
      <ChevronCta
        type="submit"
        full
        disabled={isPending}
        aria-busy={isPending || undefined}
        state={redirecting ? 'done' : isPending ? 'pending' : 'idle'}
      >
        {redirecting
          ? 'Taking you to Creem'
          : isPending
          ? 'Opening checkout…'
          : children}
      </ChevronCta>
    </form>
  )
}

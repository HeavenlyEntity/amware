'use client'

import { useActionState } from 'react'
import { startDigitalCheckout } from '@/lib/commerce/digitalCheckout'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Digital product checkout, on Creem's hosted page. Kits use BuyButton and
 * Whop; this is the other half of the split, and the product page chooses
 * between them with checkoutRoute.
 *
 * The action redirects the whole tab to Creem on success, so this component
 * only ever sees the failure state. begin_checkout fires on submit, with the
 * same fields BuyButton sends: Whop sends with keepalive, so the request
 * outlives the redirect.
 */

export function DigitalBuyButton({
  slug,
  name,
  price,
  className = 'mt-8',
  children = 'Buy now',
}) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(startDigitalCheckout, {
    error: null,
  })

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
      <button type="submit" className="amw-cta" disabled={isPending}>
        {isPending ? 'Opening checkout…' : children}
      </button>
    </form>
  )
}

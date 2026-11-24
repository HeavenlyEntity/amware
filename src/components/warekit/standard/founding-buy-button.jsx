'use client'

import { useActionState, useEffect, useRef } from 'react'
import { startCreemCheckout } from '@/lib/commerce/creemCheckout'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* The founding presale's buy button: the same Creem checkout as
 * CreemBuyButton, plus the one optional answer to "What are you building?".
 * The server action accepts the answer only if it is one of the listed ids,
 * so a tampered value changes nothing about the order.
 *
 * begin_checkout is reported once per submit. The button disables itself
 * while pending, but a second submit can land before that render, so a ref
 * holds the submit open until the action settles.
 */

export function FoundingBuyButton({
  slug,
  name,
  price,
  building,
  className,
  children = 'Buy now',
}) {
  const [state, formAction, isPending] = useActionState(startCreemCheckout, {
    error: null,
  })
  const submitting = useRef(false)

  useEffect(() => {
    if (!isPending) submitting.current = false
  }, [isPending])

  const onSubmit = (event) => {
    if (submitting.current) {
      event.preventDefault()
      return
    }
    submitting.current = true
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: 'product',
      content_id: slug,
      content_name: name,
    })
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className={className}>
      <input type="hidden" name="slug" value={slug} />
      {building ? (
        <input type="hidden" name="building" value={building} />
      ) : null}
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

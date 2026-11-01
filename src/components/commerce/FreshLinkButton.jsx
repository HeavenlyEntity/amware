'use client'

import { useActionState } from 'react'
import { emailFreshLicenseLink } from '@/lib/commerce/addSeat'

/* The one button on an expired license link: email a new one to the license's
 * owner. The form carries the expired link itself, which is what proves the
 * holder once had the real thing, and `upgraded` when the buyer came back
 * from a checkout, so the new link can keep saying they need not pay again.
 * The address is never in the form: the action sends to the one on the
 * license, and answers with it masked.
 *
 * The answer is wording the action chose, shown as is. A refused or failed
 * send is an alert; a sent one, or one held back by the ten-minute limit, is
 * a status. */

export function FreshLinkButton({ token, upgraded }) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(emailFreshLicenseLink, {
    status: 'idle',
    message: null,
  })
  const calm = state.status === 'sent' || state.status === 'limited'

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {upgraded && <input type="hidden" name="upgraded" value={upgraded} />}
      <button type="submit" className="amw-cta" disabled={isPending}>
        {isPending ? 'Sending' : 'Email me a new link'}
      </button>
      {state.message && (
        <p
          role={calm ? 'status' : 'alert'}
          className={`mt-3 text-sm ${
            calm
              ? 'text-zinc-700 dark:text-zinc-300'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

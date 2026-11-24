'use client'

import { useActionState } from 'react'
import { startRenewal } from '@/lib/commerce/licenseRenew'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* The license page's one way to pay for 12 more months of updates. It goes
 * straight to Creem, so the page says what the button costs before it is
 * pressed; `value` is that price, passed in by the page from the product row.
 *
 * The action redirects the whole tab to Creem on success, so this component
 * only ever sees the failure state. The form carries the signed link and
 * nothing else: the license, the price and the product are all read by the
 * action. Pressed twice, the second press is refused by the pending state.
 *
 * It is teal only when it is the thing to do (`urgent`): updates are close to
 * ending or have ended. The rest of the time it stays available but quiet.
 *
 * begin_checkout fires on submit with the fields UpgradeButton sends. */

const quietClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--amw-line-strong)] px-5 py-2.5 text-sm font-semibold leading-tight text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amw-accent-ink)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/60'

export function RenewButton({
  token,
  urgent,
  value,
  contentId,
  contentName,
  children,
}) {
  const [state, formAction, isPending] = useActionState(startRenewal, {
    error: null,
  })

  const track = () =>
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof value === 'number' ? value : undefined,
      currency: 'USD',
      content_type: 'product',
      content_id: contentId,
      content_name: contentName,
    })

  return (
    <form action={formAction} onSubmit={track}>
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">
          {state.error.message}
        </p>
      )}
      <button
        type="submit"
        className={urgent ? 'amw-cta' : quietClass}
        disabled={isPending}
      >
        {isPending ? 'Opening checkout' : children}
      </button>
    </form>
  )
}

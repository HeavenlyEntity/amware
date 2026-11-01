'use client'

import { useActionState } from 'react'
import { startUpgrade } from '@/lib/commerce/licenseUpgrade'

/* The license page's one way to pay for a higher tier. It goes straight to
 * Creem: there is no modal in between, so the page says what the button costs
 * and what stays the same before it is pressed.
 *
 * The action redirects the whole tab to Creem on success, so this component
 * only ever sees the failure state. The form carries the signed link and the
 * tier wanted, and nothing else: the license, the price and the product are
 * all read by the action. Pressed twice, the second press is refused by the
 * pending state here and by the tier check there.
 *
 * It is teal only when a limit has been reached (`urgent`). The rest of the
 * time the page's one teal button belongs to adding a developer, and this
 * stays available but quiet. */

const quietClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--amw-line-strong)] px-5 py-2.5 text-sm font-semibold leading-tight text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amw-accent-ink)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/60'

export function UpgradeButton({ token, target = 'team', urgent, children }) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(startUpgrade, {
    error: null,
  })

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="target" value={target} />
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

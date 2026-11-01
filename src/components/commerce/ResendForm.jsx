'use client'

import { useActionState } from 'react'
import { Button } from '@/components/Button'
import { resendLink } from '@/lib/commerce/resendLink'

/* The form on /access/resend. It shows one of three things after a send: the
 * same confirmation for every address, a request for an address, or a retry
 * when the database could not be read. The confirmation never says whether
 * anything was found; that is the action's rule and this only displays it.
 *
 * `intent` rides along as a hidden field so a buyer who came from "Already on
 * Pro? Pay only the difference" gets a mail about upgrading. */

export function ResendForm({ intent }) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(resendLink, {
    done: false,
    error: null,
  })

  return (
    <form action={formAction} className="mt-6">
      {intent === 'upgrade' && (
        <input type="hidden" name="intent" value="upgrade" />
      )}
      <div className="flex gap-3">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          aria-label="Email you bought with"
          placeholder="you@example.com"
          className="min-w-0 flex-auto rounded-md border border-zinc-900/10 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-teal-500 focus:outline-hidden focus:ring-4 focus:ring-teal-500/10 dark:border-zinc-700 dark:bg-zinc-700/[0.15] dark:text-zinc-200"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Sending' : 'Send link'}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.done && (
        <p
          role="status"
          className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"
        >
          If that email has a purchase, a link is on its way. It can take a few
          minutes, and it may land in spam.
        </p>
      )}
    </form>
  )
}

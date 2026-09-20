'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { claimFreeKit } from '@/lib/commerce/claim'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* The free Lite path. Same delivery as a paid kit -- a repository invitation
   -- so it reuses the same field, including the avatar card and the "this is
   my account" confirmation. A typo costs less here than in a purchase, but it
   still sends a stranger the kit.

   The result is shown on the page, not only emailed. Someone who just filled
   in a form is looking at the screen; making them go to their inbox to find
   out whether it worked is a worse experience and one more place delivery can
   fail silently. The email is the durable copy, not the receipt. */

export function ClaimFreeKit({ slug, label = 'Get free access' }) {
  // Defined here, not imported: a 'use server' module cannot export a value.
  const [state, formAction, isPending] = useActionState(claimFreeKit, {
    error: null,
    ok: null,
  })
  const usernameRef = useRef(null)
  const emailRef = useRef(null)
  const [gated, setGatedState] = useState(false)
  const setGated = useCallback((next) => setGatedState(next), [])

  const fieldError =
    state.error?.field === 'githubUsername' ? state.error.message : null
  const emailError = state.error?.field === 'email' ? state.error.message : null
  const formError =
    state.error && !state.error.field ? state.error.message : null

  useEffect(() => {
    if (emailError) emailRef.current?.focus()
    else if (fieldError) usernameRef.current?.focus()
  }, [emailError, fieldError])

  /* No money changed hands, but a kit went out and an address came in: a
     conversion by any useful definition. The server's claim key is the
     event id, so re-sending the form (which re-sends the invitation) does
     not count as a second claim. */
  const claimed = state.ok
  useEffect(() => {
    if (!claimed) return
    whopTrack(WHOP_EVENT.kitClaimed, {
      event_id: claimed.eventId,
      email: claimed.email,
      content_type: 'boilerplate',
      content_id: slug,
      content_name: claimed.itemName,
    })
  }, [claimed, slug])

  if (state.ok) {
    const { itemName, repo, username, inviteUrl, alreadyHadAccess, manual } =
      state.ok
    return (
      <div
        role="status"
        className="mt-8 rounded-md border border-zinc-900/10 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {alreadyHadAccess
            ? `@${username} already has access to ${itemName}.`
            : manual
            ? `You are on the list for ${itemName}.`
            : `${itemName} is yours.`}
        </p>

        {alreadyHadAccess ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Nothing to accept. Open{' '}
            <a
              href={`https://github.com/${repo}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {repo}
            </a>{' '}
            and clone it.
          </p>
        ) : manual ? (
          /* Said plainly rather than dressed up: the invitation did not send,
             and a person has to finish it. Promising an instant invite here
             would be the same lie the confirmation email used to tell. */
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The invitation could not be sent automatically, so I am granting
            access to <span className="font-medium">@{username}</span> by hand
            within one business day. You will get an email from GitHub when it
            goes out.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              A GitHub invitation for {repo} is waiting for @{username}.
            </p>
            {inviteUrl && (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="amw-mono border-[var(--amw-line)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent)] mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-zinc-700 transition-colors dark:text-zinc-300"
              >
                accept invitation ↗
              </a>
            )}
          </>
        )}

        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          A copy is in your inbox. GitHub sends its own email too, and that one
          does sometimes land in spam.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="slug" value={slug} />

      <div className="mb-4">
        <label
          htmlFor="claim-email"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          ref={emailRef}
          id="claim-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'claim-email-error' : undefined}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:outline-hidden focus:ring-4 dark:bg-zinc-700/[0.15] dark:text-zinc-200 ${
            emailError
              ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10 dark:border-red-500'
              : 'border-zinc-900/10 focus:border-teal-500 focus:ring-teal-500/10 dark:border-zinc-700'
          }`}
        />
        {emailError && (
          <p
            id="claim-email-error"
            role="alert"
            className="mt-2 text-sm text-red-700 dark:text-red-400"
          >
            {emailError}
          </p>
        )}
      </div>

      <GithubAccountField
        serverError={fieldError}
        inputRef={usernameRef}
        onGateChange={setGated}
      />

      {formError && (
        <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">
          {formError}
        </p>
      )}

      <button type="submit" className="amw-cta" disabled={isPending || gated}>
        {isPending
          ? 'Sending invitation…'
          : gated
          ? 'Confirm your account'
          : label}
      </button>

      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        Free. No card, no account. The kit arrives as a GitHub invitation.
      </p>
    </form>
  )
}

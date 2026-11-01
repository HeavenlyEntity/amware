'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { completeOnboarding } from '@/lib/commerce/onboarding'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'

/* The one question a Creem kit buyer is asked: which GitHub account gets the
   repository. Creem's checkout cannot collect it, so it is asked here, right
   after payment, on the page the signed link leads to.

   `requestId` and `signature` are the signed link's own `r` and `s`. They are
   posted back with the answer because the action verifies them again: this
   form being on the page proves nothing to it.

   The action works once. A second answer, from a second tab or a replayed
   link, comes back as an error and sends nothing, so the form only ever
   reports a result for the answer that was accepted.

   `initialUsername` is the account a Lite claim on the same license used. It
   is a starting value, not a shortcut: the account is looked up and the buyer
   still says "this is my account". */

export function OnboardingGithubForm({
  requestId,
  signature,
  initialUsername = '',
  retryUsername = '',
}) {
  const [state, formAction, isPending] = useActionState(completeOnboarding, {
    error: null,
    ok: null,
  })
  const usernameRef = useRef(null)
  const [gated, setGatedState] = useState(false)
  const setGated = useCallback((next) => setGatedState(next), [])

  const fieldError =
    state.error?.field === 'githubUsername' ? state.error.message : null
  const formError =
    state.error && !state.error.field ? state.error.message : null

  useEffect(() => {
    if (fieldError) usernameRef.current?.focus()
  }, [fieldError])

  if (state.ok) {
    const { repo, username, inviteUrl, alreadyHadAccess, manual } = state.ok
    return (
      <div
        role="status"
        className="mt-8 rounded-md border border-zinc-900/10 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
      >
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {alreadyHadAccess
            ? `@${username} already has access.`
            : manual
            ? `You are on the list, @${username}.`
            : 'The repository is on its way.'}
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
          /* Said plainly: the invitation did not send and a person finishes
             it. The account is kept, so this never has to be asked again. */
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

        {state.ok.licenseUrl && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Last step: add your key to <code className="amw-mono">.env</code>.{' '}
            <a href={state.ok.licenseUrl} className="font-medium underline">
              Open your license page
            </a>{' '}
            for <code className="amw-mono">WAREKIT_LICENSE_KEY</code>.
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          A copy is in your inbox. GitHub sends its own email too, and that one
          does sometimes land in spam.
        </p>
      </div>
    )
  }

  /* The invitation to an account already on file did not send. The account is
     fixed -- the action refuses any other -- so there is nothing to type, only
     the same call to repeat. The by-hand promise stays as the fallback. */
  if (retryUsername) {
    return (
      <form action={formAction} className="mt-6">
        <input type="hidden" name="r" value={requestId} />
        <input type="hidden" name="s" value={signature} />
        <input type="hidden" name="githubUsername" value={retryUsername} />

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The invitation to{' '}
          <span className="font-medium">@{retryUsername}</span> could not be
          sent just now. Your payment and your account are safe. Try again, or
          leave it with me: I will send it by hand within one business day.
        </p>

        {formError && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-700 dark:text-red-400"
          >
            {formError}
          </p>
        )}

        <button type="submit" className="amw-cta mt-4" disabled={isPending}>
          {isPending ? 'Sending invitation…' : 'Try again'}
        </button>
      </form>
    )
  }

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="r" value={requestId} />
      <input type="hidden" name="s" value={signature} />

      <GithubAccountField
        serverError={fieldError}
        inputRef={usernameRef}
        onGateChange={setGated}
        initialValue={initialUsername}
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
          : 'Send my invitation'}
      </button>

      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        This can be set once. If you pick the wrong account, reply to your
        receipt email and I will change it.
      </p>
    </form>
  )
}

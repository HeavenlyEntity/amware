'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { completeOnboarding } from '@/lib/commerce/onboarding'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'

/* What a buyer sees the moment Creem sends them back.
 *
 * One question first, because it is the only one that blocks delivery: which
 * GitHub account. Everything else on this page -- the community, the licence
 * key, what to run -- is reading material, and putting any of it above the
 * field would bury the one thing that needs doing.
 *
 * The signed link travels in hidden fields. The page verified it to render,
 * but this form posts on its own and the action re-verifies: a render is not
 * a permission.
 */

function Step({ n, title, done, children }) {
  return (
    <li className="border-[var(--amw-line)] relative border-l pb-10 pl-8 last:border-transparent last:pb-0">
      <span
        aria-hidden="true"
        className={`amw-mono absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
          done
            ? 'border-[var(--amw-accent)] bg-[var(--amw-accent)] text-zinc-950'
            : 'border-[var(--amw-line-strong)] bg-[var(--amw-page)] text-[var(--amw-mut)]'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </li>
  )
}

export function OnboardingSteps({
  requestId,
  signature,
  itemName,
  repo,
  licenseKey,
  discordUrl,
  cliCommand,
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

  const granted = state.ok
  const shownRepo = granted?.repo || repo

  return (
    <ol className="mt-12">
      <Step n="1" title="Where should the kit go?" done={Boolean(granted)}>
        {granted ? (
          <div role="status" className="text-sm">
            {granted.alreadyHadAccess ? (
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">@{granted.username}</span> already
                had access to{' '}
                <a
                  href={`https://github.com/${shownRepo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {shownRepo}
                </a>
                . Nothing to accept, just clone it.
              </p>
            ) : granted.manual ? (
              /* Said plainly. Promising an instant invitation here would be
                 the same lie the confirmation email used to tell. */
              <p className="text-zinc-700 dark:text-zinc-300">
                Saved. I could not send the invitation automatically, so I am
                granting{' '}
                <span className="font-medium">@{granted.username}</span> access
                by hand within one business day. GitHub emails you when it goes
                out.
              </p>
            ) : (
              <>
                <p className="text-zinc-700 dark:text-zinc-300">
                  An invitation to{' '}
                  <span className="font-medium">{shownRepo}</span> is waiting
                  for <span className="font-medium">@{granted.username}</span>.
                </p>
                {granted.inviteUrl && (
                  <a
                    href={granted.inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="amw-cta mt-4"
                  >
                    Accept the invitation
                  </a>
                )}
              </>
            )}
            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              A copy is in your inbox. Wrong account? Reply to that email and I
              will move it.
            </p>
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="r" value={requestId} />
            <input type="hidden" name="s" value={signature} />

            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {itemName} is delivered as a GitHub invitation. Give me the
              account it should go to and I will send it now.
            </p>

            <GithubAccountField
              serverError={fieldError}
              inputRef={usernameRef}
              onGateChange={setGated}
            />

            {formError && (
              <p
                role="alert"
                className="mb-3 text-sm text-red-700 dark:text-red-400"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="amw-cta"
              disabled={isPending || gated}
            >
              {isPending
                ? 'Sending the invitation…'
                : gated
                ? 'Confirm the account'
                : 'Send my invitation'}
            </button>
          </form>
        )}
      </Step>

      {/* Rendered only when a server exists to join. A community link that
          404s is worse than no community section. */}
      {discordUrl && (
        <Step n="2" title="Join the Discord">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Where questions get answered and bugs get reported. Other people
            building on the same kit are in there.
          </p>
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="border-[var(--amw-line)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent)] mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 transition-colors dark:text-zinc-300"
          >
            Accept the Discord invite
          </a>
        </Step>
      )}

      <Step n={discordUrl ? '3' : '2'} title="Set up your copy">
        {licenseKey ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your licence key. Creem emailed it to you as well, so you do not
              have to keep this page open.
            </p>
            <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] mt-3 block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
              {licenseKey}
            </code>
          </>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Clone the repository once the invitation is accepted, then follow
            its README.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <p className="amw-kicker">in your terminal</p>
          <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
            git clone git@github.com:{shownRepo || 'amwaredotdev/your-kit'}.git
          </code>
          {cliCommand && (
            <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
              {cliCommand}
            </code>
          )}
        </div>
      </Step>
    </ol>
  )
}

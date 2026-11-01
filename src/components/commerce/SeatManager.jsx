'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { addSeat, removeAccount, removeSeat } from '@/lib/commerce/addSeat'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'

/* The developers part of the license page. The signed link in the URL is the whole
   authentication, so it is carried in a hidden field rather than re-derived:
   the action verifies it on every submit, and a stale tab gets told the link
   expired instead of silently doing nothing.

   Seat counts come from the server after every submit. Optimistically
   incrementing here would be wrong in the one case that matters -- two people
   on the same license adding someone at the same moment -- and being wrong
   about how many seats are left is worse than being a moment behind.

   Adding and removing share one action state, so the count on screen is
   always the answer of whichever call came last. A form tells the two apart
   by its `intent` field.

   The count lives here, not in the panel around it, because it is the one
   number on the page that changes without a reload. The rest of the usage
   (NetSuite accounts) arrives as `children` and renders in the same card, so
   the page reads as one block of usage. */

/**
 * @param {{
 *   token: string,
 *   initialSeats: { used: string[], limit: number },
 *   repo?: string | null,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function SeatManager({ token, initialSeats, repo, children }) {
  const [state, formAction, isPending] = useActionState(
    (prev, formData) =>
      formData.get('intent') === 'remove'
        ? removeSeat(prev, formData)
        : addSeat(prev, formData),
    { error: null, ok: null, removed: null, seats: null }
  )
  const usernameRef = useRef(null)
  const [gated, setGatedState] = useState(false)
  const setGated = useCallback((next) => setGatedState(next), [])

  const seats = state.seats ?? initialSeats
  const remaining = Math.max(0, seats.limit - seats.used.length)
  const full = remaining === 0

  const fieldError =
    state.error?.field === 'githubUsername' ? state.error.message : null
  const formError =
    state.error && !state.error.field ? state.error.message : null

  useEffect(() => {
    if (fieldError) usernameRef.current?.focus()
  }, [fieldError])

  return (
    <div>
      <div className="amw-card amw-ticks p-6">
        <p className="amw-eyebrow">{'// usage'}</p>
        <p className="amw-mono mt-3 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {`${seats.used.length} / ${seats.limit} developers`}
        </p>
        <p className="amw-kicker mt-1">
          {full
            ? 'no developers left'
            : `${remaining} ${
                remaining === 1 ? 'developer' : 'developers'
              } left`}
        </p>

        {seats.used.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {seats.used.map((name) => (
              <li
                key={name.toLowerCase()}
                className="min-h-11 flex items-center justify-between gap-3 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <a
                  href={`https://github.com/${name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline"
                >
                  @{name}
                </a>
                <form action={formAction}>
                  <input type="hidden" name="intent" value="remove" />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="githubUsername" value={name} />
                  <button
                    type="submit"
                    className="min-h-11 min-w-11 rounded-md px-3 text-sm text-red-700 underline underline-offset-4 disabled:opacity-60 dark:text-red-400"
                    aria-label={`Remove @${name}`}
                    disabled={isPending}
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Add your first developer
          </p>
        )}

        {repo && (
          <p className="mt-5 text-xs text-zinc-600 dark:text-zinc-400">
            Developers are counted per GitHub account on{' '}
            <span className="font-medium">{repo}</span>.
          </p>
        )}

        {children}
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
          {formError}
        </p>
      )}

      {state.removed && (
        <div
          role="status"
          className="mt-6 rounded-md border border-zinc-900/10 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
        >
          <p className="text-zinc-700 dark:text-zinc-300">
            {state.removed.unsaved ? (
              <>
                @{state.removed.username} lost access on GitHub, but I could not
                free the seat on your license. Refresh the page to check. If @
                {state.removed.username} still shows,{' '}
                <a href="/contact" className="underline">
                  get in touch
                </a>
                .
              </>
            ) : state.removed.accessKept ? (
              <>
                @{state.removed.username} is off this license. Their repository
                access was left as it was.
              </>
            ) : (
              <>
                @{state.removed.username} removed. The seat is free and their
                repository access is gone.
              </>
            )}
          </p>
        </div>
      )}

      {state.ok && (
        <div
          role="status"
          className="mt-6 rounded-md border border-zinc-900/10 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
        >
          {state.ok.unsaved ? (
            <p className="text-zinc-700 dark:text-zinc-300">
              @{state.ok.username} was invited, but I could not save the seat to
              your license. Refresh the page to check. If @{state.ok.username}{' '}
              does not show,{' '}
              <a href="/contact" className="underline">
                get in touch
              </a>
              .
            </p>
          ) : state.ok.manual ? (
            <p className="text-zinc-700 dark:text-zinc-300">
              @{state.ok.username} is on the license. I&apos;ll send the invite
              by hand.
            </p>
          ) : (
            <p className="text-zinc-700 dark:text-zinc-300">
              @{state.ok.username} invited.{' '}
              {state.ok.inviteUrl && (
                <a
                  href={state.ok.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Accept link
                </a>
              )}{' '}
              GitHub emails them too.
            </p>
          )}
        </div>
      )}

      <form action={formAction} className="mt-8">
        <input type="hidden" name="intent" value="add" />
        <input type="hidden" name="token" value={token} />

        <GithubAccountField
          serverError={fieldError}
          inputRef={usernameRef}
          onGateChange={setGated}
        />

        <button type="submit" className="amw-cta" disabled={isPending || gated}>
          {isPending
            ? 'Working…'
            : gated
            ? 'Confirm the account'
            : 'Add to the license'}
        </button>

        {/* Shown rather than disabling the form: someone already on the
            license can still be re-invited when a full team needs it, and a
            dead form with no explanation is the worse failure. */}
        {full && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            All developers are in use. You can still re-send an invitation to
            someone already on the license.
          </p>
        )}
      </form>
    </div>
  )
}

/* The NetSuite accounts part of the license page, in the same card as the
   developers. Only `accountId` and `status` reach here: the Creem instance
   id stays on the server. The list is the answer of the last removal, so the
   count is the server's, as it is for developers.

   @param {{
     token: string,
     accounts: Array<{ accountId: string, status?: string | null }>,
     limit: number,
   }} props */
export function AccountList({ token, accounts, limit }) {
  const [state, formAction, isPending] = useActionState(removeAccount, {
    error: null,
    ok: null,
    accounts: null,
  })
  const rows = state.accounts ?? accounts
  const inUse = rows.filter((row) => row.status !== 'over_limit').length

  return (
    <div className="border-[var(--amw-line)] mt-6 border-t pt-6">
      <p className="amw-mono text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
        {`${inUse} / ${limit} NetSuite accounts`}
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Shows up after your first{' '}
          <code className="amw-mono">pnpm ns:deploy</code>.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.accountId}
              className="min-h-11 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="amw-mono">{row.accountId}</span>
                {row.status === 'over_limit' && (
                  <span className="amw-kicker text-red-700 dark:text-red-400">
                    Over your limit
                  </span>
                )}
              </span>
              <form action={formAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="accountId" value={row.accountId} />
                <button
                  type="submit"
                  className="min-h-11 min-w-11 rounded-md px-3 text-sm text-red-700 underline underline-offset-4 disabled:opacity-60 dark:text-red-400"
                  aria-label={`Remove account ${row.accountId}`}
                  disabled={isPending}
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {state.error.message}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"
        >
          {state.ok.accountId} removed from your license.
          {state.ok.creemFailed &&
            ' Creem did not confirm the change on its side, which does not affect your license.'}
        </p>
      )}
    </div>
  )
}

'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { addSeat } from '@/lib/commerce/addSeat'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'

/* The seat page for a team licence. The signed link in the URL is the whole
   authentication, so it is carried in a hidden field rather than re-derived:
   the action verifies it on every submit, and a stale tab gets told the link
   expired instead of silently doing nothing.

   Seat counts come from the server after every submit. Optimistically
   incrementing here would be wrong in the one case that matters -- two people
   on the same licence adding someone at the same moment -- and being wrong
   about how many seats are left is worse than being a moment behind. */

export function SeatManager({ token, initialSeats, repo }) {
  const [state, formAction, isPending] = useActionState(addSeat, {
    error: null,
    ok: null,
    seats: null,
  })
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
        <p className="amw-eyebrow">{'// licence'}</p>
        <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {seats.used.length} / {seats.limit}
        </p>
        <p className="amw-kicker mt-1">
          {full
            ? 'every seat in use'
            : `${remaining} ${remaining === 1 ? 'seat' : 'seats'} left`}
        </p>

        {seats.used.length > 0 && (
          <ul className="mt-5 space-y-2">
            {seats.used.map((name) => (
              <li
                key={name.toLowerCase()}
                className="flex items-center justify-between gap-3 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <a
                  href={`https://github.com/${name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline"
                >
                  @{name}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-xs text-zinc-600 dark:text-zinc-400">
          Seats are counted per GitHub account on{' '}
          <span className="font-medium">{repo}</span>. Removing someone from the
          repository on GitHub frees their seat.
        </p>
      </div>

      {state.ok && (
        <div
          role="status"
          className="mt-6 rounded-md border border-zinc-900/10 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/40"
        >
          {state.ok.manual ? (
            <p className="text-zinc-700 dark:text-zinc-300">
              @{state.ok.username} is on the licence, but the invitation could
              not be sent automatically. I am granting access by hand within one
              business day.
            </p>
          ) : (
            <p className="text-zinc-700 dark:text-zinc-300">
              @{state.ok.username} has been invited.{' '}
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
        <input type="hidden" name="token" value={token} />

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

        <button type="submit" className="amw-cta" disabled={isPending || gated}>
          {isPending
            ? 'Inviting…'
            : gated
            ? 'Confirm the account'
            : 'Add to the licence'}
        </button>

        {/* Shown rather than disabling the form: someone already on the
            licence can still be re-invited when a full team needs it, and a
            dead form with no explanation is the worse failure. */}
        {full && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Every seat is in use. You can still re-send an invitation to someone
            already on the licence.
          </p>
        )}
      </form>
    </div>
  )
}

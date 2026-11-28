'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Building2, TriangleAlert, Users } from 'lucide-react'
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
   the page reads as one block of usage.

   `afterUsage` is the page's one thing to do about the license, such as paying
   for a higher tier. It is a second slot, after the usage card and before the
   add form, so the page reads kit and tier, usage, then the action.

   `focusAdd` moves focus to the add-developer field. It is an effect on the
   prop, not a one-time flag read on first render, because the page that owns
   this component is server-rendered and refreshed in place: the prop turns
   true on a refresh that keeps this component mounted, and it has to work
   there as well as on a fresh load.

   `addLockedReason` replaces the add form with that sentence while adding is
   held back (updates have ended). The usage card and the remove buttons stay,
   and the server refuses the add as well: hiding the form is not the lock. */

/* The add-developer button is the secondary style. The license page has one
   teal button, the upgrade or Enterprise action, and adding a developer is
   routine next to it. */
const quietButtonClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--amw-line-strong)] px-5 py-2.5 text-sm font-semibold leading-tight text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amw-accent-ink)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/60'

/* The usage card is meter rows: for each thing the license counts, a label,
   the count against its limit, a thin bar, and the people or accounts on
   dashed rows under it. The surface is the site's soft panel (`--amw-muted`,
   no border, no corner ticks). Each meter is a labelled group, so a screen
   reader hears "Developers, 2 / 5" as one thing; the bar repeats the count
   and is hidden from it.

   A row is the unit: another counted thing, or a price per seat, is one more
   row of the same shape rather than a new layout. */
const usageLabelClass =
  'flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50'
/* The mark beside a label, and the warning beside "Over your limit". Lucide,
   the site's icon set, at its 1.5 stroke. Decoration: the words carry the
   meaning, so each is hidden from assistive technology. The label marks sit
   in the muted ink, so the teal stays on the bars. */
const usageIconClass = 'size-4 shrink-0 text-[var(--amw-mut)]'
const usageCountClass =
  'amw-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-50'
const usageHintClass = 'amw-mono text-xs text-[var(--amw-mut)]'
const usageRowClass =
  'border-[var(--amw-line)] min-h-11 flex items-center justify-between gap-3 border-t border-dashed'
const usageNameClass =
  'amw-mono text-[0.8125rem] text-[var(--amw-ink)] decoration-[var(--amw-line-strong)] hover:decoration-[var(--amw-accent)] truncate underline underline-offset-4'
/* Quiet until it is pointed at: removing someone is routine next to the page's
   one teal action, and red at rest on every row would shout. The label is
   lowercased by the stylesheet, as the site's mono labels are; the accessible
   name ("Remove @name") comes from aria-label. */
const removeClass =
  'amw-mono min-h-11 min-w-11 inline-flex items-center justify-end rounded-md pl-3 text-xs lowercase text-[var(--amw-mut)] underline-offset-4 transition-colors hover:text-red-700 hover:underline disabled:opacity-60 dark:hover:text-red-400'
/* Not `amw-kicker`: that class sets its own colour outside Tailwind's layers,
   so the red never applied and the warning read as a plain label. */
const overLimitClass =
  'amw-mono inline-flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400'

/* "2 / 5": what is in use in full ink, the limit behind it in the muted ink. */
function UsageCount({ used, limit }) {
  return (
    <p className={usageCountClass}>
      {used}
      <span className="text-[var(--amw-mut)]">{` / ${limit}`}</span>
    </p>
  )
}

/* The bar under a count. Decoration: the count beside the label carries the
   meaning, so the bar is hidden from assistive technology. A limit that is
   not a positive number draws no bar. */
function UsageMeter({ used, limit }) {
  if (!Number.isFinite(limit) || limit <= 0) return null
  const share = Math.min(100, Math.max(0, (used / limit) * 100))
  return (
    <div
      aria-hidden="true"
      className="bg-[var(--amw-line)] mt-2.5 h-1.5 overflow-hidden rounded-full"
    >
      <span
        className="bg-[var(--amw-accent)] block h-full rounded-full"
        style={{ width: `${share}%` }}
      />
    </div>
  )
}

/**
 * @param {{
 *   token: string,
 *   initialSeats: { used: string[], limit: number },
 *   repo?: string | null,
 *   afterUsage?: import('react').ReactNode,
 *   focusAdd?: boolean,
 *   addLockedReason?: string | null,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function SeatManager({
  token,
  initialSeats,
  repo,
  afterUsage,
  focusAdd = false,
  addLockedReason = null,
  children,
}) {
  const [state, formAction, isPending] = useActionState(
    (prev, formData) =>
      formData.get('intent') === 'remove'
        ? removeSeat(prev, formData)
        : addSeat(prev, formData),
    { error: null, ok: null, removed: null, seats: null }
  )
  const usernameRef = useRef(null)
  const developersId = useId()
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

  useEffect(() => {
    if (focusAdd) usernameRef.current?.focus()
  }, [focusAdd])

  return (
    <div>
      <div className="bg-[var(--amw-muted)] rounded-2xl p-6">
        <p className="amw-eyebrow">{'// usage'}</p>
        <div role="group" aria-labelledby={developersId} className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id={developersId} className={usageLabelClass}>
              <Users
                className={usageIconClass}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Developers
            </h2>
            <UsageCount used={seats.used.length} limit={seats.limit} />
          </div>
          <UsageMeter used={seats.used.length} limit={seats.limit} />
          <p className={`${usageHintClass} mt-2`}>
            {full
              ? 'no developers left'
              : `${remaining} ${
                  remaining === 1 ? 'developer' : 'developers'
                } left`}
          </p>

          {seats.used.length > 0 ? (
            <ul className="mt-3">
              {seats.used.map((name) => (
                <li key={name.toLowerCase()} className={usageRowClass}>
                  <a
                    href={`https://github.com/${name}`}
                    target="_blank"
                    rel="noreferrer"
                    className={usageNameClass}
                  >
                    @{name}
                  </a>
                  <form action={formAction}>
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="githubUsername" value={name} />
                    <button
                      type="submit"
                      className={removeClass}
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
            <p
              className={`${usageRowClass} mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-50`}
            >
              Add your first developer
            </p>
          )}

          {repo && (
            <p className="border-[var(--amw-line)] border-t border-dashed pt-3 text-xs text-zinc-600 dark:text-zinc-400">
              Developers are counted per GitHub account on{' '}
              <span className="font-medium">{repo}</span>.
            </p>
          )}
        </div>

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
            {state.removed.accessKept ? (
              state.removed.unsaved ? (
                <>
                  @{state.removed.username} is still on your license: I could
                  not free the seat. Press Remove again, or{' '}
                  <a href="/contact" className="underline">
                    get in touch
                  </a>
                  . Their repository access was not changed.
                </>
              ) : (
                <>
                  @{state.removed.username} is off this license and the seat is
                  free. Their repository access was left as it is.{' '}
                  <a href="/contact" className="underline">
                    Get in touch
                  </a>{' '}
                  if it should go.
                </>
              )
            ) : state.removed.unsaved ? (
              <>
                @{state.removed.username} lost access on GitHub, but I could not
                free the seat on your license. Press Remove again to finish,
                which is safe to repeat. If it keeps failing,{' '}
                <a href="/contact" className="underline">
                  get in touch
                </a>
                .
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

      {afterUsage && <div className="mt-8">{afterUsage}</div>}

      {addLockedReason ? (
        <p className="mt-8 text-sm text-zinc-700 dark:text-zinc-300">
          {addLockedReason}
        </p>
      ) : (
        <form action={formAction} className="mt-8">
          <input type="hidden" name="intent" value="add" />
          <input type="hidden" name="token" value={token} />

          <GithubAccountField
            serverError={fieldError}
            inputRef={usernameRef}
            onGateChange={setGated}
          />

          <button
            type="submit"
            className={quietButtonClass}
            disabled={isPending || gated}
          >
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
      )}
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
  const labelId = useId()
  const rows = state.accounts ?? accounts
  const inUse = rows.filter((row) => row.status !== 'over_limit').length

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="border-[var(--amw-line)] mt-6 border-t pt-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={labelId} className={usageLabelClass}>
          <Building2
            className={usageIconClass}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          NetSuite accounts
        </h2>
        <UsageCount used={inUse} limit={limit} />
      </div>
      <UsageMeter used={inUse} limit={limit} />

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          Shows up after your first{' '}
          <code className="amw-mono">pnpm ns:deploy</code>.
        </p>
      ) : (
        <ul className="mt-3">
          {rows.map((row) => (
            <li
              key={row.accountId}
              className={`${usageRowClass} flex-wrap gap-y-1`}
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="amw-mono text-[var(--amw-ink)] text-[0.8125rem]">
                  {row.accountId}
                </span>
                {row.status === 'over_limit' && (
                  <span className={overLimitClass}>
                    <TriangleAlert
                      className="size-3.5 shrink-0"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Over your limit
                  </span>
                )}
              </span>
              <form action={formAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="accountId" value={row.accountId} />
                <button
                  type="submit"
                  className={removeClass}
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

'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { motion, useAnimate } from 'motion/react'
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconCircleCheck,
  IconCircleX,
  IconLoader2,
} from '@tabler/icons-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import {
  KIT_INPUT,
  KIT_INPUT_BAD,
  KIT_INPUT_OK,
} from '@/components/site/kit-input'
import {
  checkGithubUsername,
  usernameMessage,
  GITHUB_USERNAME_MAX,
} from '@/lib/commerce/githubUsername'

/* The one field in the purchase where a typo costs money. A wrong username is
   not a failed delivery -- the repository invitation goes to a stranger, and if
   they accept it they have the boilerplate. So the account is looked up and
   shown before payment, and the buyer says yes it is mine.

   The lookup runs here, in the browser, deliberately. Unauthenticated GitHub
   allows 60 requests an hour per IP: from the browser that is 60 per visitor,
   which nobody reaches, while from the server it would be 60 an hour shared
   across every customer and would fail under the lightest traffic.

   It fails open. GitHub being unreachable, rate-limited or slow says nothing
   about whether the username is right, and blocking a sale on our own
   dependency would be the worse mistake. Only a 404 -- GitHub stating the
   account does not exist -- stops the purchase, and the server re-checks the
   same way because nothing here can be trusted. */

const DEBOUNCE_MS = 450

const EASE = [0.2, 0.7, 0.2, 1]

/* `initialValue` pre-fills a name already known, such as the account a buyer
   claimed Lite with. It is only a starting value: the account is looked up and
   shown like any typed one, and still has to be confirmed. */
export function GithubAccountField({
  serverError,
  inputRef,
  onGateChange,
  initialValue = '',
}) {
  const [value, setValue] = useState(initialValue)
  /* One result object carrying the login it describes, rather than a status
     flag sequenced through effects. Status is then derived: if the stored
     result is for the text currently in the box we know the answer, and if it
     is not we are still waiting. That keeps every setState inside the async
     callback, where it belongs, instead of firing synchronously during an
     effect and cascading renders. */
  const [result, setResult] = useState(null)
  const [confirmedFor, setConfirmedFor] = useState(null)

  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const confirmId = `${fieldId}-confirm`
  const localRef = useRef(null)
  const ref = inputRef || localRef

  const login = value.trim()

  /* One question, asked once: is this name worth a lookup? The effect below
     bails on exactly this value, so status and behaviour cannot disagree.
     They used to: `formatProblem` was computed as `value ? check(value) : null`,
     which returned null for an empty field -- no problem, therefore not idle,
     therefore "checking". So an untouched field on every product page
     announced "Checking GitHub…" forever, while the effect's own guard meant
     nothing was being checked and never would be. */
  const problem = checkGithubUsername(login)

  /* An untouched field is not a wrong field. The "enter a username" message
     is real, but it belongs to a submit, not to a page load, so it is held
     back until there is something to correct. */
  const formatError = value ? usernameMessage(problem) : null
  // A server error outranks a client one: it is the newer verdict.
  const shownError = serverError || (problem !== 'empty' ? formatError : null)

  const current = result && result.forLogin === login ? result : null
  const status = problem ? 'idle' : current ? current.status : 'checking'
  const profile = current?.profile ?? null
  /* Confirmation is tied to the account it was given for, so changing the
     username withdraws it without an effect having to reset anything. */
  const confirmed = Boolean(profile) && confirmedFor === profile.login

  useEffect(() => {
    // Same question as `problem` above, and that is the point: the status
    // shown and the lookup performed are decided by one rule.
    if (checkGithubUsername(login)) return undefined

    let cancelled = false
    const timer = setTimeout(async () => {
      const settle = (next) => {
        if (!cancelled) setResult({ forLogin: login, ...next })
      }
      try {
        const res = await fetch(
          `https://api.github.com/users/${encodeURIComponent(login)}`,
          { headers: { Accept: 'application/vnd.github+json' } }
        )
        if (res.status === 404)
          return settle({ status: 'missing', profile: null })
        if (!res.ok) return settle({ status: 'unknown', profile: null })
        const data = await res.json()
        settle({
          status: 'found',
          profile: {
            login: data.login,
            name: data.name,
            avatar: data.avatar_url,
            url: data.html_url,
            isOrg: data.type === 'Organization',
          },
        })
      } catch {
        settle({ status: 'unknown', profile: null })
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [login])

  /* The button this gates lives in the parent, so the gate is reported upward
     rather than inferred there. Only a resolved account gates: if the lookup
     never answered, the purchase is not held hostage to our dependency. */
  const blocked = status === 'found' && !confirmed
  useEffect(() => {
    onGateChange?.(blocked)
  }, [blocked, onGateChange])

  /* A short shake when the field turns wrong, once per time it does. The
     input itself is never remounted, so focus and the caret stay put. */
  const invalid = Boolean(shownError) || status === 'missing'
  const reduced = useReducedMotion()
  const [shakeScope, animate] = useAnimate()
  useEffect(() => {
    if (!invalid || reduced || !shakeScope.current) return
    animate(
      shakeScope.current,
      { x: [0, -4, 4, -4, 4, 0] },
      { duration: 0.36, ease: 'easeInOut' }
    )
  }, [invalid, reduced, animate, shakeScope])

  return (
    <div className="mb-4">
      <label
        htmlFor={fieldId}
        className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        GitHub username (for repo access)
      </label>

      <div ref={shakeScope} className="relative">
        <IconBrandGithub
          size={18}
          stroke={1.5}
          aria-hidden="true"
          className="text-[var(--amw-mut)] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        />
        <input
          ref={ref}
          id={fieldId}
          type="text"
          name="githubUsername"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={GITHUB_USERNAME_MAX}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your-github-username"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={invalid ? errorId : hintId}
          className={`${KIT_INPUT} pl-[42px] pr-11 ${
            invalid
              ? KIT_INPUT_BAD
              : status === 'found'
              ? 'border-[color-mix(in_srgb,var(--amw-accent)_55%,transparent)]'
              : KIT_INPUT_OK
          }`}
        />
        {/* Decorative: every one of these states is also said in words. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 inline-flex -translate-y-1/2"
        >
          {status === 'checking' ? (
            <IconLoader2
              size={18}
              stroke={2}
              className="amw-kit-spin text-[var(--amw-mut)]"
            />
          ) : invalid ? (
            <IconCircleX
              size={18}
              stroke={2}
              className="amw-kit-pop text-red-600 dark:text-red-400"
            />
          ) : status === 'found' ? (
            <IconCircleCheck
              size={18}
              stroke={2}
              className="amw-kit-pop text-[var(--amw-accent-ink)]"
            />
          ) : null}
        </span>
      </div>

      <p
        id={hintId}
        className="text-[var(--amw-mut)] mt-2 text-[13px] leading-normal"
      >
        Letters, numbers and single hyphens. This is where the repository
        invitation is sent.
      </p>

      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[13px] leading-normal text-red-700 dark:text-red-400"
        >
          {shownError ||
            `GitHub has no account called “${value.trim()}”. Check the spelling.`}
        </p>
      )}

      {/* Announced politely rather than assertively: the buyer is still typing
          and a live interruption on every keystroke would be hostile. */}
      <div aria-live="polite">
        {status === 'checking' && (
          <p className="amw-mono text-[var(--amw-mut)] mt-2 text-xs">
            <span className="text-[var(--amw-accent-ink)]" aria-hidden="true">
              ${' '}
            </span>
            Checking GitHub…
          </p>
        )}

        {status === 'unknown' && (
          <p className="text-[var(--amw-mut)] mt-2 text-[13px] leading-normal">
            Could not reach GitHub to confirm this account. You can still
            continue. The username is checked again at checkout.
          </p>
        )}

        {status === 'found' && profile && (
          <motion.div
            key={profile.login}
            initial={reduced ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.38, ease: EASE }
            }
            className="amw-kit-inset mt-4 p-3.5"
          >
            <div className="flex items-center gap-3">
              <Image
                src={profile.avatar}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                  {profile.name || profile.login}
                </p>
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--amw-accent-ink)] text-[var(--amw-mut)] inline-flex items-center gap-1 text-sm no-underline transition-colors"
                >
                  @{profile.login}
                  <IconArrowUpRight size={14} stroke={1.5} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>

            {profile.isOrg && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                That is an organisation, not a person. Repository invitations go
                to user accounts, so use your own username.
              </p>
            )}

            <label
              htmlFor={confirmId}
              className="border-[var(--amw-line)] min-h-11 text-[var(--amw-ink)] mt-3.5 flex cursor-pointer items-center gap-2.5 border-t border-dashed pt-3.5 text-sm"
            >
              <span className="relative inline-flex h-5 w-5 shrink-0">
                <input
                  id={confirmId}
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) =>
                    setConfirmedFor(e.target.checked ? profile.login : null)
                  }
                  className="amw-kit-checkbox"
                />
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="amw-kit-tick pointer-events-none absolute inset-0"
                >
                  <path d="M6 12.5l4 4l8 -9" />
                </svg>
              </span>
              <span>This is my GitHub account.</span>
            </label>
          </motion.div>
        )}
      </div>
    </div>
  )
}

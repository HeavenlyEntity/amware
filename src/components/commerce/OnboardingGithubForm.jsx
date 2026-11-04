'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { IconArrowRight, IconKey } from '@tabler/icons-react'
import { completeOnboarding } from '@/lib/commerce/onboarding'
import { GithubAccountField } from '@/components/commerce/GithubAccountField'
import { useSetupProgress } from '@/components/commerce/SetupProgress'
import { ChevronCta } from '@/components/site/ChevronCta'
import { useReducedMotion } from '@/components/AccessibilityProvider'

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
   still says "this is my account".

   A success is drawn as the redesign's accent panel: a ring that draws
   itself, a short burst, the heading and one white chevron button. Each
   variant keeps its own words and its own action -- the invitation, the
   repository, or none at all for the by-hand case -- and the license page
   follows as its own card. */

const EASE = [0.2, 0.7, 0.2, 1]
const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315]

function DoneRing() {
  const reduced = useReducedMotion()
  const draw = (delay, duration) =>
    reduced
      ? { initial: false, animate: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { delay, duration, ease: EASE },
        }
  return (
    <div className="relative h-16 w-16" aria-hidden="true">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#09090b"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.circle cx="12" cy="12" r="10" {...draw(0.1, 0.6)} />
        <motion.path d="M8 12.3l2.8 2.8l5.2 -5.6" {...draw(0.6, 0.35)} />
      </svg>
      {!reduced &&
        SPARKS.map((a) => (
          <motion.span
            key={a}
            data-spark=""
            className="bg-zinc-950 absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full"
            style={{ rotate: a }}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, scale: 0.4 }}
            transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
          />
        ))}
    </div>
  )
}

function Success({ ok }) {
  const reduced = useReducedMotion()
  const { repo, username, inviteUrl, alreadyHadAccess, manual, licenseUrl } = ok
  const enter = reduced
    ? { initial: false }
    : {
        initial: { opacity: 0, y: -8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.38, ease: EASE },
      }

  return (
    <div className="mt-9">
      <motion.div
        role="status"
        {...enter}
        className="bg-[var(--amw-accent)] text-zinc-950 flex flex-col items-start rounded-3xl px-6 pb-7 pt-9 sm:px-7"
      >
        <DoneRing />
        <h2 className="text-zinc-950 mt-5 text-2xl font-bold leading-tight tracking-[-0.025em] sm:text-[1.75rem]">
          {alreadyHadAccess
            ? `@${username} already has access.`
            : manual
            ? `You are on the list, @${username}.`
            : 'The repository is on its way.'}
        </h2>

        {alreadyHadAccess ? (
          <>
            <p className="text-zinc-950/75 mt-2.5 max-w-[32rem] text-base leading-[1.65]">
              Nothing to accept. Open <span className="amw-mono">{repo}</span>{' '}
              and clone it.
            </p>
            <ChevronCta
              href={`https://github.com/${repo}`}
              external
              variant="white"
              className="mt-6 max-w-full"
            >
              <span className="block truncate">{repo}</span>
            </ChevronCta>
          </>
        ) : manual ? (
          /* Said plainly: the invitation did not send and a person finishes
             it. The account is kept, so this never has to be asked again. */
          <p className="text-zinc-950/75 mt-2.5 max-w-[32rem] text-base leading-[1.65]">
            The invitation could not be sent automatically, so I am granting
            access to <span className="font-semibold">@{username}</span> by hand
            within one business day. You will get an email from GitHub when it
            goes out.
          </p>
        ) : (
          <>
            <p className="text-zinc-950/75 mt-2.5 max-w-[32rem] text-base leading-[1.65]">
              A GitHub invitation for {repo} is waiting for @{username}.
            </p>
            {inviteUrl && (
              <ChevronCta
                href={inviteUrl}
                external
                variant="white"
                className="mt-6"
              >
                Accept the invitation
              </ChevronCta>
            )}
          </>
        )}

        <p className="text-zinc-950/75 mt-5 text-[13px] leading-normal">
          A copy is in your inbox. GitHub sends its own email too, and that one
          does sometimes land in spam.
        </p>
      </motion.div>

      {licenseUrl && (
        <a
          href={licenseUrl}
          className="amw-kit-card amw-kit-next amw-kit-lift min-h-11 text-[var(--amw-ink)] mt-3 flex w-full items-center gap-3.5 px-[18px] py-4 no-underline"
        >
          <span
            aria-hidden="true"
            className="bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          >
            <IconKey size={20} stroke={1.6} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
              Last step: open your license page
            </span>
            <span className="text-[var(--amw-mut)] text-[13px]">
              Copy <code className="amw-mono">WAREKIT_LICENSE_KEY</code> into
              your <code className="amw-mono">.env</code>.
            </span>
          </span>
          <IconArrowRight
            size={18}
            stroke={1.6}
            aria-hidden="true"
            className="amw-kit-chev text-[var(--amw-accent-ink)] shrink-0"
          />
        </a>
      )}
    </div>
  )
}

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

  // The stepper above the form advances once the answer is accepted.
  const markSent = useSetupProgress()?.markSent
  useEffect(() => {
    if (state.ok) markSent?.()
  }, [state.ok, markSent])

  if (state.ok) return <Success ok={state.ok} />

  /* The invitation to an account already on file did not send. The account is
     fixed -- the action refuses any other -- so there is nothing to type, only
     the same call to repeat. The by-hand promise stays as the fallback. */
  if (retryUsername) {
    return (
      <form action={formAction} className="mt-6">
        <input type="hidden" name="r" value={requestId} />
        <input type="hidden" name="s" value={signature} />
        <input type="hidden" name="githubUsername" value={retryUsername} />

        <p className="text-[var(--amw-mut)] text-[15px] leading-relaxed">
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

        <ChevronCta
          type="submit"
          full
          className="mt-5"
          disabled={isPending}
          aria-busy={isPending || undefined}
          state={isPending ? 'pending' : 'idle'}
        >
          {isPending ? 'Sending invitation…' : 'Try again'}
        </ChevronCta>
      </form>
    )
  }

  return (
    <form action={formAction} className="mt-5">
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

      <ChevronCta
        type="submit"
        full
        className="mt-5"
        disabled={isPending || gated}
        aria-busy={isPending || undefined}
        state={isPending ? 'pending' : 'idle'}
      >
        {isPending
          ? 'Sending invitation…'
          : gated
          ? 'Confirm your account'
          : 'Send my invitation'}
      </ChevronCta>

      <p className="text-[var(--amw-mut)] mt-3 text-[13px] leading-normal">
        This can be set once. If you pick the wrong account, reply to your
        receipt email and I will change it.
      </p>
    </form>
  )
}

'use client'

import { useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { STEPS } from '@/lib/founders/steps'

/* The wizard frame: eyebrow, progress, the step headline (focused on
   every step change so keyboard and screen-reader users land on the
   question), the step body, and Back / Next. Step transitions are a
   short fade-and-rise that reduced motion turns off. The rail is
   rendered by the caller so this shell stays layout-agnostic. */

const easeOut = [0.16, 1, 0.3, 1]

export function WizardShell({
  step,
  onBack,
  onNext,
  nextDisabled = false,
  lead = null,
  /* The job offer wizard has its own registry, so the shell takes one rather
     than being welded to the equity tool's steps. */
  steps = STEPS,
  children,
}) {
  const reduce = useReducedMotion()
  const current = steps.find((s) => s.index === step) ?? steps[0]
  const isFirst = current.index === 1
  const isLast = current.index === steps.length

  const hasMountedHeading = useRef(false)
  const headingRef = useCallback(
    (node) => {
      if (!node) return
      if (hasMountedHeading.current || current.index !== 1)
        node.focus({ preventScroll: false })
      hasMountedHeading.current = true
    },
    [current.index]
  )

  return (
    <div>
      <p className="amw-kicker mb-3">
        Step {current.index} of {steps.length} · {current.eyebrow}
      </p>
      <ol className="mb-8 flex list-none gap-1.5 p-0" aria-label="Progress">
        {steps.map((s) => (
          <li
            key={s.id}
            aria-current={s.index === current.index ? 'step' : undefined}
            className={`h-1 flex-1 rounded-full ${
              s.index <= current.index
                ? 'bg-zinc-700 dark:bg-zinc-300'
                : 'bg-[var(--amw-line-strong)]'
            }`}
          >
            <span className="sr-only">
              {s.eyebrow}
              {s.index === current.index ? ' (current)' : ''}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={current.id}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: easeOut }}
          aria-labelledby={`wizard-step-${current.id}`}
        >
          <h2
            id={`wizard-step-${current.id}`}
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-medium tracking-tight text-zinc-900 outline-none dark:text-zinc-100 md:text-3xl"
          >
            {current.title}
          </h2>
          {lead && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {lead}
            </p>
          )}
          <div className="mt-8 space-y-8">{children}</div>
        </motion.section>
      </AnimatePresence>

      {!isLast && (
        <div className="mt-10 flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          {isFirst ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="border-[var(--amw-line-strong)] bg-[var(--amw-card)] min-h-11 hover:border-[var(--amw-accent-ink)] inline-flex items-center gap-2 rounded-md border px-4 text-sm font-medium text-zinc-800 transition-colors dark:text-zinc-200"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="group inline-flex w-full items-center justify-center gap-3 rounded-md bg-zinc-900 py-3 pl-5 pr-3 font-medium text-white transition-all duration-500 ease-out hover:rounded-[50px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:rounded-md dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
          >
            <span>{current.next}</span>
            <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 group-disabled:scale-100 dark:bg-zinc-900 dark:text-zinc-50">
              <ChevronRight
                className="relative left-px h-4 w-4"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

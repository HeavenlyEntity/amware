'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { motion } from 'motion/react'
import { IconBrandGithub, IconCheck, IconKey } from '@tabler/icons-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'

/*
 * Where a kit buyer is in setup: Paid, then a GitHub account, then the
 * license key. Nothing here is decided on the client. The page says whether
 * the account is already on file (purchase.githubUsername); the only thing
 * that can change while the page is open is the form succeeding, which
 * OnboardingGithubForm reports through `markSent`. The license step is never
 * marked done: nothing tells this page a key reached anyone's .env.
 */

const Progress = createContext(null)

/**
 * @param {{ accountDone: boolean, asking?: boolean,
 *   children?: import('react').ReactNode }} props
 */
export function SetupProgress({ accountDone, asking = false, children }) {
  const [sent, setSent] = useState(false)
  const markSent = useCallback(() => setSent(true), [])
  const value = useMemo(() => {
    const done = accountDone || sent
    return { done, sent, markSent, asking: asking && !done }
  }, [accountDone, sent, markSent, asking])
  return <Progress.Provider value={value}>{children}</Progress.Provider>
}

/** The progress, or null outside a SetupProgress. */
export function useSetupProgress() {
  return useContext(Progress)
}

const EASE = [0.2, 0.7, 0.2, 1]
const CIRCLE =
  'box-border grid h-8 w-8 shrink-0 place-items-center rounded-full'

function DoneCircle({ animate }) {
  const reduced = useReducedMotion()
  return (
    <motion.span
      initial={animate && !reduced ? { opacity: 0, scale: 0.55 } : false}
      animate={{ opacity: 1, scale: [null, 1.12, 1] }}
      transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
      className={`${CIRCLE} bg-[var(--amw-accent)] text-zinc-950`}
    >
      <IconCheck size={16} stroke={2.4} aria-hidden="true" />
    </motion.span>
  )
}

function Bar({ full }) {
  const reduced = useReducedMotion()
  return (
    <li
      aria-hidden="true"
      className="min-w-4 bg-[var(--amw-line)] mx-2.5 mt-[15px] h-0.5 flex-1 self-start overflow-hidden rounded-sm sm:mx-3.5 sm:mt-0 sm:self-center"
    >
      <motion.span
        className="bg-[var(--amw-accent)] block h-full"
        initial={false}
        animate={{ width: full ? '100%' : '0%' }}
        transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
      />
    </li>
  )
}

const LI =
  'flex shrink-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2.5 sm:text-left'
const LABEL = 'text-xs font-medium sm:text-sm'

/** Paid ✓ → GitHub account → License key. */
export function SetupStepper() {
  const progress = useSetupProgress()
  const done = Boolean(progress?.done)
  const sent = Boolean(progress?.sent)

  return (
    <ol
      aria-label="Setup progress"
      className="amw-kit-rise flex items-center"
      style={{ '--i': 0 }}
    >
      <li className={LI}>
        <DoneCircle animate />
        <span className={`${LABEL} text-[var(--amw-ink)]`}>
          Paid<span className="sr-only">, done</span>
        </span>
      </li>
      <Bar full />
      <li className={LI} aria-current={done ? undefined : 'step'}>
        {done ? (
          <DoneCircle animate={sent} />
        ) : (
          <span
            className={`${CIRCLE} border-[var(--amw-accent)] bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] border-[1.5px] ${
              progress?.asking ? 'amw-kit-pulse' : ''
            }`}
          >
            <IconBrandGithub size={16} stroke={1.6} aria-hidden="true" />
          </span>
        )}
        <span className={`${LABEL} text-[var(--amw-ink)]`}>
          GitHub account
          {done && <span className="sr-only">, done</span>}
        </span>
      </li>
      <Bar full={done} />
      <li className={LI} aria-current={done ? 'step' : undefined}>
        <span
          className={`${CIRCLE} border-[1.5px] transition-colors duration-[400ms] motion-reduce:transition-none ${
            done
              ? 'border-[var(--amw-accent)] bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] border-solid'
              : 'border-[var(--amw-line-strong)] text-[var(--amw-mut)] border-dashed'
          }`}
        >
          <IconKey size={16} stroke={1.6} aria-hidden="true" />
        </span>
        <span
          className={`${LABEL} ${
            done ? 'text-[var(--amw-ink)]' : 'text-[var(--amw-mut)]'
          }`}
        >
          License key
        </span>
      </li>
    </ol>
  )
}

/** `// setup / step N of 3`, with the cursor. */
export function SetupEyebrow() {
  const progress = useSetupProgress()
  const step = progress?.done ? 3 : 2
  return (
    <p className="amw-eyebrow">
      {`// setup / step ${step} of 3`}
      <span className="amw-cursor" aria-hidden="true" />
    </p>
  )
}

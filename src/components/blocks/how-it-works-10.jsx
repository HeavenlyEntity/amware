'use client'

/* React Bits Pro "How It Works 10", adapted: the steps come in as props,
   the four artifact cards are drawn from data, the stock portraits and the
   section chrome (padding, heading, background) are gone, and the neutrals
   are the `.amw` tokens. The page supplies the heading. */

import { useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { Check } from 'lucide-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

const card =
  'rounded-[16px] border border-[var(--amw-line)] bg-[var(--amw-card-2)] p-5 sm:p-6'
const heading = 'text-zinc-950 dark:text-white'
const muted = 'text-zinc-600 dark:text-zinc-400'
const pill =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'

function Done({ label }) {
  return (
    <span className="text-[var(--amw-accent-ink)] inline-flex shrink-0 items-center gap-1.5 text-sm">
      <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      {label}
    </span>
  )
}

function Figures({ figures }) {
  if (!figures?.length) return null
  return (
    <dl
      className="mt-5 grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))`,
      }}
    >
      {figures.map((figure) => (
        <div key={figure.label}>
          <dt className={cn('text-sm', muted)}>{figure.label}</dt>
          <dd
            className={cn(
              'mt-1 text-xl font-medium tabular-nums tracking-tight',
              heading
            )}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function CardTitle({ title, sub, large }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          'font-medium',
          large ? 'text-base tracking-tight' : 'text-sm',
          heading
        )}
      >
        {title}
      </p>
      {sub ? (
        <p className={cn('mt-0.5 text-sm tabular-nums', muted)}>{sub}</p>
      ) : null}
    </div>
  )
}

// A finished bar and its figures.
function ProgressArtifact({ title, done, figures }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-4">
        <CardTitle title={title} />
        {done ? <Done label={done} /> : null}
      </div>
      <div className="bg-[var(--amw-accent)] mt-4 h-1.5 rounded-full" />
      <Figures figures={figures} />
    </div>
  )
}

// A short list, each row done or tagged.
function RowsArtifact({ title, meta, rows = [] }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-4">
        <CardTitle title={title} />
        {meta ? (
          <span className={cn('shrink-0 text-sm tabular-nums', muted)}>
            {meta}
          </span>
        ) : null}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3">
            {row.mark ? (
              <span className="bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] grid h-8 w-8 shrink-0 place-items-center rounded-full font-[family-name:var(--amw-mono)] text-[11px] font-medium">
                {row.mark}
              </span>
            ) : null}
            <div className="min-w-0 flex-1 text-sm">
              <p className={cn('truncate font-medium', heading)}>{row.name}</p>
              {row.role ? (
                <p className={cn('truncate', muted)}>{row.role}</p>
              ) : null}
            </div>
            {row.done ? (
              <Done label={row.done} />
            ) : row.tag ? (
              <span className={pill}>{row.tag}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

const TICK = {
  done: 'bg-[var(--amw-accent)] text-zinc-950',
  doing: 'border border-[var(--amw-accent)]',
  todo: 'border border-zinc-300 dark:border-zinc-600',
}

// An outline whose sections are done, in progress or still to do.
function OutlineArtifact({ title, sub, sections = [], foot }) {
  return (
    <div className={card}>
      <CardTitle title={title} sub={sub} large />
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {sections.map((section) => {
          const state = TICK[section.state] ? section.state : 'todo'
          return (
            <li
              key={section.label}
              data-section-state={state}
              className="flex min-w-0 items-center gap-2 rounded-[12px] bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                  TICK[state]
                )}
              >
                {state === 'done' ? (
                  <Check
                    className="h-2.5 w-2.5"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                ) : null}
                {state === 'doing' ? (
                  <span className="bg-[var(--amw-accent)] h-1.5 w-1.5 rounded-full" />
                ) : null}
              </span>
              <span
                className={cn('truncate', state === 'todo' ? muted : heading)}
              >
                {section.label}
              </span>
            </li>
          )
        })}
      </ul>
      {foot ? <p className={cn('mt-4 text-sm', muted)}>{foot}</p> : null}
    </div>
  )
}

// A status pill, a meter and its figures.
function MeterArtifact({
  title,
  sub,
  badge,
  meterLabel,
  meterValue,
  pct = 0,
  figures,
}) {
  const width = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-4">
        <CardTitle title={title} sub={sub} large />
        {badge ? (
          <span className={cn(pill, 'py-1', heading)}>
            <span className="bg-[var(--amw-accent)] h-1.5 w-1.5 rounded-full" />
            {badge}
          </span>
        ) : null}
      </div>
      {meterLabel || meterValue ? (
        <div className="mt-5 flex items-center justify-between gap-4 text-sm">
          <span className={muted}>{meterLabel}</span>
          <span className={cn('tabular-nums', heading)}>{meterValue}</span>
        </div>
      ) : null}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          data-meter-fill=""
          className="bg-[var(--amw-accent)] h-full rounded-full"
          style={{ width: `${width}%` }}
        />
      </div>
      <Figures figures={figures} />
    </div>
  )
}

const KINDS = {
  progress: ProgressArtifact,
  rows: RowsArtifact,
  outline: OutlineArtifact,
  meter: MeterArtifact,
}

/* An artifact card's fade-and-rise. useReducedMotion says "reduced" on the
   server and on the first client render, and only then settles on the
   reader's setting, so `initial` -- read once, at mount -- cannot decide
   this. As gap-figure does, the target is worked out on every render: hidden
   only while motion is allowed and the card has not been reached yet, so a
   reduced-motion reader never sees it hidden at all. Hiding is instant,
   since it only happens before the card has been seen. */
function RailArtifact({ reduce, children }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const hidden = !reduce && !inView
  return (
    <motion.div
      ref={ref}
      data-rail-artifact=""
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={hidden ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={
        hidden || reduce
          ? { duration: 0 }
          : { duration: 0.6, ease: EASE, delay: 0.06 }
      }
      aria-hidden="true"
      className="mt-6 lg:col-span-5 lg:col-start-6 lg:mt-0"
    >
      {children}
    </motion.div>
  )
}

export function StepsRail({ steps = [], className }) {
  const reduce = useReducedMotion()
  const [reached, setReached] = useState(-1)

  const reach = (index) => setReached((current) => Math.max(current, index))

  return (
    <ol
      data-steps-rail=""
      className={cn('space-y-16 lg:space-y-24', className)}
    >
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        const lit = reduce || reached >= index
        const when = [step.day, step.effort].filter(Boolean).join(' · ')
        const Artifact = step.artifact ? KINDS[step.artifact.kind] : null
        return (
          <li key={step.title} className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="hidden lg:col-span-2 lg:block">
              <p
                className={cn(
                  'text-xl font-medium tracking-tight sm:text-2xl',
                  muted
                )}
              >
                {step.day}
              </p>
              {step.effort ? (
                <p className={cn('mt-2 text-sm', muted)}>{step.effort}</p>
              ) : null}
            </div>
            <motion.div
              onViewportEnter={() => reach(index)}
              viewport={{ once: true, margin: '0px 0px -30% 0px' }}
              className="relative pl-10 lg:col-span-10 lg:grid lg:grid-cols-10 lg:gap-8 lg:pl-12"
            >
              {!last ? (
                <span
                  aria-hidden="true"
                  className="bg-[var(--amw-line)] absolute top-[20px] left-[5px] h-[calc(100%+4rem)] w-px overflow-hidden sm:top-[22px] lg:top-[21px] lg:h-[calc(100%+6rem)]"
                >
                  <motion.span
                    data-rail-fill=""
                    initial={false}
                    animate={{ scaleY: reduce || reached > index ? 1 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
                    className="bg-[var(--amw-accent)] absolute inset-0 origin-top"
                  />
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className="bg-[var(--amw-page)] absolute top-[9px] left-0 flex h-[11px] w-[11px] items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 sm:top-[11px]"
              >
                <motion.span
                  data-rail-fill=""
                  initial={false}
                  animate={{ scale: lit ? 1 : 0 }}
                  transition={{
                    duration: reduce ? 0 : 0.35,
                    ease: EASE,
                    delay: lit && index > 0 && !reduce ? 0.55 : 0,
                  }}
                  className="bg-[var(--amw-accent)] absolute -inset-px rounded-full"
                />
              </span>

              <div className="lg:col-span-4">
                <h3
                  className={cn(
                    'text-xl font-medium tracking-tight sm:text-2xl',
                    heading
                  )}
                >
                  {step.title}
                </h3>
                {when ? (
                  <p className={cn('mt-1 text-sm lg:hidden', muted)}>{when}</p>
                ) : null}
                <p
                  className={cn(
                    'text-pretty mt-3 max-w-sm text-sm leading-relaxed sm:text-base',
                    muted
                  )}
                >
                  {step.body}
                </p>
              </div>
              {Artifact ? (
                <RailArtifact reduce={reduce}>
                  <Artifact {...step.artifact} />
                </RailArtifact>
              ) : null}
            </motion.div>
          </li>
        )
      })}
    </ol>
  )
}

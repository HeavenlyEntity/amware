'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

import { fmtPct } from '@/components/founders/format'
import CountUp from '@/components/react-bits/count-up'

/* The stake through the rounds for one path, as bars scaled by transform
   (never height). Starts from the offer when present, otherwise from the
   band midpoint. */

const ROUND_LABELS = {
  today: 'Today',
  seed: 'Seed',
  series_a: 'A',
  series_b: 'B',
  series_c: 'C',
  series_d: 'D',
  ipo: 'IPO',
}

export function RoundsTimeline({ rounds, hasOffer, pathLabel }) {
  const reduce = useReducedMotion()
  const series = rounds.map((r) => ({
    key: r.round,
    label: ROUND_LABELS[r.round] ?? r.round,
    value: hasOffer && r.stakeOffer !== null ? r.stakeOffer : r.stakeMid,
  }))
  if (series.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No priced rounds assumed on this path. Your stake stays where it is
        until an exit.
      </p>
    )
  }
  const max = Math.max(...series.map((s) => s.value), 0.0001)

  return (
    <figure className="m-0">
      <figcaption className="text-xs text-zinc-500 dark:text-zinc-400">
        Your stake through the rounds ({pathLabel}),{' '}
        {hasOffer ? 'from the offer' : 'from the band midpoint'}
      </figcaption>
      <div className="mt-3 flex h-24 items-end gap-2" role="list">
        {series.map((point, index) => (
          <div
            key={point.key}
            className="flex flex-1 flex-col items-center"
            role="listitem"
          >
            <span className="amw-mono mb-1 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
              <CountUp
                key={`${pathLabel}-${point.key}-${point.value}`}
                to={point.value}
                duration={0.8}
                format={fmtPct}
              />
            </span>
            <div className="relative h-14 w-full">
              <motion.span
                aria-hidden="true"
                className="bg-[var(--amw-line-strong)] absolute inset-x-0 bottom-0 origin-bottom rounded-t-sm"
                style={{ height: '100%' }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: point.value / max }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              />
            </div>
            <span className="amw-mono mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

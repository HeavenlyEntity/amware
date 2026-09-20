'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

import { ExampleLadder } from '@/components/founders/example-ladder'
import { GapFigure } from '@/components/founders/gap-figure'
import { EXAMPLE_READ } from '@/lib/founders/equity/engine'
import { SOURCES } from '@/lib/founders/equity/benchmarks'

const LANDING_SOURCES = ['carta', 'index', 'yc']

/* The landing's composition: the heading block (server-rendered children)
   fades up on mount, and under it ONE anchor panel holding both of the desk's
   outputs for the same canonical example: the equity gap, then the ask that
   gap supports. The figure reads the example from the engine and the rungs
   arrive as plain data computed in the page, so the hero can never disagree
   with either tool it advertises.

   TWO FIGURES, ONE PANEL. Two panels would read as two products; the desk is
   one path with two stops. The hairline between them is the join, not a
   border around a card. */

const easeOut = [0.16, 1, 0.3, 1]

export function DeskHero({
  children,
  ladder = null,
  ladderNote = null,
  cashSource = null,
}) {
  const reduce = useReducedMotion()
  const read = EXAMPLE_READ
  const lo = read.offer.range.lo
  const hi = read.offer.range.hi
  const offer = read.offer.pct
  const gap = read.offer.gapPts
  const callout =
    gap && gap[0] > 0
      ? `${gap[0]}–${gap[1]} points below the band for this work`
      : null

  return (
    <div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        {children}
      </motion.div>
      <div className="bg-[var(--amw-muted)] mt-12 rounded-2xl p-6 md:p-8">
        <GapFigure
          lo={lo}
          hi={hi}
          offer={offer}
          caption={`Example · fractional CTO converting at pre-seed · offered ${offer}% · founder-level band ${lo}–${hi}%`}
          callout={callout}
          animate
        />
        {ladder && (
          <div className="border-[var(--amw-line)] mt-8 border-t pt-8">
            <ExampleLadder rungs={ladder} note={ladderNote} />
          </div>
        )}
        <p className="amw-kicker mt-8 text-zinc-500 dark:text-zinc-400">
          Benchmarks:{' '}
          {LANDING_SOURCES.map((id, i) => {
            const s = SOURCES.find((x) => x.id === id)
            if (!s) return null
            return (
              <span key={id}>
                {i > 0 && ' · '}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--amw-accent-ink)] underline decoration-dotted underline-offset-4"
                >
                  {s.name}
                </a>{' '}
                {s.asOf}
              </span>
            )
          })}
          {cashSource && ` · ${cashSource}`}
        </p>
      </div>
    </div>
  )
}

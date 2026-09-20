'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* The one figure the desk is about: a thin axis, the benchmark band as a
   soft accent fill with accent edges, and the offer as an ink marker.
   Shared by the landing hero (example data) and the results evidence
   layer (the user's read), so the two can never disagree visually.
   Motion (optional): the marker springs in from the axis' left edge when
   the figure enters view, then the gap callout fades in. Under reduced
   motion everything renders at rest. Scale and whitespace carry the
   hierarchy; there are no shadows. Prints in monochrome via tokens.

   THE OFFER LABEL SITS ON ITS OWN ROW. All four labels are centred on their
   own value, so whenever the offer lands near a band edge they overlap: the
   landing's own example (offered 3% against a band opening at 8.5%) collided
   into "offered 3%.5%" at 375px. Giving the offer its own row fixes it at
   every width without measuring anything, and the marker line already ties
   the label to its position. */

const pct = (value, max) => `${Math.min(Math.max(value / max, 0), 1) * 100}%`

export function GapFigure({
  lo,
  hi,
  offer = null,
  axisMax = 30,
  caption = null,
  callout = null,
  animate = false,
  compact = false,
  className = '',
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const shouldAnimate = animate && !reduce
  const hasOffer = typeof offer === 'number' && Number.isFinite(offer)

  const ticks = [0, axisMax / 2, axisMax]

  return (
    <figure ref={ref} className={`m-0 ${className}`}>
      {caption && (
        <figcaption className="amw-kicker mb-5">{caption}</figcaption>
      )}
      <div
        className={`relative ${compact ? 'h-12' : 'h-16'}`}
        role="img"
        aria-label={
          hasOffer
            ? `Benchmark band ${lo} to ${hi} percent; offered ${offer} percent`
            : `Benchmark band ${lo} to ${hi} percent`
        }
      >
        {/* axis */}
        <span
          aria-hidden="true"
          className="bg-[var(--amw-line-strong)] absolute inset-x-0 top-1/2 h-px"
        />
        {/* band */}
        <span
          aria-hidden="true"
          className="bg-[var(--amw-accent-soft)] border-[var(--amw-accent-ink)] absolute top-1/2 h-6 -translate-y-1/2 border-x-2"
          style={{ left: pct(lo, axisMax), width: pct(hi - lo, axisMax) }}
        />
        {/* band labels */}
        <span
          aria-hidden="true"
          className="amw-mono absolute top-full mt-1.5 -translate-x-1/2 text-sm tabular-nums text-zinc-700 dark:text-zinc-300"
          style={{ left: pct(lo, axisMax) }}
        >
          {lo}%
        </span>
        <span
          aria-hidden="true"
          className="amw-mono absolute top-full mt-1.5 -translate-x-1/2 text-sm tabular-nums text-zinc-700 dark:text-zinc-300"
          style={{ left: pct(hi, axisMax) }}
        >
          {hi}%
        </span>
        {/* axis ticks */}
        {ticks.map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="amw-mono absolute bottom-full mb-1 -translate-x-1/2 text-[10px] text-zinc-600 dark:text-zinc-400"
            style={{ left: pct(tick, axisMax) }}
          >
            {tick}%
          </span>
        ))}
        {/* offer marker */}
        {hasOffer && (
          <motion.span
            aria-hidden="true"
            className="bg-[var(--amw-ink)] absolute top-1/2 h-11 w-[3px] -translate-y-1/2 rounded-full"
            initial={shouldAnimate ? { left: '0%', opacity: 0 } : false}
            animate={
              shouldAnimate && inView
                ? { left: pct(offer, axisMax), opacity: 1 }
                : { left: pct(offer, axisMax), opacity: 1 }
            }
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 18,
              mass: 0.6,
            }}
            style={shouldAnimate ? undefined : { left: pct(offer, axisMax) }}
          />
        )}
        {hasOffer && (
          <span
            aria-hidden="true"
            className="amw-mono absolute top-full mt-7 -translate-x-1/2 whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
            style={{ left: pct(offer, axisMax) }}
          >
            offered {offer}%
          </span>
        )}
      </div>
      {callout && (
        <motion.p
          className={`${
            hasOffer ? 'mt-16' : 'mt-9'
          } text-base font-semibold text-zinc-900 dark:text-zinc-50`}
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={shouldAnimate && !inView ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {callout}
        </motion.p>
      )}
    </figure>
  )
}

'use client'

import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* Ported from the "testimonials with carousel" block: a heading row with
   round previous/next arrows over a three-up grid of quote cards that blur
   in and out as the page turns. Rebranded onto the amw tokens.

   It renders whatever it is handed, and what it is handed is
   content/site/testimonials.js. The block's own sample people and stock
   avatars never ship: invented testimonials on a sales page would be fake
   reviews. No photos are on file, so initials stand in for the avatar.

   Pages only turn when the visitor asks, so nothing moves on its own and no
   pause control is needed. Under reduced motion the page simply swaps. */

const PER_PAGE = 3

function initials(name) {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function ArrowButton({ label, controls, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      onClick={onClick}
      className="focus-visible:ring-[var(--amw-accent)] size-11 border-zinc-900/15 flex items-center justify-center rounded-full border text-zinc-900 transition duration-200 hover:bg-zinc-900/5 focus-visible:outline-none focus-visible:ring-2 active:scale-95 motion-reduce:active:scale-100 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-white/10"
    >
      {children}
    </button>
  )
}

export function TestimonialsWithCarousel({
  eyebrow,
  title,
  items,
  perPage = PER_PAGE,
  className = '',
}) {
  const headingId = useId()
  const gridId = useId()
  const reduce = useReducedMotion()
  const [page, setPage] = useState(0)

  if (!items?.length) return null

  const pages = Math.ceil(items.length / perPage)
  const start = page * perPage
  const visible = items.slice(start, start + perPage)
  const turn = (step) => setPage((p) => (p + step + pages) % pages)

  return (
    <section aria-labelledby={headingId} className={className}>
      {eyebrow && <p className="amw-eyebrow mb-4">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-4">
        <h2
          id={headingId}
          style={{ fontFamily: 'Layer, sans-serif' }}
          className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl"
        >
          {title}
        </h2>
        {pages > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <ArrowButton
              label="Previous testimonials"
              controls={gridId}
              onClick={() => turn(-1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </ArrowButton>
            <ArrowButton
              label="Next testimonials"
              controls={gridId}
              onClick={() => turn(1)}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </ArrowButton>
          </div>
        )}
      </div>

      <p role="status" className="sr-only">
        {`Showing ${start + 1} to ${start + visible.length} of ${items.length}`}
      </p>

      <ul id={gridId} className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((item, index) => (
            <motion.li
              key={item.name}
              className="flex"
              initial={
                reduce ? false : { opacity: 0, y: 10, filter: 'blur(10px)' }
              }
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, y: 10, filter: 'blur(10px)' }
              }
              transition={
                reduce ? { duration: 0 } : { duration: 0.5, delay: index * 0.1 }
              }
            >
              <figure className="bg-[var(--amw-muted)] flex w-full flex-col justify-between rounded-2xl p-6 md:p-8">
                {/* Quotation markup only where there is a quotation, the rule
                    the homepage rail follows too. */}
                {item.verbatim ? (
                  <blockquote className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                    &ldquo;{item.description}&rdquo;
                  </blockquote>
                ) : (
                  <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {item.description}
                  </p>
                )}
                <figcaption className="mt-10 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="amw-mono bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] size-9 flex shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  >
                    {initials(item.name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </span>
                    {item.role && (
                      <span className="amw-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {item.role}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}

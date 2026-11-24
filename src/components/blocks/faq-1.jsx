'use client'

/* React Bits Pro "FAQ 1", adapted: the questions and the heading column come
   in as props, the demo questions and the section chrome (padding,
   min-height, background) are gone, and the neutrals are the `.amw` tokens.
   An answer is a node, so it can carry a link. Each question is a button
   inside a heading, tied to its panel. */

import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

const heading = 'text-zinc-950 dark:text-white'
const muted = 'text-zinc-600 dark:text-zinc-400'

/* The heading column and the questions fade and rise in turn.
   useReducedMotion says "reduced" on the server and on the first client
   render, and only then settles on the reader's setting, so `initial` --
   read once, at mount -- cannot decide this. As the steps rail does, the
   target is worked out on every render: hidden only while motion is allowed
   and the block has not been reached yet, so a reduced-motion reader never
   sees it hidden. Hiding is instant, since it only happens before the block
   has been seen. */
export function FaqSplit({
  items = [],
  defaultOpen = 0,
  eyebrow,
  title,
  copy,
  className,
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [openIndex, setOpenIndex] = useState(defaultOpen)
  const hidden = !reduce && !inView
  const aside = Boolean(eyebrow || title || copy)

  if (!items.length && !aside) return null

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: hidden ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 },
    transition:
      hidden || reduce ? { duration: 0 } : { duration: 0.6, ease: EASE, delay },
  })

  const toggle = (index) =>
    setOpenIndex((current) => (current === index ? null : index))

  return (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-1 gap-12',
        aside && 'lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-20',
        className
      )}
    >
      {aside ? (
        <motion.div
          data-faq-part=""
          {...rise(0)}
          className="flex flex-col lg:sticky lg:top-24 lg:self-start"
        >
          {eyebrow ? (
            <p className="text-[var(--amw-accent-ink)] mb-4 font-[family-name:var(--amw-mono)] text-xs font-medium uppercase tracking-[0.14em]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2
              className={cn(
                'text-balance text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl',
                heading
              )}
            >
              {title}
            </h2>
          ) : null}
          {copy ? (
            <p
              className={cn(
                'mt-5 max-w-[30ch] text-base leading-relaxed sm:text-lg',
                muted
              )}
            >
              {copy}
            </p>
          ) : null}
        </motion.div>
      ) : null}

      {items.length ? (
        <div className="flex flex-col gap-2">
          {items.map((faq, index) => {
            const isOpen = openIndex === index
            const buttonId = `${id}-q-${index}`
            const panelId = `${id}-a-${index}`
            return (
              <motion.div
                key={faq.question}
                data-faq-part=""
                {...rise(0.06 + index * 0.06)}
                className={cn(
                  'rounded-2xl transition-colors duration-200',
                  isOpen
                    ? 'bg-[color-mix(in_srgb,var(--amw-ink)_7%,var(--amw-muted))]'
                    : 'bg-[var(--amw-muted)] hover:bg-[color-mix(in_srgb,var(--amw-ink)_7%,var(--amw-muted))]'
                )}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-2xl px-6 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--amw-accent)] sm:px-8 sm:py-7"
                  >
                    <span
                      className={cn(
                        'text-base font-medium sm:text-lg',
                        heading
                      )}
                    >
                      {faq.question}
                    </span>
                    <motion.span
                      aria-hidden="true"
                      initial={false}
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                      className={cn(
                        'mt-0.5 shrink-0 transition-colors duration-200',
                        isOpen ? 'text-[var(--amw-accent-ink)]' : muted
                      )}
                    >
                      <ChevronDown className="h-5 w-5" strokeWidth={1.75} />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: reduce ? 0 : 0.35, ease: EASE },
                        opacity: { duration: reduce ? 0 : 0.25, ease: EASE },
                      }}
                      className="overflow-hidden"
                    >
                      <div
                        className={cn(
                          'px-6 pb-6 pr-12 text-sm leading-relaxed sm:px-8 sm:pb-7 sm:pr-16 sm:text-base',
                          muted,
                          '[&_a]:text-[var(--amw-accent-ink)] [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-[color:var(--amw-accent)]'
                        )}
                      >
                        {faq.answer}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

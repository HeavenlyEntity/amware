'use client'

import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { Pattern } from '@/components/ui/pattern'
import { Avatar } from './avatar'

/* Ported from the studio template's BigTestimonial: one featured quote in
   a dark card between two columns of supporting cards. The featured
   quote's words rise into place as the card scrolls through the viewport;
   that follows the visitor's own scrolling, and it turns off under reduced
   motion or the footer's pause, leaving plain text.

   The template's blue card is fixed zinc-950 here, not --amw-ink: ink is
   the text colour and turns near-white in dark mode. The glow is the
   brand accent. It renders what it is handed
   (lib/testimonials/services-testimonials.js): placeholders in dev and on
   previews, the real clients in production. */

function RevealWord({ word, index, total, scrollYProgress }) {
  const t = Math.max(total, 1)
  const stagger = 0.78
  const start = (index / t) * stagger
  const end = Math.min(start + (1 / t) * (1 - stagger) + 0.12, 1)
  const opacity = useTransform(scrollYProgress, [0, start, end], [0.08, 0.2, 1])
  const y = useTransform(scrollYProgress, [0, start, end], [18, 8, 0])
  return (
    <motion.span className="inline-block" style={{ opacity, y }}>
      {word}
    </motion.span>
  )
}

function PartnerPill({ partner }) {
  const className =
    'inline-flex w-fit max-w-full items-center gap-2.5 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5'
  const body = (
    <>
      <span className="size-5 bg-white/15 sm:size-6 flex shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white sm:text-xs">
        {partner.letter ?? partner.name[0]}
      </span>
      <span className="min-w-0 border-l border-white/20 pl-2.5 text-left sm:pl-3">
        <span className="block text-xs font-semibold tracking-tight text-white sm:text-sm">
          {partner.name}
        </span>
      </span>
    </>
  )
  return partner.href ? (
    <a
      href={partner.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:bg-white/15 transition-colors`}
    >
      {body}
    </a>
  ) : (
    <span className={className}>{body}</span>
  )
}

/* Quotation markup only where there is a quotation. */
function Quote({ verbatim, className, children }) {
  return verbatim ? (
    <blockquote className={className}>{children}</blockquote>
  ) : (
    <div className={className}>{children}</div>
  )
}

/* Role lines never truncate: "Former supervisor" is the context that keeps
   an employment reference from reading as a client endorsement. */
function SupportingCard({ testimonial }) {
  return (
    <figure className="bg-[var(--amw-card)] ring-[var(--amw-line)] relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-2xl p-5 shadow-sm shadow-black/10 ring-1 md:p-6">
      <Quote verbatim={testimonial.verbatim} className="relative">
        <p className="text-pretty text-[0.95rem]/6 md:text-base/7 font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
          {testimonial.verbatim ? (
            <>&ldquo;{testimonial.excerpt}&rdquo;</>
          ) : (
            testimonial.excerpt
          )}
        </p>
      </Quote>
      <figcaption className="flex items-center gap-3">
        <Avatar person={testimonial} className="size-9" size={36} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {testimonial.name}
          </p>
          {testimonial.designation && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {testimonial.designation}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  )
}

export function BigTestimonial({ featured, supporting }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.88', 'end 0.35'],
  })
  const words = useMemo(
    () => (featured?.quote ?? '').split(/\s+/).filter(Boolean),
    [featured?.quote]
  )
  const footerReveal = useTransform(scrollYProgress, [0.22, 0.52], [0.4, 1])
  const footerY = useTransform(scrollYProgress, [0.22, 0.52], [14, 0])

  if (!featured) return null
  const { topLeft, bottomLeft, topRight, bottomRight } = supporting ?? {}
  const quoteClass =
    'relative text-pretty text-lg/7 font-medium tracking-[-0.02em] text-white/95 md:text-xl/8 lg:text-lg'

  return (
    <section
      aria-label="Testimonials"
      className="relative mx-auto max-w-[calc(72rem-6px)] px-1 pt-4 md:pt-10"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch md:gap-1">
        <div className="order-2 flex flex-col gap-4 md:order-1 md:gap-1">
          {topLeft && <SupportingCard testimonial={topLeft} />}
          {bottomLeft && <SupportingCard testimonial={bottomLeft} />}
        </div>

        <figure
          ref={ref}
          className="bg-zinc-950 relative isolate order-1 overflow-hidden rounded-2xl py-6 text-white shadow-md shadow-black/10 [--pattern-fg:rgb(255_255_255/0.05)] dark:ring-1 dark:ring-white/10 md:order-2 md:py-10"
        >
          <div className="pointer-events-none absolute inset-0">
            <Pattern />
          </div>
          <div
            aria-hidden="true"
            className="bg-[var(--amw-accent)] h-112 md:w-md pointer-events-none absolute -top-24 right-[-10%] w-48 rounded-full opacity-40 blur-3xl"
          />
          <div className="relative z-10 flex h-full flex-col gap-8 px-5 md:gap-10 md:px-8">
            {featured.partner && <PartnerPill partner={featured.partner} />}
            <Quote verbatim={featured.verbatim} className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1 -top-2 text-[clamp(2.5rem,8vw,4.5rem)] leading-none text-white/10 md:-left-2 md:-top-4"
              >
                &ldquo;
              </span>
              {reduce ? (
                <p className={quoteClass}>{featured.quote}</p>
              ) : (
                <p className={quoteClass}>
                  <span className="sr-only">{featured.quote}</span>
                  <span
                    aria-hidden="true"
                    className="[&>span]:mb-[0.35em] [&>span]:mr-[0.3em]"
                  >
                    {words.map((word, i) => (
                      <RevealWord
                        key={i}
                        word={word}
                        index={i}
                        total={words.length}
                        scrollYProgress={scrollYProgress}
                      />
                    ))}
                  </span>
                </p>
              )}
            </Quote>
            <motion.figcaption
              style={reduce ? undefined : { opacity: footerReveal, y: footerY }}
              className="mt-auto flex flex-row items-center gap-3 md:gap-4"
            >
              <Avatar
                person={featured}
                tone="dark"
                className="size-11 sm:size-12 ring-1 ring-white/20"
                size={48}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm/5 font-semibold tracking-tight text-white">
                  {featured.name}
                </p>
                {featured.designation && (
                  <p className="text-xs/4 text-white/60">
                    {featured.designation}
                  </p>
                )}
              </div>
            </motion.figcaption>
          </div>
        </figure>

        <div className="order-3 flex flex-col gap-4 md:gap-1">
          {topRight && <SupportingCard testimonial={topRight} />}
          {bottomRight && <SupportingCard testimonial={bottomRight} />}
        </div>
      </div>
    </section>
  )
}

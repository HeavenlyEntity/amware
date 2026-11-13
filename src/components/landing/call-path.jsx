'use client'

import { useId } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import '@/styles/call-path.css'

/* "// HOW IT STARTS": the free call path under the Anti-Slop Alec cards
   (design: HomePricing.dc.html, 2026-11-13). Two free calls on a lit rail,
   then the steps that only happen if it is a fit. It replaced the line that
   said a deposit holds your start: both calls are free now, and the only
   deposit is the Codebase Diagnostic's, refunded in full if Alec can't help.

   The rail runs across on wide screens and down the left edge on phones;
   its moving dot and the ring on step one stop under reduced motion. */

export const CALL_PATH = [
  {
    name: 'Intro call',
    time: '15 min',
    tag: 'Free',
    kind: 'free',
    what: 'A quick hello. We see whether we’re a fit.',
  },
  {
    name: 'Strategy call',
    time: '45 min',
    tag: 'Free',
    kind: 'free',
    what: 'Your app, your problems and your goals. You leave with the next move.',
  },
  {
    name: 'Codebase Diagnostic',
    time: '7 days',
    tag: 'Refundable deposit',
    kind: 'refund',
    what: 'I dig through the code and hosting. The deposit is fully refunded if I can’t help.',
  },
  {
    name: 'Stabilization Sprint',
    time: 'Fixed scope',
    tag: 'Fixed price',
    kind: 'paid',
    what: 'The fix plan, done. The price is agreed before work starts.',
  },
  {
    name: 'Retainer',
    time: 'Monthly',
    tag: 'Advisor to Embedded',
    kind: 'paid',
    what: 'I stay on as your fractional CTO so it stays fixed.',
  },
]

const ctaClass =
  'bg-[var(--amw-accent)] text-zinc-950 group inline-flex items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg'

function CtaLabel() {
  return (
    <>
      <span>Book a free intro call</span>
      <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110">
        <ChevronRight className="relative left-px h-4 w-4" aria-hidden="true" />
      </span>
    </>
  )
}

export function CallPath({ booking }) {
  const titleId = useId()
  return (
    <section className="cp" aria-labelledby={titleId}>
      <div className="cp-row">
        <p className="cp-eyebrow">{'// How it starts'}</p>
        <span aria-hidden="true" className="cp-rule" />
        <p className="amw-kicker">Two free calls first</p>
      </div>
      <h3 id={titleId} className="cp-title">
        Find out if I can help before you spend a dollar.
      </h3>
      <p className="cp-sub">
        Every retainer starts the same way: two free calls, with no deposit and
        no card, then a next step only if we’re a fit.
      </p>

      <div className="cp-brackets" aria-hidden="true">
        <span className="cp-bracket" data-free="yes">
          <b>Free</b>No deposit, no card
        </span>
        <span className="cp-bracket">
          Only if we’re a fit · scoped before it starts
        </span>
      </div>

      <div className="cp-path">
        <span className="cp-rail" aria-hidden="true" />
        <span className="cp-rail-free" aria-hidden="true">
          <span className="cp-pulse" />
        </span>
        <ol className="cp-track" aria-label="How an engagement starts">
          {CALL_PATH.map((step, i) => (
            <li
              key={step.name}
              className="cp-step"
              data-kind={step.kind}
              data-here={i === 0 ? 'yes' : undefined}
            >
              <span className="cp-node" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="cp-card">
                <span className="cp-tag" data-kind={step.kind}>
                  {step.tag}
                </span>
                <p className="cp-name">{step.name}</p>
                <p className="cp-time">{step.time}</p>
                <p className="cp-what">{step.what}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="cp-cta">
        {booking ? (
          <BookCallButton
            calLink={booking.link}
            namespace={`${booking.namespace}-home`}
            serviceName="Intro call"
            notes="Engagement: not sure yet (from the home page)"
            className={ctaClass}
          >
            <CtaLabel />
          </BookCallButton>
        ) : (
          <Link href="/contact" className={ctaClass}>
            <CtaLabel />
          </Link>
        )}
        <p className="amw-kicker">Intro call · 15 min · free</p>
        <Link href="/services" className="cp-quiet">
          Compare engagements <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

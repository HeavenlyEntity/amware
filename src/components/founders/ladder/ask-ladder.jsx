'use client'

import Link from 'next/link'
import { useReducedMotion } from '@/components/AccessibilityProvider'

import CountUp from '@/components/react-bits/count-up'
import { fmtMoney, fmtPct, fmtPts } from '@/components/founders/format'
import { EQUITY_HREF } from '@/lib/founders/tools'
import { headlineFor } from './headline'

/*
 * The ask, and its defence.
 *
 * ORDER (design review DD3). The user asked one question, so it gets answered
 * once at display scale before anything defends it: the verdict, then the three
 * rungs as evidence, then the trade, then the floor note. The equity calculator
 * next door uses the same Verdict-then-Evidence shape.
 *
 * THE TARGET IS DOMINANT BY SCALE AND WEIGHT, NEVER BY FILL. The first
 * wireframe put the accent fill on the ceiling row, and in this design system a
 * teal fill reads as "selected", so the screen quietly recommended the
 * aggressive ask to someone who arrived anxious. DESIGN.md budgets teal for
 * selected controls, the primary CTA and figure bands; on this page it is spent
 * on the user's own marker and the CTA. Hierarchy here comes from type size.
 *
 * ROWS, NOT CARDS. Three cards would trigger the hard-rejection rule about app
 * UI built from stacked cards, and DESIGN.md already says cards earn their
 * existence. This is one connected table with hairline rules.
 */

/* Derived numbers say so. On most paths two of the three rungs are derived,
   because no free source publishes quartiles for these seats, so leaving them
   unmarked would overclaim exactly where the plan promises not to (DD8). */
function Est({ confidence }) {
  if (confidence === 'sourced') return null
  return (
    <span className="amw-kicker ml-1.5" title={`This figure is ${confidence}`}>
      est.
    </span>
  )
}

function Rung({ rung, dominant, suppressCount, note }) {
  const reduce = useReducedMotion()
  const cash = dominant ? (
    <CountUp
      to={rung.cash}
      duration={0.9}
      reduce={reduce || suppressCount}
      /* Whole thousands only: an intermediate frame reading $212.04k looks
         like a bug rather than an animation. */
      format={(n) => fmtMoney(Math.round(n / 1000) * 1000)}
    />
  ) : (
    fmtMoney(rung.cash)
  )

  return (
    <div
      className={`border-[var(--amw-line)] grid grid-cols-1 gap-x-6 gap-y-3 border-b px-5 py-5 last:border-b-0 sm:grid-cols-[minmax(9rem,1fr)_1fr_1fr] sm:items-baseline sm:px-6 ${
        dominant ? 'bg-[var(--amw-card)]' : ''
      }`}
    >
      <p
        className={`amw-kicker ${
          dominant ? 'text-zinc-900 dark:text-zinc-100' : ''
        }`}
      >
        {rung.label}
      </p>

      <p className="m-0">
        <span
          className={`amw-price block tracking-tight text-zinc-900 dark:text-zinc-100 ${
            dominant
              ? 'text-3xl font-medium md:text-4xl'
              : 'text-xl font-normal md:text-2xl'
          }`}
        >
          {cash}
        </span>
        <span className="amw-kicker mt-1 block">
          base cash
          <Est confidence={rung.cashConfidence} />
        </span>
      </p>

      <p className="m-0">
        <span
          className={`amw-price block tracking-tight text-zinc-900 dark:text-zinc-100 ${
            dominant
              ? 'text-3xl font-medium md:text-4xl'
              : 'text-xl font-normal md:text-2xl'
          }`}
        >
          {fmtPct(rung.equityPct)}
        </span>
        <span className="amw-kicker mt-1 block">
          fully diluted, at this cash
          <Est confidence={rung.equityConfidence} />
        </span>
      </p>

      {note && (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:col-span-3">
          {note}
        </p>
      )}
    </div>
  )
}

/* Where their current offer sits, so the tool does the subtraction instead of
   asking someone anxious to do it from memory. This is the one place the accent
   is spent, because it is the only row that is about them. */
function OfferMarker({ ask }) {
  const { offer, target } = ask
  if (!offer) return null
  const cashDelta = offer.vsTarget.cash
  const equityDelta = offer.vsTarget.equityPts

  return (
    <div className="bg-[var(--amw-accent-soft)] border-[var(--amw-accent)] grid grid-cols-1 gap-x-6 gap-y-2 border-t-2 px-5 py-5 sm:grid-cols-[minmax(9rem,1fr)_1fr_1fr] sm:items-baseline sm:px-6">
      <p className="amw-kicker text-[var(--amw-accent-ink)]">
        On the table now
      </p>
      <p className="m-0">
        <span className="amw-price block text-xl tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">
          {offer.cash === null ? '—' : fmtMoney(offer.cash)}
        </span>
        {cashDelta !== null && cashDelta > 0 && (
          <span className="amw-kicker mt-1 block">
            {fmtMoney(cashDelta)} under the target
          </span>
        )}
      </p>
      <p className="m-0">
        <span className="amw-price block text-xl tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">
          {offer.equityPct === null ? '—' : fmtPct(offer.equityPct)}
        </span>
        {equityDelta !== null && equityDelta > 0 && (
          <span className="amw-kicker mt-1 block">
            {fmtPts(equityDelta)} under the target
          </span>
        )}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:col-span-3">
        {ask.sentences.offer}
      </p>
      <span className="sr-only">
        Target is {fmtMoney(target.cash)} and {fmtPct(target.equityPct)}{' '}
        percent.
      </span>
    </div>
  )
}

export function AskLadder({ ask, suppressCount = false }) {
  if (!ask) return null
  const headline = headlineFor(ask)
  const promoted = ask.flags.filter((f) => f.promoted)

  return (
    <section aria-labelledby="ask-verdict">
      {/* 1. The answer, once, at size. */}
      <h2
        id="ask-verdict"
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="amw-price text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl"
      >
        {ask.sentences.target}
      </h2>
      <p
        className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300 md:text-lg"
        data-headline={headline.id}
      >
        {headline.line}
      </p>

      {promoted.length > 0 && (
        <ul className="mt-5 max-w-2xl list-none space-y-2 p-0">
          {promoted.map((flag) => (
            <li
              key={flag.id}
              className="border-[var(--amw-line-strong)] border-l-2 pl-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              {flag.text}
            </li>
          ))}
        </ul>
      )}

      {/* 2. The rungs, as one connected ladder. */}
      <div className="border-[var(--amw-line)] mt-10 overflow-hidden rounded-2xl border">
        {ask.order.map((id) => (
          <Rung
            key={id}
            rung={ask[id]}
            dominant={id === 'target'}
            suppressCount={suppressCount}
            note={id === 'ceiling' ? ask.sentences.ceiling : null}
          />
        ))}
        <OfferMarker ask={ask} />
      </div>

      {/* 3. The trade, then 4. the floor note. */}
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {ask.sentences.trade}{' '}
        {/* The sentence above quotes two bands without saying where they came
            from, and "where did that come from" is the next thought. It runs
            off the same store, so the read opens on these answers rather than
            an empty wizard. */}
        <Link
          href={EQUITY_HREF}
          className="hover:text-[var(--amw-accent-ink)] whitespace-nowrap text-zinc-700 underline underline-offset-4 transition-colors dark:text-zinc-300"
        >
          See how the equity band was sized &rarr;
        </Link>
      </p>
      <p className="border-[var(--amw-line-strong)] mt-4 max-w-3xl border-l-2 pl-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {ask.sentences.floor}
      </p>
      {ask.sentences.tradeWarning && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {ask.sentences.tradeWarning}
        </p>
      )}
    </section>
  )
}

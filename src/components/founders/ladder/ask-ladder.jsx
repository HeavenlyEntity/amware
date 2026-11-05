'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

import '@/styles/founders-offer.css'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import CountUp from '@/components/react-bits/count-up'
import { fmtMoney, fmtPct } from '@/components/founders/format'
import { EQUITY_HREF } from '@/lib/founders/tools'
import { headlineFor } from './headline'

/*
 * The ask, and its defence, in the Offer board's look.
 *
 * ORDER (design review DD3). The user asked one question, so it gets answered
 * once at display scale before anything defends it: the verdict, then the three
 * rungs as evidence, then the trade, then the floor note.
 *
 * THE TARGET IS DOMINANT BY SCALE AND WEIGHT, NEVER BY FILL (spec fork F2,
 * option b). The board tints the target rung and its node teal and colours the
 * headline values; in this design system a teal fill reads as "selected", so
 * the screen would quietly recommend one rung to someone who arrived anxious.
 * The headline values, the target rung and its node are ink; teal is spent on
 * the one row that is about the reader (the offer) and on the CTA.
 *
 * ROWS, NOT CARDS. One connected list with hairline rules and a timeline down
 * the left, never three stacked cards.
 *
 * COUNTING (spec fork F8). The headline's cash and equity and the target
 * rung's cash count up, all three suppressed under reduced motion and on a
 * prefilled arrival (DD5: those values arrived, they did not change). The
 * headline's accessible name is the engine's finished sentence, never a frame
 * of the count.
 */

/* Derived numbers say so. On most paths two of the three rungs are derived,
   because no free source publishes quartiles for these seats, so leaving them
   unmarked would overclaim exactly where the plan promises not to (DD8). */
function Est({ confidence }) {
  if (confidence === 'sourced') return null
  return (
    <span className="amw-jo-est" title={`This figure is ${confidence}`}>
      est.
    </span>
  )
}

/* Whole thousands only: an intermediate frame reading $212.04k looks like a
   bug rather than an animation. */
const countCash = (n) => fmtMoney(Math.round(n / 1000) * 1000)

function CountedCash({ value, still }) {
  return <CountUp to={value} duration={0.9} reduce={still} format={countCash} />
}

/* The equity counts as `t × pct`, so the engine's grain (two decimals at
   most, via fmtPct) holds on every frame and on the last one. */
function CountedPct({ value, still }) {
  return <CountUp to={value} duration={0.9} reduce={still} format={fmtPct} />
}

function Rung({ rung, index, dominant, still, note }) {
  const size = dominant ? 'amw-jo-amt--big' : 'amw-jo-amt--sm'
  return (
    <li
      className="amw-jo-rung"
      data-main={dominant ? 'true' : undefined}
      data-rung={rung.id}
      style={{ '--d': `${0.08 + index * 0.12}s` }}
    >
      <span className="amw-jo-node" aria-hidden="true" />
      <p className="amw-wz-kicker amw-jo-rung-label">{rung.label}</p>

      <p className="m-0">
        <span className={`amw-price amw-jo-amt ${size}`}>
          {dominant ? (
            <CountedCash value={rung.cash} still={still} />
          ) : (
            fmtMoney(rung.cash)
          )}
        </span>
        <span className="amw-wz-kicker mt-1 block">
          base cash
          <Est confidence={rung.cashConfidence} />
        </span>
      </p>

      <p className="m-0">
        <span className={`amw-price amw-jo-amt ${size}`}>
          {fmtPct(rung.equityPct)}
        </span>
        <span className="amw-wz-kicker mt-1 block">
          fully diluted, at this cash
          <Est confidence={rung.equityConfidence} />
        </span>
      </p>

      {note && <p className="amw-jo-note">{note}</p>}
    </li>
  )
}

/* Where their current offer sits, so the tool does the subtraction instead of
   asking someone anxious to do it from memory. The one row that is about
   them, so it keeps the accent. */
function OfferMarker({ ask }) {
  const { offer, target } = ask
  if (!offer) return null
  const cashDelta = offer.vsTarget.cash
  const equityDelta = offer.vsTarget.equityPts

  return (
    <li className="amw-jo-table">
      <p className="amw-wz-kicker amw-wz-kicker--accent m-0">
        On the table now
      </p>
      <p className="m-0">
        <span className="amw-price amw-jo-amt amw-jo-amt--sm">
          {offer.cash === null ? '—' : fmtMoney(offer.cash)}
        </span>
        {cashDelta !== null && cashDelta > 0 && (
          <span className="amw-jo-delta">
            <span aria-hidden="true">▾</span> {fmtMoney(cashDelta)} under the
            target
          </span>
        )}
      </p>
      <p className="m-0">
        <span className="amw-price amw-jo-amt amw-jo-amt--sm">
          {offer.equityPct === null ? '—' : fmtPct(offer.equityPct)}
        </span>
        {equityDelta !== null && equityDelta > 0 && (
          <span className="amw-jo-delta">
            <span aria-hidden="true">▾</span> {Number(equityDelta.toFixed(2))}{' '}
            pts under the target
          </span>
        )}
      </p>
      <p className="amw-jo-note amw-jo-note--ink">{ask.sentences.offer}</p>
      <span className="sr-only">
        Target is {fmtMoney(target.cash)} and {fmtPct(target.equityPct)}.
      </span>
    </li>
  )
}

export function AskLadder({
  ask,
  suppressCount = false,
  focusHeading = false,
  context = null,
}) {
  const reduce = useReducedMotion()
  const headingRef = useRef(null)
  /* Entering the results from "See my ask" unmounts the focused step
     heading, so focus would fall to the page; it lands on the verdict
     instead. A prefilled arrival is a page load and keeps the default. */
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  if (!ask) return null
  const headline = headlineFor(ask)
  const promoted = ask.flags.filter((f) => f.promoted)
  const still = reduce || suppressCount

  return (
    <section aria-labelledby="ask-verdict">
      {context && <p className="amw-wz-kicker m-0">{context}</p>}

      {/* 1. The answer, once, at size. */}
      <h2
        id="ask-verdict"
        ref={headingRef}
        tabIndex={-1}
        className="amw-jo-headline"
      >
        <span className="sr-only">{ask.sentences.target}</span>
        <span aria-hidden="true">
          Ask for{' '}
          <em>
            <CountedCash value={ask.target.cash} still={still} />
          </em>{' '}
          and{' '}
          <em>
            <CountedPct value={ask.target.equityPct} still={still} />
          </em>
          .
        </span>
      </h2>
      <p className="amw-jo-line" data-headline={headline.id}>
        {headline.line}
      </p>

      {promoted.length > 0 && (
        <ul role="list" className="amw-jo-flags">
          {promoted.map((flag) => (
            <li key={flag.id} className="amw-jo-flag">
              {flag.text}
            </li>
          ))}
        </ul>
      )}

      {/* 2. The rungs, as one connected ladder. */}
      <ol role="list" aria-label="The ask ladder" className="amw-jo-ladder">
        {ask.order.map((id, index) => (
          <Rung
            key={id}
            rung={ask[id]}
            index={index}
            dominant={id === 'target'}
            still={still}
            note={id === 'ceiling' ? ask.sentences.ceiling : null}
          />
        ))}
        <OfferMarker ask={ask} />
      </ol>

      {/* 3. The trade, then 4. the floor note. */}
      <p className="amw-jo-trade">
        {ask.sentences.trade}{' '}
        {/* The sentence above quotes two bands without saying where they came
            from, and "where did that come from" is the next thought. It runs
            off the same store, so the read opens on these answers rather than
            an empty wizard. */}
        <Link href={EQUITY_HREF} className="amw-jo-trade-link">
          See how the equity band was sized &rarr;
        </Link>
      </p>
      <p className="amw-jo-floor">{ask.sentences.floor}</p>
      {/* The board drops this; at Series B and later it is the sentence that
          stops someone trading real cash for almost no equity. */}
      {ask.sentences.tradeWarning && (
        <p className="amw-jo-trade">{ask.sentences.tradeWarning}</p>
      )}
    </section>
  )
}

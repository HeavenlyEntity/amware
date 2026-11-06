'use client'

import { fmtMoney, fmtPct } from '@/components/founders/format'
import CountUp from '@/components/react-bits/count-up'
import { CARD_FOOTER, ZERO_BASE_RATE } from '@/lib/founders/equity/scenarios'

/* What the stake is worth at exit on the selected path (board `.eq-scn`):
   four cards, `$0` first because most startup equity ends there. Every figure
   is the engine's (`read.scenarios[path]`); the footnote is the engine's own
   copy, not retyped.

   The kicker follows the cards' basis: with no offer the engine values the
   band middle, so it never claims to be "your offered stake". Under the cards,
   kept from the old table: the stake at exit and the ask-sanity line. */

const firstSentence = (text) => {
  const end = text.indexOf('. ')
  return end < 0 ? text : text.slice(0, end + 1)
}

export function ScenarioTable({ read, path }) {
  const cards = read.scenarios[path] ?? []
  const hasOffer = read.offer.pct !== null
  const basis = cards[0]?.basis ?? (hasOffer ? 'offer' : 'midpoint')
  const stakeAtExit = cards[0]?.stake ?? null

  return (
    <div>
      <p className="amw-wz-kicker">
        {basis === 'offer'
          ? 'What your offered stake is worth at exit'
          : 'What the band middle is worth at exit'}
      </p>
      <ul role="list" className="amw-wz-scn mt-3">
        {cards.map((card) => {
          const zero = card.id === 'zero'
          return (
            <li key={card.id} className="amw-wz-scn-card">
              <span className="amw-wz-kicker">{card.label}</span>
              <span className="amw-wz-scn-value">
                {zero ? (
                  fmtMoney(card.value)
                ) : (
                  <CountUp
                    key={`${path}-${card.id}-${card.value}`}
                    to={card.value}
                    duration={0.9}
                    format={fmtMoney}
                  />
                )}
              </span>
              <span className="text-[var(--amw-mut)] mt-1 block text-xs">
                {zero ? card.note : `at a ${fmtMoney(card.valuation)} exit`}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="amw-wz-hint">
        {CARD_FOOTER} {firstSentence(ZERO_BASE_RATE)}
      </p>
      <p className="amw-wz-hint" style={{ marginTop: 4 }}>
        Stake at exit {fmtPct(stakeAtExit)}.
        {hasOffer && read.askSanity && (
          <>
            {' '}
            Ask sanity: {fmtPct(read.offer.pct)} under acquisition ≈{' '}
            {fmtMoney(read.askSanity.acquisition)} base · under IPO ≈{' '}
            {fmtMoney(read.askSanity.ipo)} base.
          </>
        )}
      </p>
    </div>
  )
}

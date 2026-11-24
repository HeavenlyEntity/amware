'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { MagicBento } from '@/components/react-bits/magic-bento'
import { PRESALE } from '@/content/site/standard-presale'
import { standardPresale } from '@/lib/commerce/standardPresale'
import { Reveal } from './reveal'
import { FoundingTable, needsWaitlist } from './standard/founding-table'
import { GuardCards } from './standard/guard-cards'
import { PresaleHero } from './standard/presale-hero'
import {
  ClosingBand,
  Questions,
  SectionHead,
  Waitlist,
  Waves,
} from './standard/presale-sections'
import { SHIP_VISUALS } from './standard/ship-visuals'

/* What the page shows until it is handed the presale: closed, so the hero
   claims no presale and points at the waitlist. Worked out once. */
const CLOSED = standardPresale([])

/* The bento tiles, each with its picture. */
const SHIP_ITEMS = PRESALE.ships.items.map((item) => {
  const Visual = SHIP_VISUALS[item.id]
  return { ...item, visual: <Visual /> }
})

/* 01: the six problems, one sentence each. */
function Pains() {
  return (
    <section
      id="st-pains"
      aria-labelledby="st-pains-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <SectionHead titleId="st-pains-title" block={PRESALE.pains} />
        <ul className="st-pains">
          {PRESALE.pains.items.map((pain) => (
            <li key={pain} className="ed-card st-pain">
              <p>{pain}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}

/* 02: the six parts that ship, as a bento with a picture in each tile. */
function Ships() {
  return (
    <section
      id="ships"
      aria-labelledby="st-ships-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <SectionHead titleId="st-ships-title" block={PRESALE.ships} />
        <div className="st-ships">
          <MagicBento columns={3} rowHeight={270} items={SHIP_ITEMS} />
        </div>
        <p className="pj-kicker st-caption">{PRESALE.ships.caption}</p>
      </Reveal>
    </section>
  )
}

/* 03: the six guards, each with a drawing that plays on hover. */
function Guards() {
  return (
    <section
      id="st-guards"
      aria-labelledby="st-guards-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <SectionHead titleId="st-guards-title" block={PRESALE.guards} />
        <GuardCards />
      </Reveal>
    </section>
  )
}

/* 05: the founding prices. The section is always on the page, since every
   "become a founding member" link lands here; while nothing is on sale its
   actions point at the waitlist. */
function Founding({ presale }) {
  return (
    <section
      id="founding"
      aria-labelledby="st-founding-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <SectionHead titleId="st-founding-title" block={PRESALE.founding} />
      </Reveal>
      <div className="st-founding">
        <FoundingTable presale={presale} />
      </div>
    </section>
  )
}

/* Back to the NetSuite edition. The kicker is a claim that holds while any
   edition is on sale; the free-Lite line holds only while a free edition is. */
function NetsuiteCard({ anyOnSale, liteFree }) {
  return (
    <section aria-labelledby="st-ns-title" className="pj-wrap pj-section">
      <Reveal>
        <Link href="/products" className="ns-card">
          <span className="ns-crown" aria-hidden="true">
            {/* The board's crown, the same mark as the guide covers. */}
            <svg
              width="26"
              height="19"
              viewBox="0 0 28 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              <path d="M2 18h24M3 14 2 3l7 5 5-7 5 7 7-5-1 11z" />
            </svg>
          </span>
          <span className="oe-main">
            <span className="pj-kicker pj-kicker--accent">
              {anyOnSale ? 'Available now' : 'NetSuite edition'}
            </span>
            <b id="st-ns-title" className="ns-title">
              Building on NetSuite? WareKit NetSuite edition.
            </b>
            <span className="oe-copy">
              React apps inside NetSuite or Next.js apps connected to it.
              {liteFree && ' Lite is free.'}
            </span>
          </span>
          <span className="oe-go">
            See the NetSuite edition
            <i aria-hidden="true">
              <ChevronRight width={14} height={14} strokeWidth={2.5} />
            </i>
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

/* WareKit Standard's founding-presale page, from the approved board
   (docs/design/2026-11-24-two-ladders/boards/Presale.dc.html): the hero
   with the stack picker, the problems, the parts that ship and the guards,
   the waves, the founding prices, the questions, the closing band, the
   waitlist while a tier is still to come, then the way back to NetSuite.
   Styles: the "Standard presale" block of styles/products.css.

   `presale` is `standardPresale`'s result and decides what the page may
   claim and sell; without it the page reads as closed. `anyOnSale` and
   `liteFree` are the only NetSuite product data allowed this far: whether any NetSuite
   edition can be reached today, and whether one of them is free. Both are
   false when the read fails. */
export function StandardEdition({
  presale = CLOSED,
  anyOnSale,
  liteFree = false,
}) {
  const [picks, setPicks] = useState({ data: 'supabase', pay: 'creem' })
  const onPick = (key, id) => setPicks((current) => ({ ...current, [key]: id }))

  return (
    <>
      <PresaleHero
        open={presale.open}
        data={picks.data}
        pay={picks.pay}
        onPick={onPick}
      />
      <Pains />
      <Ships />
      <Guards />
      <Waves open={presale.open} />
      <Founding presale={presale} />
      <Questions />
      <ClosingBand open={presale.open} />
      {needsWaitlist(presale) ? (
        <Waitlist data={picks.data} pay={picks.pay} />
      ) : null}
      <NetsuiteCard anyOnSale={anyOnSale} liteFree={liteFree} />
    </>
  )
}

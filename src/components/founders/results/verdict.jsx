'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { useOfferStore } from '@/lib/founders/offer-store'
import { trackCta } from '@/components/founders/analytics'
import { CLASS_LABELS, fmtPct } from '@/components/founders/format'
import { ASK_HREF, REVIEW_HREF } from '@/lib/founders/tools'
import CountUp from '@/components/react-bits/count-up'

const pct = (v) => `${Number(v.toFixed(1))}%`

/* Layer one of the results screen: badge and gloss, the sentence, the
   range at display size, the number to say, and the one teal CTA.

   TWO ACTIONS, ONE PRIMARY. The teal button is the business ask. Beside it,
   quietly, is the hand-off to the other tool: this screen answers "is this
   fair", and the next question a person holding that answer has is "so what do
   I say". Both run off the same store, so nothing is retyped and the two tools
   cannot disagree. The hand-off is a text link, not a second button, because
   two buttons side by side is a menu and the reader has to choose before they
   know what either does. */

export function Verdict({ read }) {
  const markAsked = useOfferStore((s) => s.markAsked)
  const { classification, offer, brief, band } = read
  const classLabel = CLASS_LABELS[classification.class] ?? '?'
  const inferred = band.confidence === 'inferred'

  return (
    <div>
      <p className="flex flex-wrap items-center gap-3">
        <span className="amw-chip amw-chip--accent">{classLabel}</span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {classification.gloss}
        </span>
      </p>
      <h1
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="mt-5 max-w-4xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
      >
        {brief.headline}
      </h1>
      <p
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="mt-6 text-5xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl"
      >
        <CountUp to={offer.range.lo} duration={0.8} format={pct} />
        <span className="text-zinc-600 dark:text-zinc-400">–</span>
        <CountUp to={offer.range.hi} duration={1.0} format={pct} />
      </p>
      <p className="amw-kicker mt-2">
        fully diluted · {band.label}
        {inferred ? ' · benchmark inferred' : ''}
      </p>
      {offer.numberToSay?.sentence && (
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
          <span className="font-semibold">The number to say: </span>
          {offer.numberToSay.sentence}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link
          href={REVIEW_HREF}
          onClick={() => {
            markAsked()
            trackCta()
          }}
          className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] sm:w-auto"
        >
          <span>Have AMWARE review this offer</span>
          <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100 dark:bg-zinc-900 dark:text-zinc-50">
            <ChevronRight
              className="relative left-px h-4 w-4"
              aria-hidden="true"
            />
          </span>
        </Link>
        <Link
          href={ASK_HREF}
          onClick={trackCta}
          className="hover:text-[var(--amw-accent-ink)] text-sm text-zinc-700 underline underline-offset-4 transition-colors dark:text-zinc-300"
        >
          Turn this into an ask &rarr;
        </Link>
      </div>
    </div>
  )
}

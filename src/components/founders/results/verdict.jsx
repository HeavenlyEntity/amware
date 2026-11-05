'use client'

import { useCallback } from 'react'
import { Check, Copy } from 'lucide-react'

import { Badge } from '@/components/founders/wizard/badge'
import { BandTrack, axisMaxFor } from '@/components/founders/wizard/band-track'
import { useClipboard } from '@/components/founders/use-clipboard'
import { announceDesk } from '@/components/founders/desk-toast'
import { CLASS_LABELS, fmtPct } from '@/components/founders/format'
import CountUp from '@/components/react-bits/count-up'
import { STEPS } from '@/lib/founders/steps'

const pct = (v) => `${Number(v.toFixed(2))}%`

/* The verdict card (board "Your read"): the class and its gloss, the
   headline, the range to say out loud at display size, the number to ask for,
   the band with the offer's mark, where the offer sits, and the sentence to
   say with a copy button.

   THE HEADLINE STAYS (spec fork F1). It is the six-way verdict the brief and
   the print sheet rely on. The page's h1 is the tool's question now, so the
   headline is this card's h2 and names the section.

   "Ask for" is the engine's `numberToSay.value`: the band middle when the
   offer is below, else the offer itself, which the sentence says to hold, so
   it is labelled "Hold at" there. */

export function callout(offer) {
  if (offer.missingFullyDiluted)
    return 'Offer: needs the fully diluted share count to become a percent.'
  if (offer.pct === null) return 'Enter an offer to see where it sits.'
  const at = `Offered ${fmtPct(offer.pct)}`
  if (offer.position === 'below' && offer.gapPts)
    return `${at}: ${offer.gapPts[0]}–${offer.gapPts[1]} points below the band for this work.`
  if (offer.position === 'within')
    return `${at}: inside the band for this work.`
  if (offer.position === 'above') return `${at}: above the band for this work.`
  return `${at}.`
}

export function Verdict({ read, focusHeading = false }) {
  const { classification, offer, brief, band } = read
  const classLabel = CLASS_LABELS[classification.class] ?? '?'
  const inferred = band.confidence === 'inferred'
  const ask = offer.numberToSay?.value ?? null
  const sentence = offer.numberToSay?.sentence ?? null
  const axisMax = axisMaxFor(offer.range.hi, offer.pct)
  const { state, areaRef, copy } = useClipboard()
  /* Arriving from "See my read", focus lands on the verdict, as it lands on
     each step's heading in the wizard; a prefilled page load does not move it. */
  const headingRef = useCallback(
    (node) => {
      if (node && focusHeading) node.focus({ preventScroll: true })
    },
    [focusHeading]
  )
  const copySentence = async () => {
    if (await copy(sentence)) announceDesk('Copied what to say')
  }

  return (
    <section aria-labelledby="eq-verdict" className="amw-wz-card">
      <p className="amw-wz-kicker">
        Step {STEPS.length} of {STEPS.length} ·{' '}
        {STEPS[STEPS.length - 1].eyebrow}
      </p>
      <h2
        id="eq-verdict"
        ref={headingRef}
        tabIndex={-1}
        className="text-[var(--amw-ink)] mt-3 max-w-[44rem] text-[clamp(20px,2.4vw,24px)] font-semibold leading-snug tracking-tight"
      >
        {brief.headline}
      </h2>
      <p className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Badge size="lg">{classLabel}</Badge>
        <span className="text-[var(--amw-mut)] text-sm">
          {classification.gloss}
        </span>
      </p>

      <div className="amw-wz-res-head mt-[18px]">
        <div>
          <p className="amw-wz-kicker mb-2">The range to say out loud</p>
          <p className="amw-wz-huge">
            <CountUp to={offer.range.lo} duration={0.8} format={pct} />
            <span className="text-[var(--amw-mut)]">–</span>
            <CountUp to={offer.range.hi} duration={1.0} format={pct} />
          </p>
          <p className="amw-wz-kicker mt-2">
            fully diluted · {band.label}
            {inferred ? ' · benchmark inferred' : ''}
          </p>
        </div>
        {ask !== null && (
          <div className="sm:text-right">
            <p className="amw-wz-kicker mb-2">
              {offer.position === 'below' ? 'Ask for' : 'Hold at'}
            </p>
            <p className="amw-wz-ask">{fmtPct(ask)}</p>
          </div>
        )}
      </div>

      <BandTrack
        lo={offer.range.lo}
        hi={offer.range.hi}
        offer={offer.pct}
        max={axisMax}
        size="lg"
        className="mt-7"
      />
      <p className="text-[var(--wz-ink-2)] mt-3.5 text-base">
        {callout(offer)}
      </p>

      {sentence && (
        <div className="amw-wz-say">
          <div className="min-w-0 flex-1">
            <p className="amw-wz-kicker amw-wz-kicker--accent">
              The number to say
            </p>
            <p className="text-[var(--amw-ink)] mt-2 text-[17px] leading-relaxed">
              “{sentence}”
            </p>
          </div>
          <button
            type="button"
            data-print="hide"
            onClick={copySentence}
            aria-label={
              state === 'copied' ? 'Copied what to say' : 'Copy what to say'
            }
            className="amw-wz-copy"
          >
            {state === 'copied' ? (
              <Check className="size-[18px]" aria-hidden="true" />
            ) : (
              <Copy className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
      {state === 'fallback' && (
        <div className="mt-4" data-print="hide">
          <label
            htmlFor="say-fallback"
            className="text-[var(--amw-mut)] text-xs"
          >
            Your browser blocked the clipboard. Select all and copy:
          </label>
          <textarea
            id="say-fallback"
            ref={areaRef}
            readOnly
            value={sentence ?? ''}
            rows={3}
            className="amw-mono border-[var(--amw-line-strong)] bg-[var(--amw-card)] mt-2 w-full rounded-md border p-3 text-xs"
          />
        </div>
      )}
    </section>
  )
}

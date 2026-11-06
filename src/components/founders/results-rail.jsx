'use client'

import { STEPS } from '@/lib/founders/steps'
import { AnimateDigits } from '@/components/founders/animate-digits'
import { RailCard, RailChecklist } from '@/components/founders/wizard/rail'
import { Badge } from '@/components/founders/wizard/badge'
import { BandTrack, axisMaxFor } from '@/components/founders/wizard/band-track'
import {
  CLASS_LABELS,
  PATH_LABELS,
  ROLE_LABELS,
  STAGE_LABELS,
  fmtPct,
} from '@/components/founders/format'

/* "Your read so far", the board's live rail: what is known, the class badge
   once the work step has an answer, the range with the band figure, a note,
   and the checklist of what is still to answer. Used as the desktop column
   and the body of the phone sheet.

   The range is `read.offer.range`, the band after the banked-work and salary
   adjustments (spec fork F12, option b): the same range the step 3 figure and
   the results show, and the one `offer.position` is measured against, so the
   rail's number, its figure and its "below the band" note cannot disagree. */

const RAIL_ICONS = { seat: 'programmer', work: 'blocks', offer: 'checklist' }

export function ResultsRail({ read, step, className = '' }) {
  const { inputs, classification, offer } = read
  const range = offer.range
  const known = [
    ROLE_LABELS[inputs.role] ?? '—',
    step >= 2 && inputs.stage ? STAGE_LABELS[inputs.stage] : '—',
    step >= 3 && inputs.path && inputs.path !== 'unknown'
      ? `${PATH_LABELS[inputs.path]} path`
      : '—',
  ].join(' · ')
  const hasClass = !classification.pending && step >= 2
  const showsOffer = step >= 3 && offer.pct !== null
  const axisMax = axisMaxFor(range.hi, showsOffer ? offer.pct : null)

  const note = hasClass
    ? showsOffer
      ? offer.position === 'unknown'
        ? `Offered ${fmtPct(offer.pct)}`
        : `Offered ${fmtPct(offer.pct)} · ${offer.position} the band`
      : 'Offer not entered yet.'
    : step >= 2
    ? 'Pick what was yours to narrow it.'
    : 'Narrows from the next step. No badge yet.'

  const items = STEPS.filter((s) => s.pending).map((s) => ({
    id: s.id,
    label: s.pending,
    icon: RAIL_ICONS[s.id],
    note: `step ${s.index}`,
    done: step > s.index || (s.id === 'offer' && showsOffer),
  }))

  return (
    <RailCard title="Your read so far" className={className}>
      <p className="amw-mono text-[var(--wz-ink-2)] mt-3.5 text-xs">{known}</p>
      <div className="mt-3.5 min-h-[26px]">
        {hasClass ? (
          <Badge>{CLASS_LABELS[classification.class] ?? '?'}</Badge>
        ) : (
          <Badge quiet pop={false}>
            No badge yet
          </Badge>
        )}
      </div>
      <p className="amw-wz-kicker mt-4">
        {hasClass ? 'Range' : 'Possible range'}
      </p>
      <p className="amw-wz-rail-range">
        <AnimateDigits value={`${fmtPct(range.lo)}–${fmtPct(range.hi)}`} />
      </p>
      <BandTrack
        lo={range.lo}
        hi={range.hi}
        offer={showsOffer ? offer.pct : null}
        max={axisMax}
        className="mt-3"
      />
      <p className="amw-wz-hint">{note}</p>
      {classification.pending && step >= 2 && (
        <p className="amw-wz-hint" style={{ marginTop: 2 }}>
          Work: re-answer for {ROLE_LABELS[inputs.role]}.
        </p>
      )}
      <RailChecklist items={items} className="mt-4">
        {step >= 2 && inputs.joining !== 'fractional_conversion' && (
          <p
            className="amw-wz-need"
            style={{ justifyContent: 'space-between' }}
          >
            <span>Banked work</span>
            <span className="amw-wz-need-note">n/a (salaried)</span>
          </p>
        )}
      </RailChecklist>
    </RailCard>
  )
}

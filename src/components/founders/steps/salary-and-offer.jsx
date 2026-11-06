'use client'

import { ChevronRight } from 'lucide-react'

import { Segmented } from '@/components/founders/wizard/segmented'
import { ChoiceChips } from '@/components/founders/wizard/choice-chips'
import { NumberBox } from '@/components/founders/wizard/number-box'
import { OfferSlider } from '@/components/founders/wizard/offer-slider'
import { PresetField } from '@/components/founders/wizard/preset-field'
import { BandTrack, axisMaxFor } from '@/components/founders/wizard/band-track'
import { fmtPct } from '@/components/founders/format'
import {
  ACCELERATION_COC,
  EXERCISE_WINDOWS,
  INSTRUMENTS,
  LABELS,
  LEAVER,
  PATHS,
  REPURCHASE_VESTED,
} from '@/lib/founders/equity/benchmarks'
import { BOUNDS } from '@/lib/founders/equity/bounds'
import { grainFor } from '@/lib/founders/equity/rounding'

/* Step 3: the exposed moment. The offer comes first (percent on a slider with
   the band under it, or option count over fully diluted shares), salary
   second, terms third, the optional leaver terms after, and the company's
   stated exit path last because it only changes the consequences. */

const MODE_OPTIONS = [
  { id: 'percent', label: 'Percent, fully diluted' },
  { id: 'shares', label: 'Option count / shares' },
]

const INSTRUMENT_LABELS = {
  options: 'Options',
  restricted_stock: 'Restricted stock',
  unsure: 'Not sure',
}

/* TODO(alec): confirm the vesting and cliff presets. The board draws 3/4/5
   years and none/6/12 months; they are UI presets, not engine figures
   (BOUNDS allows 1–10 years and 0–24 months), so "Other" takes the rest. */
const VESTING_PRESETS = [
  { value: 3, label: '3 years' },
  { value: 4, label: '4 years' },
  { value: 5, label: '5 years' },
]
const CLIFF_PRESETS = [
  { value: 0, label: 'None' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
]

/* The offer's place against the band, in words. Not a live region: it would
   speak on every slider step. The page's LiveAnnouncer says the position when
   it changes. */
export function offerHint(offer) {
  if (offer.missingFullyDiluted)
    return 'Add the fully diluted share count to turn the count into a percent.'
  if (offer.pct === null)
    return 'Slide to your offer. The band is your range so far.'
  if (offer.position === 'below' && offer.gapPts)
    return `${offer.gapPts[0]}–${offer.gapPts[1]} points below the band for this work.`
  if (offer.position === 'within') return 'Inside the band for this work.'
  if (offer.position === 'above') return 'Above the band for this work.'
  return 'Pick what was yours on the last step to place the offer.'
}

export function SalaryAndOffer({ inputs, read, onChange }) {
  const clamped = read.inputs.clamped ?? {}
  const norm = read.inputs
  const { offer } = read
  const capNote = (field) =>
    clamped[field] ? `capped at ${BOUNDS[field].max}` : null
  const sharesPending =
    inputs.offerMode === 'shares' &&
    inputs.optionCount !== null &&
    inputs.fullyDilutedShares === null
  /* The axis follows the band only, never the offer: the offer is the value
     being dragged, and an axis that grew with it would run away under the
     thumb. An offer past the end sits at the edge, and the hint says above. */
  const axisMax = Math.min(
    axisMaxFor(offer.range.hi),
    BOUNDS.offeredEquityPct.max
  )
  /* The slider moves at the grain the range itself is shown in (the engine's
     rounding): 0.05 points for a band opening under 2%, else 0.5. The typed
     field takes anything finer. */
  const step = grainFor(offer.rawRange.lo)

  return (
    <>
      <p className="amw-wz-kicker mt-3">
        Nothing you type leaves this page. We count steps, never values.
      </p>

      <Segmented
        label="Offer expressed as"
        options={MODE_OPTIONS}
        value={inputs.offerMode}
        onChange={(offerMode) => onChange({ offerMode })}
        className="amw-wz-field"
      />

      {inputs.offerMode === 'percent' ? (
        <OfferSlider
          id="offer-pct"
          label="Offered equity"
          labelAside="(% fully diluted)"
          value={inputs.offeredEquityPct}
          onCommit={(offeredEquityPct) => onChange({ offeredEquityPct })}
          max={axisMax}
          step={step}
          band={offer.range}
          hint={capNote('offeredEquityPct') ?? offerHint(offer)}
          className="amw-wz-field"
        />
      ) : (
        <div className="amw-wz-field">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
            <NumberBox
              id="offer-count"
              label="Option count"
              value={inputs.optionCount}
              onCommit={(optionCount) => onChange({ optionCount })}
              placeholder="e.g. 300000"
            />
            <NumberBox
              id="offer-fd"
              label="Fully diluted shares"
              value={inputs.fullyDilutedShares}
              onCommit={(fullyDilutedShares) =>
                onChange({ fullyDilutedShares })
              }
              placeholder="e.g. 10000000"
              hint={
                sharesPending
                  ? 'Needed to turn the count into a percent. Ask for it.'
                  : norm.offeredEquityPct !== null
                  ? `= ${fmtPct(norm.offeredEquityPct)} fully diluted`
                  : 'Option counts alone mean nothing; ask for this number.'
              }
            />
            <NumberBox
              id="offer-strike"
              label="Strike price per share"
              value={inputs.strikePrice}
              onCommit={(strikePrice) => onChange({ strikePrice })}
              prefix="$"
              placeholder="optional"
              hint="Used to subtract exercise cost from exit scenarios."
            />
          </div>
          <BandTrack
            lo={offer.range.lo}
            hi={offer.range.hi}
            offer={offer.pct}
            max={axisMax}
            className="mt-5"
          />
          <p className="amw-wz-hint">{offerHint(offer)}</p>
        </div>
      )}

      <div className="amw-wz-field amw-wz-two">
        <NumberBox
          id="salary-offered"
          label="Offered salary"
          value={inputs.offeredSalary}
          onCommit={(offeredSalary) => onChange({ offeredSalary })}
          prefix="$"
          placeholder="e.g. 120000"
          hint={
            capNote('offeredSalary') ??
            'Blank skips the salary adjustment. Zero is a real number.'
          }
        />
        <NumberBox
          id="salary-market"
          label="Market salary for this seat"
          tag="benchmark"
          value={norm.marketSalary}
          onCommit={(marketSalary) => onChange({ marketSalary })}
          prefix="$"
          hint={
            capNote('marketSalary') ??
            'Defaults to the benchmark for your role and stage; change it if you know better.'
          }
        />
      </div>

      {/* Stacked, not side by side: four cells in half a card would break
          "12 months" inside the word. */}
      <div className="amw-wz-field grid gap-8">
        <PresetField
          id="terms-vesting"
          label="Vesting"
          presets={VESTING_PRESETS}
          value={norm.vestingYears}
          onCommit={(vestingYears) => onChange({ vestingYears })}
          min={BOUNDS.vestingYears.min}
          max={BOUNDS.vestingYears.max}
          suffix="years"
          hint={
            capNote('vestingYears') ??
            'Four is standard; longer is a negotiation point.'
          }
        />
        <PresetField
          id="terms-cliff"
          label="Cliff"
          presets={CLIFF_PRESETS}
          value={norm.cliffMonths}
          onCommit={(cliffMonths) => onChange({ cliffMonths })}
          min={BOUNDS.cliffMonths.min}
          max={BOUNDS.cliffMonths.max}
          suffix="months"
          hint={
            capNote('cliffMonths') ??
            'Twelve is standard; longer is a negotiation point.'
          }
        />
      </div>

      <ChoiceChips
        label="Instrument"
        options={INSTRUMENTS.map((id) => ({
          id,
          label: INSTRUMENT_LABELS[id],
        }))}
        value={inputs.instrument}
        onChange={(instrument) => onChange({ instrument })}
        className="amw-wz-field"
      />

      <details className="amw-wz-details amw-wz-field amw-wz-sub">
        <summary className="min-h-11 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <ChevronRight
              className="amw-wz-details-chevron size-3.5 text-[var(--amw-mut)]"
              aria-hidden="true"
            />
            <span className="amw-wz-kicker">If it ends · optional</span>
          </span>
          <span className="text-[var(--amw-mut)] text-[13px]">
            Defaults to the market standard. Open this if your term sheet says
            otherwise.
          </span>
        </summary>
        <div className="mt-2">
          {inputs.instrument !== 'restricted_stock' && (
            <ChoiceChips
              label="Time to exercise vested options after leaving"
              options={EXERCISE_WINDOWS.map((id) => ({
                id,
                label: LEAVER.exerciseWindow.labels[id],
              }))}
              value={inputs.exerciseWindow}
              onChange={(exerciseWindow) => onChange({ exerciseWindow })}
              className="amw-wz-field"
            />
          )}
          <ChoiceChips
            label="Acceleration on a change of control"
            options={ACCELERATION_COC.map((id) => ({
              id,
              label: LEAVER.acceleration.labels[id],
            }))}
            value={inputs.accelerationCoC}
            onChange={(accelerationCoC) => onChange({ accelerationCoC })}
            className="amw-wz-field"
          />
          <ChoiceChips
            label="Company’s right to buy back vested shares"
            options={REPURCHASE_VESTED.map((id) => ({
              id,
              label: LEAVER.repurchase.labels[id],
            }))}
            value={inputs.repurchaseVested}
            onChange={(repurchaseVested) => onChange({ repurchaseVested })}
            className="amw-wz-field"
          />
          <div className="amw-wz-field amw-wz-two">
            <NumberBox
              id="terms-accel-termination"
              label="Acceleration if terminated without cause (months)"
              value={norm.accelerationTerminationMonths}
              onCommit={(accelerationTerminationMonths) =>
                onChange({ accelerationTerminationMonths })
              }
              hint={
                capNote('accelerationTerminationMonths') ??
                'Zero is the default; 6–12 months is a common founder ask.'
              }
            />
            <NumberBox
              id="terms-severance"
              label="Cash severance (months of salary)"
              value={norm.severanceMonths}
              onCommit={(severanceMonths) => onChange({ severanceMonths })}
              hint={capNote('severanceMonths') ?? LEAVER.severance.note}
            />
          </div>
        </div>
      </details>

      <Segmented
        label="Where does the company say it’s going?"
        options={PATHS.map((id) => ({ id, label: LABELS.path[id] }))}
        value={inputs.path}
        onChange={(path) => onChange({ path })}
        className="amw-wz-field"
      />
    </>
  )
}

'use client'

import { SeatCards } from '@/components/founders/wizard/seat-cards'
import { ChoiceChips } from '@/components/founders/wizard/choice-chips'
import { YesNoRow } from '@/components/founders/wizard/gate-rows'
import {
  FounderMeter,
  maxScoreFor,
} from '@/components/founders/wizard/founder-meter'
import { Segmented } from '@/components/founders/wizard/segmented'
import { NumberBox } from '@/components/founders/wizard/number-box'
import { PresetField } from '@/components/founders/wizard/preset-field'
import { CLASS_LABELS } from '@/components/founders/format'
import { CHIPS, EXAMPLE } from '@/lib/founders/equity/benchmarks'
import { BOUNDS } from '@/lib/founders/equity/bounds'
import {
  EQUITY_STEP,
  GEO_OPTIONS,
  INDUSTRY_OPTIONS,
  JOINING_OPTIONS,
  NONE_OF_THESE,
  OFFER_MODE_OPTIONS,
  SEAT_OPTIONS,
  STAGE_OPTIONS,
  VESTING_PRESETS,
} from '@/lib/founders/offer-steps'

/* Three steps, one question each, in the Offer board's look and built from
   the desk's shared wizard primitives. See offer-steps.js for why this is
   three steps and not the two the plan started with.

   Every single-choice control is a radiogroup with arrow keys (seat cards,
   joining chips, the yes/no gates, the segmented thumbs, industry and
   location); the responsibilities are toggle buttons. Every typed number
   commits on blur or Enter, never per keystroke (DD9). */

/* Industry and location are chip rows now, not selects (spec fork F1). The
   select rationale was "nine targets competing with the answers that move the
   read", written when they shared a step with the gates; on their own step
   they compete only with stage. */
const INDUSTRY_CHOICES = INDUSTRY_OPTIONS.map((o) => ({
  id: o.value,
  label: o.label,
}))
const GEO_CHOICES = GEO_OPTIONS.map((o) => ({ id: o.value, label: o.label }))

/* Below 400px "Series B or later" does not fit its cell, so it shows the
   engine's short label there (spec fork F10). The long label stays the
   radio's name at every width. */
const STAGE_CHOICES = STAGE_OPTIONS.map((o) =>
  o.id === 'series_b_plus'
    ? {
        ...o,
        label: (
          <>
            <span aria-hidden="true" className="min-[400px]:hidden">
              Series B+
            </span>
            <span className="max-[399.98px]:sr-only">{o.label}</span>
          </>
        ),
      }
    : o
)

/* STEP 1 — the classification cluster. These answers decide whether the cash
   band is the founder one or the market one, which is a 30-40% swing, so they
   belong together and they belong first.

   A seat change goes to the page as `{ role }` alone: the page puts the
   role's picks aside and brings back the new role's, so arrowing across the
   seat cards cannot wipe answers that are no longer on screen. */
export function SeatStep({ inputs, read, onChange }) {
  const chips = CHIPS[inputs.role] ?? []
  const selected =
    inputs.workAnswered && inputs.responsibilities.length === 0
      ? [NONE_OF_THESE]
      : inputs.responsibilities
  const { classification } = read

  return (
    <>
      <SeatCards
        label="Which seat?"
        options={SEAT_OPTIONS}
        value={inputs.role}
        onChange={(role) => onChange({ role })}
        className="amw-wz-field"
      />
      <ChoiceChips
        label="How are you joining?"
        options={JOINING_OPTIONS}
        value={inputs.joining}
        onChange={(joining) => onChange({ joining })}
        className="amw-wz-field"
      />
      <div className="amw-wz-field grid gap-2.5">
        <YesNoRow
          question="Full time on signing?"
          value={inputs.fullTimeOnSigning}
          onChange={(fullTimeOnSigning) => onChange({ fullTimeOnSigning })}
        />
        <YesNoRow
          question="Final say on technical decisions?"
          value={inputs.finalTechnicalSay}
          onChange={(finalTechnicalSay) => onChange({ finalTechnicalSay })}
        />
      </div>
      <ChoiceChips
        label="What is yours to own?"
        labelAside="Select all that apply."
        mode="multi"
        options={[
          ...chips.map((c) => ({ id: c.id, label: c.label })),
          { id: NONE_OF_THESE, label: 'None of these' },
        ]}
        value={selected}
        onChange={(next) => {
          /* An empty array cannot mean both "not answered" and "none of
             these", so the none option is explicit and sets workAnswered.
             Picking a chip while "none" is on drops the "none". */
          const wasNone = selected.includes(NONE_OF_THESE)
          const picks = next.filter((id) => id !== NONE_OF_THESE)
          if (next.includes(NONE_OF_THESE) && !(wasNone && picks.length)) {
            onChange({ responsibilities: [], workAnswered: true })
            return
          }
          onChange({ responsibilities: picks, workAnswered: picks.length > 0 })
        }}
        className="amw-wz-field"
      >
        <FounderMeter
          score={classification.score}
          maxScore={maxScoreFor(chips)}
          selected={classification.selected}
          total={classification.total}
          classLabel={
            classification.pending
              ? null
              : CLASS_LABELS[classification.class] ?? null
          }
        />
      </ChoiceChips>
    </>
  )
}

/* STEP 2 — everything about the company. */
export function CompanyStep({ inputs, onChange }) {
  return (
    <>
      <Segmented
        label="Last closed round"
        options={STAGE_CHOICES}
        value={inputs.stage}
        onChange={(stage) => onChange({ stage })}
        className="amw-wz-field"
      />
      <ChoiceChips
        label="Industry"
        options={INDUSTRY_CHOICES}
        value={inputs.industry}
        onChange={(industry) => onChange({ industry })}
        className="amw-wz-field"
      >
        <p className="amw-wz-hint">
          A smaller correction than stage. SaaS and “something else” apply no
          adjustment at all.
        </p>
      </ChoiceChips>
      <ChoiceChips
        label="Where the role is paid"
        options={GEO_CHOICES}
        value={inputs.geo}
        onChange={(geo) => onChange({ geo })}
        className="amw-wz-field"
      >
        {/* TODO(alec): this says another US hub is the baseline, and it is
            (×1.00), but the store's default is remote at a national rate
            (×0.97). Either the copy or the default should change. */}
        <p className="amw-wz-hint">
          Location moves cash more than industry does. Another US hub is the
          baseline.
        </p>
      </ChoiceChips>
    </>
  )
}

/* STEP 3 — what they actually offered. Everything here is optional: the ask
   still computes without it, it just cannot compare. */
export function OfferStep({ inputs, read, onChange }) {
  const isShares = inputs.offerMode === 'shares'
  return (
    <>
      <Segmented
        label="How was the equity described?"
        options={OFFER_MODE_OPTIONS}
        value={inputs.offerMode}
        onChange={(offerMode) => onChange({ offerMode })}
        className="amw-wz-field"
      />

      {/* Keyed on the mode, so the fields that change slide in. */}
      <div key={inputs.offerMode} className="amw-wz-field amw-wz-step">
        {isShares ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
            <NumberBox
              id="offer-count"
              label="Options offered"
              value={inputs.optionCount}
              onCommit={(optionCount) => onChange({ optionCount })}
            />
            <NumberBox
              id="offer-fd"
              label="Fully diluted shares"
              hint="Without this, an option count means nothing."
              value={inputs.fullyDilutedShares}
              onCommit={(fullyDilutedShares) =>
                onChange({ fullyDilutedShares })
              }
            />
            <NumberBox
              id="offer-strike"
              label="Strike price"
              prefix="$"
              value={inputs.strikePrice}
              onCommit={(strikePrice) => onChange({ strikePrice })}
            />
          </div>
        ) : (
          <NumberBox
            id="offer-pct"
            label="Equity offered"
            hint="Fully diluted percent. Leave blank if they have not said."
            value={inputs.offeredEquityPct}
            onCommit={(offeredEquityPct) => onChange({ offeredEquityPct })}
            suffix="%"
            placeholder={`e.g. ${EXAMPLE.offeredEquityPct}`}
            step={EQUITY_STEP}
            max={BOUNDS.offeredEquityPct.max}
            decLabel="Less equity"
            incLabel="More equity"
          />
        )}
      </div>

      {/* Salary and vesting are stacked rather than the board's two-column
          row: the vesting control has a fourth "Other" cell, and four cells
          in half a card break "3 years" inside the word. */}
      <NumberBox
        id="offer-salary"
        label="Base salary offered"
        value={inputs.offeredSalary}
        onCommit={(offeredSalary) => onChange({ offeredSalary })}
        prefix="$"
        placeholder={`e.g. ${EXAMPLE.offeredSalary}`}
        max={BOUNDS.offeredSalary.max}
        className="amw-wz-field max-w-[20rem]"
      />
      <div className="amw-wz-field">
        <PresetField
          id="offer-vesting"
          label="Vesting"
          presets={VESTING_PRESETS}
          value={read.inputs.vestingYears}
          onCommit={(vestingYears) => onChange({ vestingYears })}
          min={BOUNDS.vestingYears.min}
          max={BOUNDS.vestingYears.max}
          suffix="years"
        />
      </div>
    </>
  )
}

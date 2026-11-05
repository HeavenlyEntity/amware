'use client'

import { Segmented } from '@/components/founders/wizard/segmented'
import { SwitchRow } from '@/components/founders/wizard/gate-rows'
import { ChoiceChips } from '@/components/founders/wizard/choice-chips'
import {
  FounderMeter,
  maxScoreFor,
} from '@/components/founders/wizard/founder-meter'
import { NumberBox } from '@/components/founders/wizard/number-box'
import { SliderField } from '@/components/founders/slider-field'
import { CLASS_LABELS, fmtMoney } from '@/components/founders/format'
import { CHIPS, LABELS, STAGES } from '@/lib/founders/equity/benchmarks'
import { BOUNDS, SLIDER_TRACKS } from '@/lib/founders/equity/bounds'

/* Step 2: the company's stage, the two gates, the responsibility chips for the
   chosen seat with the founder-level meter, and (fractional conversions only)
   the banked-work sliders. Zero chips keeps the classification at "?"; the
   meter and the rail say "Pick what was yours". */

export function TheWork({ inputs, read, onChange }) {
  const stageOptions = STAGES.map((id) => ({ id, label: LABELS.stage[id] }))
  const roleChips = CHIPS[inputs.role] ?? []
  const chips = roleChips.map((chip) => ({ id: chip.id, label: chip.label }))
  const fractional = inputs.joining === 'fractional_conversion'
  const clamped = read.inputs.clamped ?? {}
  const norm = read.inputs
  const { classification } = read

  const capNote = (field) =>
    clamped[field] ? `capped at ${BOUNDS[field].max}` : null

  return (
    <>
      <div className="amw-wz-field">
        <Segmented
          label="Company stage today"
          labelAside="(last closed priced round)"
          options={stageOptions}
          value={norm.stageKey ?? inputs.stage}
          onChange={(stage) => onChange({ stage })}
        />
        <p className="amw-wz-hint">
          Currently raising your seed? Pick pre-seed.
        </p>
      </div>

      <div className="amw-wz-field amw-wz-two">
        <SwitchRow
          label="Full-time on signing"
          checked={inputs.fullTimeOnSigning}
          onChange={(fullTimeOnSigning) => onChange({ fullTimeOnSigning })}
        />
        <SwitchRow
          label="Final say on technical decisions"
          checked={inputs.finalTechnicalSay}
          onChange={(finalTechnicalSay) => onChange({ finalTechnicalSay })}
        />
      </div>

      <ChoiceChips
        label={`Which of these were yours as ${LABELS.role[inputs.role]}?`}
        labelAside="Select all that apply."
        options={chips}
        value={inputs.responsibilities}
        onChange={(responsibilities) => onChange({ responsibilities })}
        mode="multi"
        className="amw-wz-field"
      >
        <FounderMeter
          score={classification.score}
          maxScore={maxScoreFor(roleChips)}
          selected={classification.selected}
          total={classification.total}
          classLabel={
            classification.pending ? null : CLASS_LABELS[classification.class]
          }
          pendingHint={
            classification.pending
              ? 'Pick what was yours. The read stays “?” until you do.'
              : null
          }
        />
      </ChoiceChips>

      {fractional && (
        <div className="amw-wz-field amw-wz-sub">
          <p className="amw-wz-kicker">
            The fractional period · sizes the work already banked
          </p>
          <div className="mt-5 grid gap-[22px]">
            <SliderField
              id="work-months"
              label="Months in the role"
              value={norm.months}
              onCommit={(months) => onChange({ months })}
              track={SLIDER_TRACKS.months}
              bounds={BOUNDS.months}
              step={SLIDER_TRACKS.months.step}
              ticks={SLIDER_TRACKS.months.ticks}
              unit=" mo"
              clampedNote={capNote('months')}
            />
            <SliderField
              id="work-hours"
              label="Average hours per week"
              value={norm.hoursPerWeek}
              onCommit={(hoursPerWeek) => onChange({ hoursPerWeek })}
              track={SLIDER_TRACKS.hoursPerWeek}
              bounds={BOUNDS.hoursPerWeek}
              step={SLIDER_TRACKS.hoursPerWeek.step}
              ticks={SLIDER_TRACKS.hoursPerWeek.ticks}
              unit=" h"
              clampedNote={capNote('hoursPerWeek')}
            />
            <SliderField
              id="work-rate"
              label="Your market consulting rate"
              value={norm.ratePerHour}
              onCommit={(ratePerHour) => onChange({ ratePerHour })}
              track={SLIDER_TRACKS.ratePerHour}
              bounds={BOUNDS.ratePerHour}
              step={SLIDER_TRACKS.ratePerHour.step}
              ticks={SLIDER_TRACKS.ratePerHour.ticks}
              format={(v) => `$${v}`}
              unit=" / hr"
              clampedNote={capNote('ratePerHour')}
            />
            <NumberBox
              id="work-fees"
              label="Fees you actually billed (exact)"
              value={norm.feesBilled}
              onCommit={(feesBilled) => onChange({ feesBilled })}
              prefix="$"
              boxClassName="max-w-[16rem]"
              hint={
                capNote('feesBilled') ??
                `Deferred or unpaid counts as 0. Banked work ≈ ${fmtMoney(
                  read.adjustments.banked.dollars
                )} in foregone fees.`
              }
            />
          </div>
        </div>
      )}
    </>
  )
}

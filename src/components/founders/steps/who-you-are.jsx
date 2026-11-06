'use client'

import { SeatCards } from '@/components/founders/wizard/seat-cards'
import { ChoiceChips } from '@/components/founders/wizard/choice-chips'
import { CountStepper } from '@/components/founders/wizard/count-stepper'
import { JOINING, LABELS, ROLES } from '@/lib/founders/equity/benchmarks'
import { BOUNDS } from '@/lib/founders/equity/bounds'

/* Step 1: which seat, how you're joining, and (only when it matters) how many
   founders. The seats are the board's icon cards, every description visible;
   they stay a radiogroup named by the seat alone. */

const ROLE_DESCRIPTIONS = {
  cto: 'You own the technology and the team, now or on signing.',
  engineer: 'You build the product; the title may be “founding engineer”.',
  ceo_builder: 'You run the company and write the code.',
}

const ROLE_ICONS = {
  cto: 'system',
  engineer: 'computer',
  ceo_builder: 'rocket',
}

export function WhoYouAre({ inputs, read, onChange }) {
  const roleOptions = ROLES.map((id) => ({
    id,
    label: LABELS.role[id],
    description: ROLE_DESCRIPTIONS[id],
    icon: ROLE_ICONS[id],
  }))
  const joiningOptions = JOINING.map((id) => ({
    id,
    label: LABELS.joining[id],
  }))
  const showFounders =
    inputs.joining === 'formation' || read.classification.deFacto
  const founders = inputs.founders ?? BOUNDS.founders.default

  return (
    <>
      <SeatCards
        label="Which seat?"
        options={roleOptions}
        value={inputs.role}
        onChange={(role) => onChange({ role })}
        className="amw-wz-field"
      />
      <ChoiceChips
        label="How are you joining?"
        options={joiningOptions}
        value={inputs.joining}
        onChange={(joining) => onChange({ joining })}
        className="amw-wz-field"
      />
      {showFounders && (
        <CountStepper
          label="How many founders, including you?"
          value={founders}
          min={BOUNDS.founders.min}
          max={BOUNDS.founders.max}
          onChange={(next) => onChange({ founders: next })}
          decLabel="Fewer founders"
          incLabel="More founders"
          hint={
            read.classification.deFacto
              ? 'Your work reads as a de facto co-founder, so the founder pool applies.'
              : null
          }
          className="amw-wz-field"
        />
      )}
    </>
  )
}

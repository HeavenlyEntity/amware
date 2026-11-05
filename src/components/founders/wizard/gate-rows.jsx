'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'

import '@/styles/founders-wizard.css'
import { useRovingRadio } from '@/components/founders/wizard/use-roving-radio'

/*
 * The two ways the desk asks a yes/no gate.
 *
 * SwitchRow (equity board `.eq-switch`): a full-width row that is itself a
 * `role="switch"`, for a gate that always has an answer. The label is the
 * switch's name; Space and Enter toggle it, as on any button.
 *   Props: { label, checked, onChange(next), description?, className }
 *
 * YesNoRow (offer board `.jo-q`): the question on the left and a Yes / No
 * radiogroup on the right, for a gate that may still be unanswered (`null`
 * selects neither). The group is named by the question.
 *   Props: { question, value: true | false | null, onChange(next),
 *            yesLabel, noLabel, className }
 */

export function SwitchRow({
  label,
  checked,
  onChange,
  description,
  className = '',
}) {
  const id = useId()
  return (
    <div className={className}>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className="amw-wz-switch"
      >
        <span>{label}</span>
        <span className="amw-wz-switch-track" aria-hidden="true">
          <span className="amw-wz-switch-knob" />
        </span>
      </button>
      {description && (
        <p id={`${id}-desc`} className="amw-wz-hint">
          {description}
        </p>
      )}
    </div>
  )
}

export function YesNoRow({
  question,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  className = '',
}) {
  const id = useId()
  const options = [
    { id: 'yes', label: yesLabel },
    { id: 'no', label: noLabel },
  ]
  const current = value === true ? 'yes' : value === false ? 'no' : null
  const { getItemProps } = useRovingRadio({
    options,
    value: current,
    onChange: (next) => onChange(next === 'yes'),
  })
  return (
    <div className={`amw-wz-gate ${className}`}>
      <span id={`${id}-q`}>{question}</span>
      <span
        role="radiogroup"
        aria-labelledby={`${id}-q`}
        className="amw-wz-gate-yn"
      >
        {options.map((option, index) => (
          <button
            key={option.id}
            {...getItemProps(index)}
            className="amw-wz-chip amw-wz-chip--sm"
          >
            <Check strokeWidth={3} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        ))}
      </span>
    </div>
  )
}

'use client'

import { useState } from 'react'

import '@/styles/founders-wizard.css'
import { Segmented } from '@/components/founders/wizard/segmented'
import { NumberBox } from '@/components/founders/wizard/number-box'

/*
 * Common values as a segmented control, plus "Other" for anything else
 * (spec fork F11). A stored value that matches no preset selects "Other" and
 * shows the number box holding it, so the thumb never sits on a preset that
 * is not the real value.
 *
 * Props: { id, label, presets: [{ value, label }], value, onCommit(number |
 *   null), otherLabel = 'Other', min, max, suffix, hint, otherHint }
 */
export function PresetField({
  id,
  label,
  presets,
  value,
  onCommit,
  otherLabel = 'Other',
  min,
  max,
  suffix,
  hint = null,
  otherHint = null,
}) {
  const matched = presets.find((preset) => preset.value === value)
  /* "Other" chosen while the value still equals a preset (the person is about
     to type one) stays open until they pick a preset again. */
  const [otherOpen, setOtherOpen] = useState(false)
  const showOther = otherOpen || !matched
  const options = [
    ...presets.map((preset) => ({
      id: String(preset.value),
      label: preset.label,
    })),
    { id: 'other', label: otherLabel },
  ]
  const selected = showOther ? 'other' : String(matched.value)

  return (
    <div>
      <Segmented
        label={label}
        options={options}
        value={selected}
        fold={false}
        onChange={(next) => {
          if (next === 'other') {
            setOtherOpen(true)
            return
          }
          setOtherOpen(false)
          onCommit(Number(next))
        }}
      />
      {showOther && (
        <NumberBox
          id={id}
          label={`${label}, other value`}
          labelClassName="sr-only"
          value={value}
          onCommit={onCommit}
          min={min}
          max={max}
          suffix={suffix}
          className="mt-3 max-w-[12rem]"
        />
      )}
      {(showOther ? otherHint ?? hint : hint) && (
        <p className="amw-wz-hint">{showOther ? otherHint ?? hint : hint}</p>
      )}
    </div>
  )
}

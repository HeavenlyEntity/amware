'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'

import '@/styles/founders-wizard.css'
import { useRovingRadio } from '@/components/founders/wizard/use-roving-radio'

/*
 * Pill chips in the board's look (`.eq-chip`): the check glyph is always in
 * the DOM at zero width and grows in when the chip is selected, so the chip
 * widens smoothly instead of jumping. Selection is never colour alone.
 *
 * mode="single": a radiogroup (aria-checked, arrow keys move and select).
 * mode="multi":  toggle buttons (aria-pressed) in a labelled group.
 *
 * This is the new look; `chip-group.jsx` keeps the old one for the pages that
 * still use it.
 *
 * Props: { label, labelAside, labelId, ariaLabel, options: [{ id, label,
 *   disabled? }], value (id, or array of ids for multi), onChange, mode,
 *   size: 'md' | 'sm', className, children (rendered under the chips) }
 */
export function ChoiceChips({
  label,
  labelAside,
  labelId,
  ariaLabel,
  options,
  value,
  onChange,
  mode = 'single',
  size = 'md',
  className = '',
  children,
}) {
  const autoId = useId()
  const groupLabelId = labelId ?? `${autoId}-label`
  const isSingle = mode === 'single'
  const selected = new Set(isSingle ? [value] : value ?? [])
  const { getItemProps } = useRovingRadio({
    options,
    value: isSingle ? value : null,
    onChange,
  })
  const chipClass = `amw-wz-chip${size === 'sm' ? ' amw-wz-chip--sm' : ''}`

  function toggle(option) {
    if (option.disabled) return
    const next = new Set(selected)
    if (next.has(option.id)) next.delete(option.id)
    else next.add(option.id)
    /* Keep the options' order, not the click order. */
    onChange(options.map((o) => o.id).filter((id) => next.has(id)))
  }

  const named = Boolean(label || labelId)

  return (
    <div className={className}>
      {label && (
        <p id={groupLabelId} className="amw-wz-label">
          {label}
          {labelAside && (
            <>
              {' '}
              <span className="amw-wz-label-aside">{labelAside}</span>
            </>
          )}
        </p>
      )}
      <div
        role={isSingle ? 'radiogroup' : 'group'}
        aria-labelledby={named ? groupLabelId : undefined}
        aria-label={named ? undefined : ariaLabel}
        className="amw-wz-chips"
      >
        {options.map((option, index) =>
          isSingle ? (
            <button
              key={option.id}
              {...getItemProps(index)}
              className={chipClass}
            >
              <Check strokeWidth={3} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          ) : (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected.has(option.id)}
              aria-disabled={option.disabled || undefined}
              onClick={() => toggle(option)}
              className={chipClass}
            >
              <Check strokeWidth={3} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          )
        )}
      </div>
      {children}
    </div>
  )
}

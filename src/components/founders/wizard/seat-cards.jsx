'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'

import '@/styles/founders-wizard.css'
import { PackIcon } from '@/components/icon-pack'
import { useRovingRadio } from '@/components/founders/wizard/use-roving-radio'

/*
 * Seat choice cards (board `.eq-seats` / `.eq-seat`): an icon tile, the name,
 * an optional description and a springing tick.
 *
 * A radiogroup with arrow keys and a roving tabindex. Each card is named by
 * its name alone (`aria-labelledby`), with the description attached through
 * `aria-describedby`, so "CTO" stays "CTO" to a screen reader and to tests.
 *
 * Props: { label, labelId, options: [{ id, label, description?, icon? }],
 *   value, onChange, className }. `icon` is an icon-pack name
 *   (`src/components/icon-pack.jsx`), e.g. 'system', 'computer', 'rocket'.
 */
export function SeatCards({
  label,
  labelId,
  options,
  value,
  onChange,
  className = '',
}) {
  const autoId = useId()
  const groupLabelId = labelId ?? `${autoId}-label`
  const { getItemProps } = useRovingRadio({ options, value, onChange })

  return (
    <div className={className}>
      {label && (
        <p id={groupLabelId} className="amw-wz-label">
          {label}
        </p>
      )}
      <div
        role="radiogroup"
        aria-labelledby={label || labelId ? groupLabelId : undefined}
        className="amw-wz-seats"
      >
        {options.map((option, index) => {
          const nameId = `${autoId}-${option.id}-name`
          const descId = `${autoId}-${option.id}-desc`
          return (
            <button
              key={option.id}
              {...getItemProps(index)}
              aria-labelledby={nameId}
              aria-describedby={option.description ? descId : undefined}
              className="amw-wz-seat"
            >
              <span className="amw-wz-tick" aria-hidden="true">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
              {option.icon && (
                <span className="amw-wz-seat-icon" aria-hidden="true">
                  <PackIcon name={option.icon} size={32} />
                </span>
              )}
              <span>
                <span id={nameId} className="amw-wz-seat-name">
                  {option.label}
                </span>
                {option.description && (
                  <span id={descId} className="amw-wz-seat-desc">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

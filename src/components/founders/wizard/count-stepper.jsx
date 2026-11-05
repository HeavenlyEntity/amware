'use client'

import { useId } from 'react'

import '@/styles/founders-wizard.css'

/*
 * A small whole-number counter (board `.eq-stepper`): − , the value, + .
 * The value re-pops on every change and is a polite live region, so the new
 * count is heard after each press. At a bound the button is aria-disabled
 * rather than disabled, so focus never drops to the page mid-press.
 *
 * Props: { label, value, min, max, onChange(next), decLabel, incLabel, hint,
 *   className }
 */
export function CountStepper({
  label,
  value,
  min,
  max,
  onChange,
  decLabel = 'Fewer',
  incLabel = 'More',
  hint = null,
  className = '',
}) {
  const id = useId()
  return (
    <div className={className}>
      <p id={`${id}-label`} className="amw-wz-label">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="amw-wz-counter"
      >
        <button
          type="button"
          aria-label={decLabel}
          aria-disabled={value <= min || undefined}
          onClick={() => value > min && onChange(value - 1)}
        >
          −
        </button>
        <output
          aria-live="polite"
          aria-labelledby={`${id}-label`}
          className="amw-wz-counter-value"
        >
          <span key={value} className="amw-wz-pop">
            {value}
          </span>
        </output>
        <button
          type="button"
          aria-label={incLabel}
          aria-disabled={value >= max || undefined}
          onClick={() => value < max && onChange(value + 1)}
        >
          +
        </button>
      </div>
      {hint && <p className="amw-wz-hint">{hint}</p>}
    </div>
  )
}

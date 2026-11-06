'use client'

import '@/styles/founders-wizard.css'

/*
 * The board's number box (`.eq-num`): a 48px field with an inner prefix or
 * suffix, optional − / + steppers, and a label and hint.
 *
 * It commits on blur or Enter, never per keystroke, exactly like
 * `number-field.jsx` (design review DD9: a half-typed "18" must never reach the
 * shared store). The steppers commit at once, because each click is a whole
 * value. `key={value}` remounts the input when the value changes from outside.
 *
 * Props: { id, label, labelAside, tag, value, onCommit(number | null), hint,
 *   prefix, suffix, placeholder, min = 0, max, step (stepper increment; omit
 *   for no steppers), decimals (stepper rounding, default 2), decLabel,
 *   incLabel, labelClassName, boxClassName (on the box itself), className }
 */

function roundTo(value, decimals) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

export function NumberBox({
  id,
  label,
  labelAside,
  tag,
  value,
  onCommit,
  hint,
  prefix,
  suffix,
  placeholder,
  min = 0,
  max,
  step,
  decimals = 2,
  decLabel = 'Less',
  incLabel = 'More',
  labelClassName = 'amw-wz-label-sm',
  boxClassName = '',
  className = '',
}) {
  const hasValue = typeof value === 'number' && Number.isFinite(value)
  const clamp = (n) => {
    let next = Math.max(min, n)
    if (typeof max === 'number') next = Math.min(max, next)
    return roundTo(next, decimals)
  }
  const atMax = hasValue && typeof max === 'number' && value >= max
  const nudge = (direction) =>
    onCommit(clamp((hasValue ? value : 0) + direction * step))

  const input = (
    <div className={`amw-wz-num min-w-0 flex-1 ${boxClassName}`}>
      {prefix && (
        <span className="amw-wz-num-affix" aria-hidden="true">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? 'any'}
        key={hasValue ? value : 'empty'}
        defaultValue={hasValue ? value : ''}
        placeholder={placeholder}
        onBlur={(event) => {
          const next =
            event.target.value === '' ? null : Number(event.target.value)
          /* Tabbing through a field is not an answer: an unchanged value
             must not mark the wizard touched or write the store. */
          if (next !== (hasValue ? value : null)) onCommit(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {suffix && (
        <span className="amw-wz-num-affix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  )

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {labelAside && (
            <>
              {' '}
              <span className="amw-wz-label-aside">{labelAside}</span>
            </>
          )}
          {tag && (
            <>
              {' '}
              <span className="amw-wz-tag">{tag}</span>
            </>
          )}
        </label>
      )}
      {step ? (
        <div className="amw-wz-counter flex w-full max-w-[20rem]">
          <button
            type="button"
            aria-label={decLabel}
            onClick={() => !(hasValue && value <= min) && nudge(-1)}
            aria-disabled={(hasValue && value <= min) || undefined}
          >
            −
          </button>
          {input}
          <button
            type="button"
            aria-label={incLabel}
            onClick={() => !atMax && nudge(1)}
            aria-disabled={atMax || undefined}
          >
            +
          </button>
        </div>
      ) : (
        input
      )}
      {hint && (
        <p id={`${id}-hint`} className="amw-wz-hint">
          {hint}
        </p>
      )}
    </div>
  )
}

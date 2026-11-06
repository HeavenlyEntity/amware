'use client'

import { useId } from 'react'

import '@/styles/founders-wizard.css'
import { Slider } from '@/components/ui/slider'
import { BandTrack } from '@/components/founders/wizard/band-track'

/*
 * The offered percent as the board draws it: a label row, a slider, and the
 * band figure under it with the offer's mark, so moving the thumb shows the
 * offer against the band as it moves. Spec fork F2 adds the typed field in
 * the label row: a slider cannot hit 0.1%, and an engineer's band at Series B+
 * lives between 0.05% and 0.25%.
 *
 * The slider commits as it moves (each step is a whole value); the typed field
 * commits on blur or Enter, never per keystroke (DD9). Blank means "no offer".
 *
 * Props: { id, label, labelAside, value (number | null), onCommit, max, step,
 *   band: { lo, hi }, hint (node, under the figure), className }
 */
export function OfferSlider({
  id,
  label,
  labelAside,
  value,
  onCommit,
  max,
  step,
  band,
  hint = null,
  className = '',
}) {
  const autoId = useId()
  const labelId = `${autoId}-label`
  const hintId = `${autoId}-hint`
  const hasValue = typeof value === 'number' && Number.isFinite(value)
  const thumb = hasValue ? Math.min(Math.max(value, 0), max) : 0
  const valueText = hasValue ? `${value}% offered` : 'No offer entered'

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p id={labelId} className="amw-wz-label" style={{ margin: 0 }}>
          {label}
          {labelAside && (
            <>
              {' '}
              <span className="amw-wz-label-aside">{labelAside}</span>
            </>
          )}
        </p>
        <div className="amw-wz-num w-[8.5rem]" style={{ height: 44 }}>
          <label htmlFor={id} className="sr-only">
            {label}, typed
          </label>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            key={hasValue ? value : 'empty'}
            defaultValue={hasValue ? value : ''}
            placeholder="e.g. 3"
            onBlur={(event) => {
              const next =
                event.target.value === '' ? null : Number(event.target.value)
              /* Tabbing through is not an answer. */
              if (next !== (hasValue ? value : null)) onCommit(next)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            aria-describedby={hint ? hintId : undefined}
          />
          <span className="amw-wz-num-affix" aria-hidden="true">
            %
          </span>
        </div>
      </div>
      <Slider
        className="amw-wz-range mt-2"
        aria-labelledby={labelId}
        aria-valuetext={valueText}
        aria-describedby={hint ? hintId : undefined}
        min={0}
        max={max}
        step={step}
        value={[thumb]}
        onValueChange={([next]) => onCommit(next)}
      />
      <BandTrack
        lo={band.lo}
        hi={band.hi}
        offer={hasValue ? value : null}
        max={max}
        className="mt-3"
      />
      {hint && (
        <p id={hintId} className="amw-wz-hint">
          {hint}
        </p>
      )}
    </div>
  )
}

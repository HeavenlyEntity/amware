'use client'

import { useEffect, useId, useState } from 'react'

import '@/styles/founders-wizard.css'
import { Slider } from '@/components/ui/slider'

/* A slider paired with a number input. Dragging commits immediately.
   Typing keeps the raw text while the field is focused and commits on
   blur or Enter; the caller clamps (engine bounds) and can report a
   `clamped` note that shows as an inline hint until the next edit.
   The slider track is the human range (`track`), the typed input accepts
   the wider engine bounds (`bounds`); a value above the track pins the
   thumb at the end with a "+" label. `ticks` are labels spread evenly, or
   `{ value, label }` objects placed at their value on the track.

   Drawn in the boards' look (founders-wizard.css): a teal mono value, the
   skinned track and white thumb, and a compact number box. The behaviour is
   unchanged (spec fork F4 keeps the typed input, the clamp notes and the pin). */

export function SliderField({
  id,
  label,
  value,
  onCommit,
  track,
  bounds,
  step = 1,
  format = (v) => String(v),
  ticks = [],
  unit = '',
  clampedNote = null,
  hint = null,
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [text, setText] = useState(String(value ?? ''))
  const [editing, setEditing] = useState(false)

  const pinned = value > track.max
  const sliderValue = Math.min(
    Math.max(value ?? track.min, track.min),
    track.max
  )

  function commit() {
    setEditing(false)
    const parsed = Number.parseFloat(text)
    const next = Number.isFinite(parsed) ? parsed : null
    /* Tabbing through the field is not an answer: an unchanged value must
       not mark the wizard touched or write the shared store. */
    if (next !== (value ?? null)) onCommit(next)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-[var(--wz-ink-2)] text-sm">
          {label}
        </label>
        <span className="amw-wz-val">
          {format(value)}
          {pinned ? '+' : ''}
          {unit}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <Slider
            className="amw-wz-range"
            aria-label={label}
            aria-valuetext={`${format(sliderValue)}${unit}`}
            aria-describedby={
              clampedNote || hint ? `${inputId}-hint` : undefined
            }
            min={track.min}
            max={track.max}
            step={step}
            value={[sliderValue]}
            onValueChange={([next]) => onCommit(next)}
          />
          {ticks.length > 0 &&
            (typeof ticks[0] === 'object' ? (
              /* Tick objects ({ value, label }) sit at their value. */
              <div className="amw-wz-scale relative h-4" aria-hidden="true">
                {ticks.map((tick) => {
                  const at = (tick.value - track.min) / (track.max - track.min)
                  return (
                    <span
                      key={tick.value}
                      className="absolute top-0"
                      style={{
                        left: `${at * 100}%`,
                        transform: `translateX(-${at * 100}%)`,
                      }}
                    >
                      {tick.label}
                    </span>
                  )
                })}
              </div>
            ) : (
              <div className="amw-wz-scale" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            ))}
        </div>
        <div className="amw-wz-num w-24 shrink-0" style={{ height: 40 }}>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={bounds?.min}
            max={bounds?.max}
            step={step}
            value={editing ? text : String(value ?? '')}
            onFocus={() => {
              setEditing(true)
              setText(String(value ?? ''))
            }}
            onChange={(event) => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            aria-describedby={
              clampedNote || hint ? `${inputId}-hint` : undefined
            }
          />
        </div>
      </div>
      {(clampedNote || hint) && (
        <p id={`${inputId}-hint`} className="amw-wz-hint">
          {clampedNote ?? hint}
        </p>
      )}
    </div>
  )
}

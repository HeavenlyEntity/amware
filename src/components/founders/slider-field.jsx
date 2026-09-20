'use client'

import { useEffect, useId, useState } from 'react'

import { Slider } from '@/components/ui/slider'

/* A slider paired with a number input. Dragging commits immediately.
   Typing keeps the raw text while the field is focused and commits on
   blur or Enter; the caller clamps (engine bounds) and can report a
   `clamped` note that shows as an inline hint until the next edit.
   The slider track is the human range (`track`), the typed input accepts
   the wider engine bounds (`bounds`); a value above the track pins the
   thumb at the end with a "+" label. */

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
    onCommit(Number.isFinite(parsed) ? parsed : null)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          {label}
        </label>
        <span className="amw-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
          {format(value)}
          {pinned ? '+' : ''}
          {unit}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <Slider
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
          {ticks.length > 0 && (
            <div
              className="amw-mono mt-2 flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            >
              {ticks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          )}
        </div>
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
          aria-describedby={clampedNote || hint ? `${inputId}-hint` : undefined}
          className="border-[var(--amw-line-strong)] bg-[var(--amw-card)] focus:border-[var(--amw-accent)] focus:ring-[var(--amw-accent)]/20 amw-mono w-24 shrink-0 rounded-md border px-3 py-2 text-sm tabular-nums text-zinc-900 focus:outline-none focus:ring-4 dark:text-zinc-100"
        />
      </div>
      {(clampedNote || hint) && (
        <p
          id={`${inputId}-hint`}
          className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {clampedNote ?? hint}
        </p>
      )}
    </div>
  )
}

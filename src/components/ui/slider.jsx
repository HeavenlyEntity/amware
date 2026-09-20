'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/* Slider on the radix-ui umbrella, mapped onto the amw tokens like
   select.jsx: a hairline track, an accent range, and a card-coloured
   thumb with the site's focus ring. Carries the `amw` scope itself. */

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-valuetext': ariaValueText,
  ...props
}) {
  const values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
        ? defaultValue
        : [min],
    [value, defaultValue, min]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'amw data-[disabled]:opacity-50 min-h-11 relative flex w-full touch-none select-none items-center py-2',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-[var(--amw-line-strong)] relative h-1.5 w-full grow overflow-hidden rounded-full"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-[var(--amw-accent)] absolute h-full select-none"
        />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={Array.isArray(ariaLabel) ? ariaLabel[index] : ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-valuetext={
            Array.isArray(ariaValueText) ? ariaValueText[index] : ariaValueText
          }
          className="border-[var(--amw-accent-ink)] bg-[var(--amw-card)] size-6 hover:ring-[var(--amw-accent)]/20 focus-visible:ring-[var(--amw-accent)]/30 block shrink-0 select-none rounded-full border-2 shadow-sm transition-[box-shadow] hover:ring-4 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }

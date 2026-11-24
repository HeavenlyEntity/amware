'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

/* A bento grid of tiles, adapted from React Bits' MagicBento (via the design
   system's MagicBento.jsx): the grid, the `--mb-x` / `--mb-y` pointer
   tracking and the accent glow. Stars, tilt, magnetism, the click wave and
   the built-in artwork are left out; a tile shows its own `visual` or only
   its text. The layout and the glow layers live in the `.st-bento` rules in
   products.css, which collapse the grid to one column on narrow screens.

   Every tile gets the pointer position relative to itself, so the border
   glow reaches into neighbouring tiles while the spotlight lights only the
   tile under the pointer. Under reduced motion nothing tracks the pointer. */

const FALLOFF = [1, 0.973, 0.837, 0.593, 0.317, 0.104, 0.009]

/* A radial falloff in the accent, peaking at `peak` percent opacity. */
const glowStops = (peak) =>
  `${FALLOFF.map(
    (fall, index) =>
      `color-mix(in srgb, var(--amw-accent) ${(peak * fall).toFixed(
        1
      )}%, transparent) ${index * 15}%`
  ).join(', ')}, transparent 100%`

const LIGHT_STYLE = {
  background: `radial-gradient(var(--mb-spot-size) circle at var(--mb-x, -999px) var(--mb-y, -999px), ${glowStops(
    14
  )})`,
}

const BORDER_STYLE = {
  background: `radial-gradient(var(--mb-border-size) circle at var(--mb-x, -999px) var(--mb-y, -999px), ${glowStops(
    90
  )})`,
}

const span = (value) => Math.max(1, Math.round(value ?? 1))

export function MagicBento({
  items = [],
  columns = 3,
  rowHeight = 270,
  spotlightRadius = 300,
  className,
}) {
  const reduce = useReducedMotion()
  const rootRef = useRef(null)

  const cards = () =>
    rootRef.current ? [...rootRef.current.querySelectorAll('[data-tile]')] : []

  const onPointerMove = (event) => {
    const under = event.target.closest?.('[data-tile]')
    const list = cards()
    /* Read every rect before writing, so the writes force no layout. */
    const rects = list.map((card) => card.getBoundingClientRect())
    list.forEach((card, index) => {
      card.style.setProperty(
        '--mb-x',
        `${(event.clientX - rects[index].left).toFixed(1)}px`
      )
      card.style.setProperty(
        '--mb-y',
        `${(event.clientY - rects[index].top).toFixed(1)}px`
      )
      if (card === under) card.dataset.active = ''
      else delete card.dataset.active
    })
    rootRef.current.dataset.near = ''
  }

  const onPointerLeave = () => {
    for (const card of cards()) delete card.dataset.active
    if (rootRef.current) delete rootRef.current.dataset.near
  }

  /* Turning motion off mid-hover puts the glow out rather than freezing it. */
  useEffect(() => {
    if (!reduce || !rootRef.current) return
    for (const card of rootRef.current.querySelectorAll('[data-tile]')) {
      delete card.dataset.active
      card.style.removeProperty('--mb-x')
      card.style.removeProperty('--mb-y')
    }
    delete rootRef.current.dataset.near
  }, [reduce])

  return (
    <div
      ref={rootRef}
      className={cn('st-bento', className)}
      onPointerMove={reduce ? undefined : onPointerMove}
      onPointerLeave={reduce ? undefined : onPointerLeave}
      style={{
        '--st-bento-cols': span(columns),
        '--st-bento-row': `${Math.max(1, rowHeight)}px`,
        '--mb-spot-size': `${Math.max(40, spotlightRadius)}px`,
        '--mb-border-size': `${Math.round(
          Math.max(40, spotlightRadius) * 0.75
        )}px`,
      }}
    >
      {items.map((item, index) => {
        const cols = Math.min(span(columns), span(item.colSpan))
        const rows = span(item.rowSpan)
        return (
          <div
            key={item.id ?? index}
            data-tile=""
            data-rows={rows > 1 ? rows : undefined}
            className="st-bento__card"
            style={{ gridColumn: `span ${cols}`, gridRow: `span ${rows}` }}
          >
            <span
              className="st-bento__light"
              style={LIGHT_STYLE}
              aria-hidden="true"
            />
            {item.label ? (
              <span className="st-bento__label">{item.label}</span>
            ) : null}
            {item.visual ? (
              <div className="st-bento__visual" data-visual="">
                {item.visual}
              </div>
            ) : null}
            {item.title || item.description ? (
              <div className="st-bento__text">
                {item.title ? (
                  <h3 className="st-bento__title">{item.title}</h3>
                ) : null}
                {item.description ? (
                  <p className="st-bento__description">{item.description}</p>
                ) : null}
              </div>
            ) : null}
            <span
              className="st-bento__border"
              style={BORDER_STYLE}
              aria-hidden="true"
            />
          </div>
        )
      })}
    </div>
  )
}

export default MagicBento

'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { CarouselStacked } from '@/components/ui/carousel-stacked'

/* The story as flash cards on a diagonal arc. The current chapter is a
   large card in the centre of the column, level with the profile and ID
   cards beside it; the chapter before sits up and to the left, the ones
   after fall away down and to the right, smaller as they go. Drag the
   fan, press the arrows, or use the keys.

   THE TEXT IS ON THE CARD. That is what a flash card is. Two things make
   that safe at every width: the card is sized from the column (up to
   500px wide, never wider than the column), and its height is measured
   from the longest chapter rendered at that width -- so no card can ever
   clip its own copy, on a phone or a wide screen. Cards that are not in
   front are dimmed and shrunk; their copy is decoration, and they are
   hidden from assistive tech, so a reader hears one chapter at a time.

   The cards are solid, with the page's holographic coating as overlays:
   four other cards are always behind the raised one.

   A11Y. Group with a keyboard, two 44px buttons, dots with a counter, a
   live region. Reduced motion snaps the fan. */

const iconButton =
  'border-[var(--amw-line)] bg-[var(--amw-card)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] flex h-11 w-11 items-center justify-center rounded-full border text-zinc-800 transition-[border-color,color,transform] duration-200 active:scale-95 motion-reduce:active:scale-100 dark:text-zinc-200'

const MAX_CARD_W = 500

function Face({ chapter, offset, active, compact, tight, sizer }) {
  const dim = useTransform(offset, [-2, -1, 0, 1, 2], [0.5, 0.3, 0, 0.3, 0.5])

  return (
    <div
      aria-hidden={active && !sizer ? undefined : true}
      className={`bg-[var(--amw-card)] relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color,box-shadow] duration-300 ${
        tight ? 'p-4' : compact ? 'p-5' : 'p-7'
      } ${
        active
          ? 'border-[var(--amw-accent)] shadow-[0_24px_56px_-24px_rgba(9,9,11,0.4)]'
          : 'border-[var(--amw-line-strong)] shadow-[0_12px_32px_-20px_rgba(9,9,11,0.3)]'
      }`}
    >
      <span aria-hidden="true" className="amw-holo-tint" />
      <span aria-hidden="true" className="amw-holo-shift" />
      <span aria-hidden="true" className="amw-holo-specular" />
      <span aria-hidden="true" className="amw-holo-grain" />

      <div className="relative pb-4">
        <span className="amw-mono text-[var(--amw-accent-ink)] bg-[var(--amw-accent-soft)] ring-[var(--amw-accent)]/30 inline-block rounded-md px-2 py-1 text-sm font-medium ring-1">
          {chapter.number}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, var(--amw-accent) 0%, color-mix(in srgb, var(--amw-accent) 35%, transparent) 55%, transparent 100%)',
          }}
        />
      </div>

      <h2
        style={{ fontFamily: 'Layer, sans-serif' }}
        className={`relative mt-5 font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 ${
          tight ? 'text-lg' : compact ? 'text-xl' : 'text-2xl md:text-3xl'
        }`}
      >
        {chapter.title}
      </h2>
      <p
        /* Body copy never drops below 16px, whatever the card: below that a
           phone zooms and the reading size is gone. Narrow cards hyphenate
           instead. */
        className={`relative mt-4 leading-relaxed text-zinc-600 dark:text-zinc-400 ${
          compact ? 'hyphens-auto text-base' : 'text-lg'
        }`}
      >
        {chapter.copy}
      </p>

      {sizer ? null : (
        <motion.span
          aria-hidden="true"
          style={{ opacity: dim }}
          className="bg-[var(--amw-bg)] pointer-events-none absolute inset-0"
        />
      )}
    </div>
  )
}

export function StoryFan({ chapters }) {
  const reduce = useReducedMotion()
  const fan = useRef(null)
  const wrap = useRef(null)
  const sizerRef = useRef(null)
  const [active, setActive] = useState(0)
  const [columnW, setColumnW] = useState(0)
  const [needH, setNeedH] = useState(0)
  const total = chapters.length
  const current = chapters[active]
  /* The sizer never moves, but Face reads a motion value for its dimming
     layer; a constant one avoids a second code path. */
  const still = useMotionValue(0)

  const longest = useMemo(
    () =>
      chapters.reduce((a, b) =>
        b.copy.length + b.title.length * 2 > a.copy.length + a.title.length * 2
          ? b
          : a
      ),
    [chapters]
  )

  /* Card width from the column; card height from the longest chapter at
     that width. Both re-measure on resize. */
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const measure = () => {
      setColumnW(el.clientWidth)
      if (sizerRef.current) setNeedH(sizerRef.current.offsetHeight)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (sizerRef.current) ro.observe(sizerRef.current)
    return () => ro.disconnect()
  }, [])

  const cardW = Math.max(240, Math.min(MAX_CARD_W, columnW - 24))
  const compact = cardW < 420
  const tight = cardW < 300
  const cardH = Math.max(Math.round(cardW * 1.12), needH)
  const size = useMemo(() => ({ w: cardW, h: cardH }), [cardW, cardH])

  /* The diagonal arc. One step out is up to half a card right and a
     third of a card down (mirrored for the card before); the curve
     flattens the second step so the line bends rather than runs straight.
     The horizontal step is capped so the card one step out sits inside
     the column instead of being cut at its edge: nothing here clips, the
     page does, and only at the paper's edge. */
  /* Depth: one step out is a little over half size, two steps out under a
     third, so the far cards read as far away and the fan stays in
     proportion with the profile and ID cards beside it. */
  const scaleStep = 0.45
  const geometry = useMemo(() => {
    const neighbourHalf = (cardW * (1 - scaleStep)) / 2
    const fits = Math.max(0, (columnW - cardW) / 2 + cardW / 2 - neighbourHalf)
    return {
      dx: Math.round(Math.max(cardW * 0.26, Math.min(cardW * 0.5, fits))),
      dy: Math.round(cardH * 0.3),
      curve: 0.7,
      rotation: 6,
      scaleStep,
      minScale: 0.3,
    }
  }, [cardW, cardH, columnW])
  /* Less room above and below on a phone: the side cards barely show
     there, so the frame need not reserve for them. */
  const height = Math.round(cardH * (compact ? 1.22 : 1.36))

  const next = useCallback(() => fan.current?.next(), [])
  const prev = useCallback(() => fan.current?.prev(), [])

  const onKeyDown = (event) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      prev()
    }
  }

  const renderCard = useCallback(
    (chapter, _index, { offset, active: isActive }) => (
      <Face
        chapter={chapter}
        offset={offset}
        active={isActive}
        compact={compact}
        tight={tight}
      />
    ),
    [compact, tight]
  )

  return (
    <div ref={wrap} className="relative">
      {/* Invisible, out of flow: the longest chapter at the card's width,
          measured to size every card. */}
      <div
        ref={sizerRef}
        aria-hidden="true"
        className="invisible absolute left-0 top-0"
        style={{ width: cardW }}
      >
        <Face
          chapter={longest}
          offset={still}
          active
          compact={compact}
          tight={tight}
          sizer
        />
      </div>

      {/* Keyboard-operable carousel region: arrow keys supplement its buttons. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="The story, one chapter per card"
        // Keyboard focus enables the carousel’s arrow-key controls.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={onKeyDown}
        /* No rounded-2xl here: a stylesheet rule gives that class a card
           shadow, which drew a phantom card the size of the whole fan. The
           radius is only wanted with the focus ring. */
        className="focus-visible:ring-[var(--amw-accent)] focus-visible:ring-offset-[var(--amw-bg)] outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-4"
      >
        <CarouselStacked
          ref={fan}
          items={chapters}
          renderCard={renderCard}
          onChange={setActive}
          reduce={Boolean(reduce)}
          size={size}
          height={height}
          geometry={geometry}
          bounds={columnW ? { width: columnW, height } : undefined}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {chapters.map((chapter, i) => (
            <span
              key={chapter.number}
              className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                i === active
                  ? 'bg-[var(--amw-accent)] w-6'
                  : 'bg-[var(--amw-line-strong)] w-3'
              }`}
            />
          ))}
          <span className="amw-mono ml-3 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
            {current.number} / {String(total).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous chapter"
            className={iconButton}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next chapter"
            className={iconButton}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Chapter {active + 1} of {total}: {current.title}
      </p>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMediaQuery } from '@/hooks/use-client-value'

/* Started from React Bits Pro "Page Flip" (@reactbits-starter/page-flip-tw),
   which turns image leaves on click. Reworked for a book whose pages are
   content rather than pictures:

   - LEAVES TAKE NODES. `pages: [{ id, front, back }]`, each side a React
     node. `endPage` is the static inside back cover under the last leaf.
   - CONTROLLED. `page` is the number of turned leaves, `onPageChange` asks
     for a new one; without `page` the book keeps its own state.
   - SPINE ANCHORED. The leaf stack always sits on the right half of a
     two-page stage, so the closed cover fills the right page slot and the
     left half stays free for whatever the caller puts there.
   - THE TURN. Plain CSS transitions, not a spring: the z-index change is a
     zero-length transition delayed by half the turn, so a leaf crosses the
     spine above its neighbours in both directions. A jump across several
     leaves staggers them, last-turned first on the way back.
   - PHONE MODE. At the `verticalQuery` width the book flips like a notepad:
     hinged on the top edge, the stack slides down a page when open, and the
     stage grows to two page heights.
   - HIT AREAS. Two transparent buttons over the next and previous leaves.
     They are out of the tab order and hidden from assistive tech because
     the caller's visible controls already cover keyboard and screen-reader
     use. Faces that are not on show are `inert`, so nothing hidden inside a
     closed spread can take focus.

   Reduced motion makes every turn instant. So does the first frame after
   hydration: the server assumes the wide layout, and a phone switching to
   the notepad must snap into it rather than slide across. */

const TURN_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const SLIDE = '0.6s cubic-bezier(0.2, 0.7, 0.2, 1)'
const FACE_SHADOW =
  '0 30px 60px -32px rgba(0, 0, 0, 0.95), inset 0 0 0 1px rgba(255, 255, 255, 0.07)'

const toLength = (value) => (typeof value === 'number' ? `${value}px` : value)

function Face({ side, vertical, radius, color, shade, inert, children }) {
  const back = side === 'back'
  const corners = vertical
    ? back
      ? `${radius} ${radius} 0 0`
      : `0 0 ${radius} ${radius}`
    : back
    ? `${radius} 0 0 ${radius}`
    : `0 ${radius} ${radius} 0`
  /* The spine shade sits on the inner edge: the left of a right-hand page,
     the right of a left-hand one (top and bottom on a phone). */
  const shadeStyle = vertical
    ? {
        left: 0,
        right: 0,
        height: 30,
        [back ? 'bottom' : 'top']: 0,
        background: `linear-gradient(${
          back ? '0deg' : '180deg'
        }, rgba(0,0,0,0.5), rgba(0,0,0,0))`,
      }
    : {
        top: 0,
        bottom: 0,
        width: 34,
        [back ? 'right' : 'left']: 0,
        background: `linear-gradient(${
          back ? '270deg' : '90deg'
        }, rgba(0,0,0,0.5), rgba(0,0,0,0))`,
      }

  return (
    <div
      inert={inert}
      className="absolute inset-0 overflow-hidden"
      style={{
        background: color,
        borderRadius: corners,
        boxShadow: FACE_SHADOW,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back
          ? vertical
            ? 'rotateX(180deg)'
            : 'rotateY(180deg)'
          : undefined,
      }}
    >
      <div className="relative flex h-full flex-col">{children}</div>
      {shade > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ ...shadeStyle, opacity: shade }}
        />
      )}
    </div>
  )
}

export default function PageFlip({
  pages = [],
  endPage = null,
  page,
  defaultPage = 0,
  onPageChange,
  pageWidth = 360,
  pageHeight = 530,
  pageRadius = 14,
  pageColor = '#101015',
  endPageColor = '#0b0b0f',
  perspective = 2200,
  duration = 0.7,
  stagger = 0.09,
  peekAngle = 12,
  verticalQuery = '(max-width: 767px)',
  className = '',
  style,
  ...rest
}) {
  const reduce = useReducedMotion()
  const vertical = useMediaQuery(verticalQuery, false)
  const total = pages.length

  const [internal, setInternal] = useState(defaultPage)
  const open = Math.max(0, Math.min(total, page ?? internal))

  /* Where the last turn started, for the stagger. Updated during render
     when `open` changes, React's pattern for state derived from a previous
     prop: no effect, no extra commit. */
  const [turn, setTurn] = useState({ from: open, to: open })
  if (turn.to !== open) setTurn({ from: turn.to, to: open })
  const from = turn.to !== open ? turn.to : turn.from

  /* The hit area unmounts under the pointer on the last leaf, so its
     pointerleave never fires; drop the peek here instead. */
  const [peeking, setPeeking] = useState(false)
  if (peeking && open === total) setPeeking(false)

  /* Transitions switch on two frames after mount, once the client's media
     query values have replaced the server defaults. */
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  const go = (next) => {
    const target = Math.max(0, Math.min(total, next))
    if (target === open) return
    if (page === undefined) setInternal(target)
    onPageChange?.(target)
  }

  const w = toLength(pageWidth)
  const h = toLength(pageHeight)
  const r = toLength(pageRadius)
  const still = reduce || !ready
  const dur = still ? 0 : duration

  return (
    <div
      {...rest}
      className={`relative ${className}`.trim()}
      style={{
        width: vertical ? w : `calc(${w} * 2)`,
        height: vertical && open > 0 ? `calc(${h} * 2)` : h,
        transition: still ? 'none' : `height ${SLIDE}`,
        ...style,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: w,
          height: h,
          perspective: `${perspective}px`,
          perspectiveOrigin: vertical ? '50% 0%' : '0% 50%',
          transform: vertical
            ? `translateY(${open > 0 ? h : '0px'})`
            : `translateX(${w})`,
          transition: still ? 'none' : `transform ${SLIDE}`,
        }}
      >
        {endPage && (
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            <Face
              side="front"
              vertical={vertical}
              radius={r}
              color={endPageColor}
              shade={1}
              inert={open !== total}
            >
              {endPage}
            </Face>
          </div>
        )}

        {pages.map((leaf, i) => {
          const turned = i < open
          let delay = 0
          if (open > from && i >= from && i < open) delay = (i - from) * stagger
          else if (open < from && i >= open && i < from)
            delay = (from - 1 - i) * stagger
          const peek = peeking && i === open
          /* A peek answers the pointer now, not after a stale stagger. */
          if (still || peek) delay = 0

          const axis = vertical ? 'rotateX' : 'rotateY'
          const angle = turned
            ? vertical
              ? 180
              : -180
            : peek
            ? vertical
              ? 8
              : -peekAngle
            : 0

          return (
            <div
              key={leaf.id ?? i}
              className="absolute inset-0"
              style={{
                transform: `${axis}(${angle}deg)`,
                transformOrigin: vertical ? '50% 0%' : '0% 50%',
                transformStyle: 'preserve-3d',
                zIndex: turned ? total + i + 1 : total - i,
                transitionProperty: 'transform, z-index',
                transitionDuration: `${dur}s, 0s`,
                transitionTimingFunction: `${TURN_EASE}, linear`,
                transitionDelay: `${delay.toFixed(2)}s, ${(
                  delay +
                  dur / 2
                ).toFixed(2)}s`,
              }}
            >
              <Face
                side="front"
                vertical={vertical}
                radius={r}
                color={leaf.frontColor ?? pageColor}
                shade={leaf.frontShade ?? 1}
                inert={i !== open}
              >
                {leaf.front}
              </Face>
              <Face
                side="back"
                vertical={vertical}
                radius={r}
                color={leaf.backColor ?? pageColor}
                shade={leaf.backShade ?? 1}
                inert={i !== open - 1}
              >
                {leaf.back}
              </Face>
            </div>
          )
        })}

        {open > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => go(open - 1)}
            className="absolute z-[60] cursor-pointer border-0 bg-transparent p-0"
            style={{
              width: w,
              height: h,
              left: vertical ? 0 : `calc(${w} * -1)`,
              top: vertical ? `calc(${h} * -1)` : 0,
            }}
          />
        )}
        {open < total && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => go(open + 1)}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') setPeeking(true)
            }}
            onPointerLeave={() => setPeeking(false)}
            className="absolute left-0 top-0 z-[60] cursor-pointer border-0 bg-transparent p-0"
            style={{ width: w, height: h }}
          />
        )}
      </div>
    </div>
  )
}

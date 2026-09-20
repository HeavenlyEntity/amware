'use client'

import { useReducedMotion } from '@/components/AccessibilityProvider'

import { Component, useCallback, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import crownMark from '@/images/logos/amware-crown-mark.webp'

/* The glass crown is desktop-only (WebGL + a 3D asset is too much for a
   footer on phones); phones get the flat ink silhouette instead. */
const AmwareCrown3d = dynamic(
  () => import('@/components/brand/amware-crown-3d'),
  {
    ssr: false,
    /* Hold the box while the chunk loads. Showing the still here instead
       would put a second crown on screen and then pop it out from under the
       first one. */
    loading: () => <span aria-hidden="true" className="block h-24 w-28" />,
  }
)

/* Decrypt engine adapted from 21st.dev "Decrypt Text" (@rmahammad, MIT,
   via motiq.dev). The server and screen readers always get the real
   string; the scramble exists only in the aria-hidden layer after mount,
   driven by one rAF loop that writes textContent + data-state only. */

/* The flat mark is the crown's FAILURE state, not a layer underneath it.
   It used to render unconditionally at 20% behind the canvas, which put a
   second crown on the slab and made the hit area read as two overlapping
   things. It now appears only when WebGL actually throws. */
class CrownBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const CREED = ['A', 'Masterpiece', 'Will', 'Always', 'Require', 'Effort']
const GLYPHS = '#%&@$?!*+=/{}[]<>~^'
const SPEED = 45
const STAGGER = 55
const START_DELAY = 350
const JITTER = 120
const HOVER_COOLDOWN = 1500

/* mulberry32 — deterministic, no Math.random at render (SSR-stable). */
function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* `onAccent` restyles the block for the teal footer slab: near-black ink
   in both themes (the dark-mode accent is light enough that zinc-50 would
   fail contrast) and black hairlines instead of the token lines. */
/* `centered` is the footer treatment: the line runs quietly across the
   full width in the mono face, sized by viewport so it stays on one line
   from tablet up, with the crown mark above it when `mark` is set. */
export default function AmwareCreed({
  onAccent = false,
  centered = false,
  mark = false,
  markHref,
}) {
  const rootRef = useRef(null)
  const charRefs = useRef([])
  const rafRef = useRef(null)
  const runRef = useRef(0)
  const playedRef = useRef(false)
  const lastStartRef = useRef(-Infinity)
  const reduce = useReducedMotion()
  const reduceRef = useRef(false)

  const words = useMemo(() => {
    const out = []
    let i = 0
    for (const word of CREED) {
      const text = word === 'Effort' ? `${word}.` : word
      out.push(Array.from(text).map((ch) => ({ i: i++, ch })))
    }
    return out
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const resolveAll = useCallback(() => {
    for (const el of charRefs.current) {
      if (!el) continue
      el.textContent = el.dataset.char ?? el.textContent
      el.dataset.state = 'plain'
      el.style.width = ''
    }
  }, [])

  const play = useCallback(() => {
    const rng = makeRng(1 + runRef.current * 7919)
    runRef.current += 1
    stop()

    const cells = charRefs.current.filter(Boolean)
    if (cells.length === 0) return
    lastStartRef.current = performance.now()
    playedRef.current = true

    /* Lock each cell to its resolved width (batched read, then write) so
       the proportional display face doesn't reflow while glyphs cycle. */
    const widths = cells.map((el) => el.getBoundingClientRect().width)
    cells.forEach((el, idx) => {
      el.style.width = `${widths[idx]}px`
      el.dataset.state = 'scramble'
      el.textContent = GLYPHS.charAt((rng() * GLYPHS.length) | 0)
    })

    const lockAt = cells.map(
      (_, idx) => START_DELAY + idx * STAGGER + (rng() * 2 - 1) * JITTER
    )
    const nextAt = cells.map(() => 0)
    const locked = cells.map(() => false)

    let remaining = cells.length
    const t0 = performance.now()

    const frame = () => {
      const now = performance.now() - t0
      cells.forEach((el, idx) => {
        if (locked[idx]) return
        if (now >= lockAt[idx]) {
          el.textContent = el.dataset.char ?? ''
          el.dataset.state = 'lock'
          locked[idx] = true
          remaining -= 1
        } else if (now >= nextAt[idx]) {
          el.textContent = GLYPHS.charAt((rng() * GLYPHS.length) | 0)
          nextAt[idx] = now + SPEED + rng() * 35
        }
      })
      if (remaining <= 0) {
        cells.forEach((el) => {
          el.style.width = ''
        })
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
  }, [stop])

  useEffect(() => {
    reduceRef.current = reduce
    if (reduce) {
      stop()
      resolveAll()
    }

    const el = rootRef.current
    let io
    if (el && !reduce && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (
            entries.some((entry) => entry.isIntersecting) &&
            !playedRef.current
          ) {
            play()
            io.disconnect()
          }
        },
        { threshold: 0.4 }
      )
      io.observe(el)
    }

    return () => {
      io?.disconnect()
      stop()
    }
  }, [play, resolveAll, stop, reduce])

  const onPointerEnter = useCallback(() => {
    if (reduceRef.current || !playedRef.current) return
    if (rafRef.current != null) return
    if (performance.now() - lastStartRef.current < HOVER_COOLDOWN) return
    play()
  }, [play])

  return (
    <div
      className={
        onAccent
          ? `amw-creed--on-accent border-zinc-950/15 border-y border-dashed ${
              centered ? 'py-8 sm:py-10' : 'py-14 sm:py-20'
            }`
          : 'border-[var(--amw-line)] border-y border-dashed py-14 sm:py-20'
      }
    >
      {mark &&
        (markHref ? (
          /* The anchor wraps the crown and NOTHING else: anything inside it
             is clickable, so the hint sits outside as a peer. That keeps the
             target the size of the thing you can see. */
          <div className="mb-4 flex flex-col items-center">
            <Link
              href={markHref}
              aria-label="Enter AMWARE machine interface"
              className="peer inline-block cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <Image
                src={crownMark}
                alt=""
                sizes="112px"
                className="h-auto w-28 md:hidden"
              />
              <span className="hidden md:block">
                <CrownBoundary
                  fallback={
                    <Image
                      src={crownMark}
                      alt=""
                      sizes="112px"
                      className="h-auto w-28"
                    />
                  }
                >
                  <AmwareCrown3d className="h-24 w-28" />
                </CrownBoundary>
              </span>
            </Link>
            {/* The anchor already carries the accessible name, so this is the
                visible half of the same thing and would otherwise be read
                twice. */}
            <span
              aria-hidden="true"
              /* .amw-mono, not .amw-kicker: the kicker sets its own colour in
                 unlayered CSS and would beat the utility below.
                 Always visible under md: a touch device has no hover, so a
                 hover-revealed affordance would never appear there at all. */
              className={`amw-mono mt-1 text-[11px] uppercase tracking-[0.14em] opacity-100 peer-hover:opacity-100 peer-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-200 md:opacity-0 ${
                onAccent ? 'text-zinc-950' : 'text-[var(--amw-accent-ink)]'
              }`}
            >
              Enter machine interface &rarr;
            </span>
          </div>
        ) : (
          <>
            <AmwareCrown3d className="mx-auto mb-2 hidden h-20 w-24 md:block lg:h-24 lg:w-28" />
            <Image
              src={crownMark}
              alt=""
              aria-hidden="true"
              sizes="160px"
              className="mx-auto mb-4 h-auto w-32 md:hidden"
            />
          </>
        ))}
      <p
        className={`amw-mono text-xs ${
          onAccent ? 'text-zinc-950/70' : 'text-zinc-500 dark:text-zinc-400'
        } ${centered ? 'text-center' : ''}`}
      >
        <span
          className={
            onAccent ? 'text-zinc-950' : 'text-[var(--amw-accent-ink)]'
          }
        >
          $
        </span>{' '}
        amware --expand
      </p>
      <p
        ref={rootRef}
        onPointerEnter={onPointerEnter}
        style={centered ? undefined : { fontFamily: 'Layer, sans-serif' }}
        className={`${
          centered
            ? 'amw-mono mt-4 text-center text-[clamp(0.6rem,1.8vw,1.6rem)] font-medium uppercase leading-[1.6] tracking-[0.45em] sm:whitespace-nowrap'
            : 'mt-8 max-w-4xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl'
        } ${onAccent ? 'text-zinc-950' : 'text-zinc-900 dark:text-zinc-50'}`}
      >
        <span className="sr-only">
          A Masterpiece Will Always Require Effort.
        </span>
        <span aria-hidden="true">
          {words.map((chars, w) => (
            <span
              key={w}
              className="mr-[0.3em] inline-block whitespace-nowrap last:mr-0"
            >
              {chars.map((item, c) => (
                <span
                  key={item.i}
                  ref={(node) => {
                    charRefs.current[item.i] = node
                  }}
                  data-char={item.ch}
                  data-state="plain"
                  data-initial={c === 0 ? '' : undefined}
                  className="amw-creed-char"
                >
                  {item.ch}
                </span>
              ))}
            </span>
          ))}
        </span>
      </p>
    </div>
  )
}

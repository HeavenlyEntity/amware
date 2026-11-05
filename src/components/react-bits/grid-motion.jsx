'use client'

import Image from 'next/image'
import { isValidElement, useEffect, useMemo, useRef, useState } from 'react'

/*
 * GridMotion (React Bits), as customised for the services board
 * (vendor/grid-motion.js, which bundled this with its own copy of React).
 *
 * A wall of tiles on a plane rotated `angle` degrees and tipped back `tilt`
 * degrees, its rows drifting sideways on their own (`speed` px/s, rows
 * alternating), leaning with the pointer (`parallax`), and lighting the
 * tiles under it (`spotlight`) out of their `dim` and `grayscale` rest. The
 * edges fade out (`fade`). Everything is DOM and transforms; no WebGL.
 *
 * Changes from the board's copy:
 * - `reduced` comes from the caller (the site's pause toggle as well as the
 *   OS setting). Under it the wall is laid out once and holds still: no
 *   drift, no lean, no spotlight, no fade-in, and no animation frame at all.
 * - Image tiles take a static import and render through next/image at a
 *   small `sizes`, lazily and at low fetch priority. Plain URLs still work.
 * - The board's Tailwind classes are the `gm-*` rules in services.css.
 * - `onReady` is called once, after the first frame is laid out, so a
 *   caller can retire its poster.
 *
 * The loop stops while the wall is off screen; the browser stops it in a
 * hidden tab. Decorative: the plane is aria-hidden and images have no alt.
 */

const THEMES = {
  dark: {
    tile: '#1b1922',
    text: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(255, 255, 255, 0.07)',
  },
  light: {
    tile: '#f4f4f5',
    text: '#3f3f46',
    border: 'rgba(24, 24, 27, 0.08)',
  },
}
const DIRECTIONS = ['alternate', 'left', 'right']
const IMAGE_URL =
  /^(https?:\/\/|\/\/|\/|\.\.?\/|data:image\/|blob:)|\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i
/* Per-row parallax lag (s) and drift speed factor, so rows never lock. */
const ROW_LAG = [0.42, 0.32, 0.26, 0.22]
const ROW_SPEED = [1, 0.86, 1.12, 0.94]
const EMPTY = { kind: 'empty' }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const mod = (value, size) => ((value % size) + size) % size
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/* A smootherstep alpha ramp in from both ends of `direction`. */
function fadeMask(direction, extent) {
  const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const head = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    head.push(
      `rgba(0, 0, 0, ${ease(t).toFixed(4)}) ${(t * extent).toFixed(2)}%`
    )
  }
  const tail = head.map((_, i) => {
    const t = (12 - i) / 12
    return `rgba(0, 0, 0, ${ease(t).toFixed(4)}) ${(100 - t * extent).toFixed(
      2
    )}%`
  })
  return `linear-gradient(${direction}, ${head.join(', ')}, ${tail.join(', ')})`
}

function toTile(item) {
  if (item == null || item === false) return EMPTY
  if (isValidElement(item)) return { kind: 'node', node: item }
  if (typeof item === 'object' && 'src' in item) {
    /* A next/image static import, or { src, alt }. */
    const src = typeof item.src === 'string' ? item.src : null
    if (item.width && item.height) return { kind: 'image', src: item, alt: '' }
    if (src) return { kind: 'image', src, alt: item.alt ?? '' }
  }
  const text = String(item).trim()
  return IMAGE_URL.test(text)
    ? { kind: 'image', src: text, alt: '' }
    : { kind: 'text', text }
}

function Tile({ tile, gray, sizes }) {
  return (
    <div className={gray ? 'gm-tile gm-tile--gray' : 'gm-tile'}>
      {tile.kind === 'image' ? (
        typeof tile.src === 'string' ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="gm-img"
            src={tile.src}
            alt={tile.alt}
            draggable={false}
            decoding="async"
            loading="lazy"
          />
        ) : (
          <Image
            className="gm-img"
            src={tile.src}
            alt={tile.alt}
            fill
            sizes={sizes}
            draggable={false}
            fetchPriority="low"
          />
        )
      ) : null}
      {tile.kind === 'text' ? (
        <span className="gm-text">{tile.text}</span>
      ) : null}
      {tile.kind === 'node' ? tile.node : null}
    </div>
  )
}

export default function GridMotion({
  items = [],
  rows = 4,
  aspectRatio = 1.33,
  gap = 16,
  radius = 14,
  angle = -12,
  tilt = 0,
  speed = 24,
  direction = 'alternate',
  parallax = 0.5,
  spotlight = 0.6,
  dim = 0.35,
  grayscale = false,
  fade = 0.5,
  tileColor,
  textColor,
  theme = 'dark',
  reduced = false,
  sizes = '320px',
  onReady,
  className = '',
  style,
}) {
  const hostRef = useRef(null)
  const planeRef = useRef(null)
  const stateRef = useRef({
    offsets: [],
    shifts: [],
    intro: 0,
    pointer: { x: 0, y: 0, active: false },
  })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const palette = THEMES[theme] ?? THEMES.dark

  const opts = {
    rows: clamp(Math.round(rows), 1, 12),
    aspect: clamp(aspectRatio, 0.3, 4),
    gap: Math.max(0, gap),
    angle,
    tilt: clamp(tilt, 0, 75),
    speed,
    direction: DIRECTIONS.includes(direction) ? direction : 'alternate',
    parallax: clamp(parallax, 0, 1),
    spotlight: clamp(spotlight, 0, 1),
    dim: clamp(dim, 0, 1),
    fade: clamp(fade, 0, 1),
  }
  const optsRef = useRef(opts)
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    optsRef.current = opts
    onReadyRef.current = onReady
  })

  /* Plane size and tile size for the host's box: big enough that the
     rotated, tipped plane still covers every corner. */
  const layout = useMemo(() => {
    const { width, height } = size
    if (!width || !height) return null
    const a = (opts.angle * Math.PI) / 180
    const t = (opts.tilt * Math.PI) / 180
    const cos = Math.abs(Math.cos(a))
    const sin = Math.abs(Math.sin(a))
    const planeHeight =
      ((width * sin + height * cos) / Math.max(0.3, Math.cos(t))) * 1.12
    const planeWidth =
      (width * cos + height * sin) * (1 + Math.sin(t) * 0.9) * 1.12
    const tileHeight = Math.max(
      16,
      (planeHeight - opts.gap * (opts.rows - 1)) / opts.rows
    )
    const tileWidth = tileHeight * opts.aspect
    const step = tileWidth + opts.gap
    const perRow = Math.ceil(planeWidth / step) + 1
    const period = perRow * step
    return {
      planeWidth,
      planeHeight,
      tileWidth,
      tileHeight,
      step,
      perRow,
      period,
      copies: Math.ceil(planeWidth / period) + 2,
      top:
        (planeHeight - opts.rows * tileHeight - (opts.rows - 1) * opts.gap) / 2,
      perspective: Math.max(width, height) * 1.5,
    }
  }, [size, opts.angle, opts.tilt, opts.rows, opts.gap, opts.aspect])

  const tiles = useMemo(() => items.map(toTile), [items])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const resize = new ResizeObserver(() => {
      const width = Math.round(host.clientWidth)
      const height = Math.round(host.clientHeight)
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    })
    resize.observe(host)
    const pointer = stateRef.current.pointer
    const onMove = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }
    const onUp = (event) => {
      if (event.pointerType === 'touch') pointer.active = false
    }
    const onLeave = () => {
      pointer.active = false
    }
    const root = document.documentElement
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('blur', onLeave)
    root.addEventListener('pointerleave', onLeave)
    return () => {
      resize.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('blur', onLeave)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    const plane = planeRef.current
    if (!host || !plane || !layout) return undefined
    const st = stateRef.current
    const rowEls = Array.from(plane.children)
    const cells = rowEls.map((row) => Array.from(row.children))
    const spots = cells.map((list) => new Float32Array(list.length))
    const shown = cells.map((list) => new Float32Array(list.length))
    let raf = 0
    let last = performance.now()
    let visible = true
    let alive = true
    if (reduced) st.intro = 1
    if (st.intro >= 1) plane.style.opacity = '1'

    const tick = (now) => {
      raf = 0
      if (!alive) return
      const o = optsRef.current
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      if (st.intro < 1) {
        st.intro = Math.min(1, st.intro + dt / 0.9)
        plane.style.opacity = String(1 - (1 - st.intro) ** 3)
      }

      /* The pointer, unprojected onto the tipped, rotated plane. */
      const rect = host.getBoundingClientRect()
      const scale = rect.width ? host.clientWidth / rect.width : 1
      const halfW = host.clientWidth / 2 || 1
      const halfH = host.clientHeight / 2 || 1
      const px = (st.pointer.x - rect.left) * scale - halfW
      const py = (st.pointer.y - rect.top) * scale - halfH
      const inside =
        !reduced &&
        st.pointer.active &&
        Math.abs(px) <= halfW &&
        Math.abs(py) <= halfH
      const t = (o.tilt * Math.PI) / 180
      const a = (o.angle * Math.PI) / 180
      const persp = layout.perspective
      let ly = py
      let lx = px
      if (t > 1e-4) {
        ly = (py * persp) / (persp * Math.cos(t) + py * Math.sin(t))
        lx = (px * (persp - ly * Math.sin(t))) / persp
      }
      const rx = lx * Math.cos(a) + ly * Math.sin(a)
      const ry = -lx * Math.sin(a) + ly * Math.cos(a)
      const lean = st.pointer.active && !reduced ? clamp(px / halfW, -1, 1) : 0
      const reach =
        (0.6 + 2.2 * o.spotlight) *
        Math.max(layout.tileWidth, layout.tileHeight)
      const settle = reduced ? 1 : 1 - Math.exp(-dt / 0.22)

      rowEls.forEach((row, r) => {
        const way =
          o.direction === 'left'
            ? -1
            : o.direction === 'right' || r % 2
            ? 1
            : -1
        if (st.offsets[r] === undefined) {
          st.offsets[r] = r * layout.step * 0.37
          st.shifts[r] = 0
        }
        if (!reduced) {
          st.offsets[r] += o.speed * way * ROW_SPEED[r % ROW_SPEED.length] * dt
        }
        const target = reduced
          ? 0
          : o.parallax * layout.tileWidth * 1.2 * lean * (r % 2 ? -1 : 1)
        st.shifts[r] = reduced
          ? 0
          : st.shifts[r] +
            (target - st.shifts[r]) *
              (1 - Math.exp(-dt / ROW_LAG[r % ROW_LAG.length]))
        const x =
          -layout.period + mod(st.offsets[r] + st.shifts[r], layout.period)
        row.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`

        const cy =
          layout.top +
          r * (layout.tileHeight + o.gap) +
          layout.tileHeight / 2 -
          layout.planeHeight / 2
        const cx = x - layout.planeWidth / 2 + layout.tileWidth / 2
        const list = cells[r]
        const spot = spots[r]
        const drawn = shown[r]
        for (let i = 0; i < list.length; i++) {
          let want = 0
          if (inside && o.spotlight > 0) {
            const d = Math.hypot(cx + i * layout.step - rx, cy - ry) / reach
            want = 1 - smoothstep(0.25, 1, d)
          }
          spot[i] += (want - spot[i]) * settle
          if (
            Math.abs(spot[i] - drawn[i]) > 0.004 ||
            (want === 0 && spot[i] < 0.004 && drawn[i] !== 0)
          ) {
            drawn[i] = spot[i] < 0.004 ? 0 : spot[i]
            list[i].style.setProperty('--spot', drawn[i].toFixed(3))
          }
        }
      })
      if (!st.ready) {
        st.ready = true
        onReadyRef.current?.()
      }
      if (visible && !reduced) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible && !raf && !reduced) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    })
    io.observe(host)
    if (reduced) tick(performance.now())
    else raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [layout, tiles, reduced])

  const grid = layout
    ? Array.from({ length: opts.rows }, (_, r) =>
        Array.from({ length: layout.perRow }, (_, c) =>
          tiles.length ? tiles[(r * layout.perRow + c) % tiles.length] : EMPTY
        )
      )
    : []
  const mask =
    opts.fade > 0
      ? `${fadeMask('to right', opts.fade * 34)}, ${fadeMask(
          'to bottom',
          opts.fade * 44
        )}`
      : undefined

  return (
    <div
      ref={hostRef}
      className={`gm-root${className ? ` ${className}` : ''}`}
      style={{
        '--gm-tile': tileColor ?? palette.tile,
        '--gm-text': textColor ?? palette.text,
        '--gm-border': palette.border,
        '--gm-radius': `${Math.max(0, radius)}px`,
        '--gm-dim': opts.dim,
        perspective:
          layout && opts.tilt > 0 ? `${layout.perspective}px` : undefined,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: mask ? 'intersect' : undefined,
        WebkitMaskComposite: mask ? 'source-in' : undefined,
        ...style,
      }}
    >
      {layout ? (
        <div
          ref={planeRef}
          className="gm-plane"
          aria-hidden="true"
          style={{
            width: layout.planeWidth,
            height: layout.planeHeight,
            transform: `translate(-50%, -50%) rotateX(${opts.tilt}deg) rotateZ(${opts.angle}deg)`,
            '--gm-gap': `${opts.gap}px`,
            '--gm-tile-w': `${layout.tileWidth}px`,
            '--gm-tile-h': `${layout.tileHeight}px`,
            '--gm-font': `${clamp(layout.tileHeight * 0.12, 12, 32)}px`,
          }}
        >
          {grid.map((row, r) => (
            <div
              key={r}
              className="gm-row"
              style={{ top: layout.top + r * (layout.tileHeight + opts.gap) }}
            >
              {Array.from({ length: layout.copies * layout.perRow }, (_, i) => (
                <Tile
                  key={i}
                  tile={row[i % layout.perRow]}
                  gray={grayscale}
                  sizes={sizes}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

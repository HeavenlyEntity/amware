'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import Image from 'next/image'
import { DotFlow } from '@/components/ui/dot-display/dot-flow'
import { RollingNumber } from '@/components/ui/motion/rolling-number'

/* Illustrated figures for the "How We Ship" step cards. Real HTML labels
   (readable at any size), vendor marks from Simple Icons on white tiles
   (the About page convention), and two PaceUI instruments ported for
   the pipeline readout: DotFlow (dot-matrix step flow) and RollingNumber.

   Entrance and hover states cascade down as motion variants from the
   parent card ("hidden" -> "visible" -> "hover"); `active` is true while
   the card is in view and motion is allowed, and gates the instruments
   that would otherwise tick forever off-screen. */

const ease = [0.22, 1, 0.36, 1]

const FIGURE = 'h-60 px-4 pb-4 pt-8'

function VendorMark({ slug, image, label, size = 'md' }) {
  const box = size === 'xs' ? 'h-6 w-6' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const glyph =
    size === 'xs' ? 'h-3.5 w-3.5' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span
      className={`ring-[var(--amw-line)] inline-flex shrink-0 items-center justify-center rounded-md bg-white ring-1 ${box}`}
      title={label}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          width={20}
          height={20}
          className={`${glyph} object-contain`}
          unoptimized
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`https://cdn.simpleicons.org/${slug}`}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          className={glyph}
        />
      )}
    </span>
  )
}

/* ---- fig.01 — entry point ------------------------------------------------ */
/* Vertical fork: the "you" node on top, two straight tracks down to the
   mode cards, which sit side by side across the full width so both lines
   of text fit at any card width. Tracks and pulses are plotted in
   percentages of the track cell, so nothing distorts as the card resizes. */

const MODES = [
  /* Slack is no longer served by Simple Icons; Linear stands in for the
     "working together" side of the fork. */
  { code: 'Mode A', label: 'Built with you', slug: 'linear', x: '25%' },
  { code: 'Mode B', label: 'Build on mine', slug: 'github', x: '75%' },
]

/* Where the trunk splits into the two branches, as a % of the track cell. */
const SPLIT = 40

const track = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, delay: 0.25 + i * 0.12, ease },
  }),
}

const pulse = {
  hidden: { opacity: 0, left: '50%', top: '0%' },
  visible: { opacity: 0, left: '50%', top: '0%' },
  hover: (x) => ({
    opacity: [0, 1, 1, 0],
    left: ['50%', '50%', x],
    top: ['0%', `${SPLIT}%`, '100%'],
    transition: {
      duration: 1.1,
      repeat: Infinity,
      repeatDelay: 0.4,
      ease: 'easeInOut',
      delay: x === '25%' ? 0 : 0.35,
      left: { times: [0, SPLIT / 100, 1] },
      top: { times: [0, SPLIT / 100, 1] },
      opacity: { times: [0, 0.1, 0.9, 1] },
    },
  }),
}

const modeCard = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.6 + i * 0.12, ease },
  }),
}

const origin = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.4, ease } },
  hover: {
    scale: [1, 1.08, 1],
    transition: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' },
  },
}

export function EntryPointFigure() {
  return (
    <div className={`flex flex-col ${FIGURE}`}>
      <div className="flex justify-center">
        <motion.div
          variants={origin}
          className="bg-[var(--amw-accent-soft)] ring-[var(--amw-accent)]/40 text-[var(--amw-accent-ink)] amw-mono flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] ring-1"
        >
          you
        </motion.div>
      </div>

      <div className="relative h-12">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <motion.line
            x1="50%"
            y1="0"
            x2="50%"
            y2={`${SPLIT}%`}
            stroke="var(--amw-line-strong)"
            strokeWidth="1"
            variants={track}
            custom={0}
          />
          {MODES.map((mode, i) => (
            <motion.line
              key={mode.code}
              x1="50%"
              y1={`${SPLIT}%`}
              x2={mode.x}
              y2="100%"
              stroke="var(--amw-line-strong)"
              strokeWidth="1"
              variants={track}
              custom={i + 1}
            />
          ))}
        </svg>
        {MODES.map((mode) => (
          <motion.span
            key={`pulse-${mode.code}`}
            aria-hidden="true"
            variants={pulse}
            custom={mode.x}
            className="bg-[var(--amw-accent-ink)] absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          />
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3">
        {MODES.map((mode, i) => (
          <motion.div
            key={mode.code}
            variants={modeCard}
            custom={i}
            className="border-[var(--amw-line)] bg-[var(--amw-card-2)] group-hover:border-[var(--amw-accent)]/60 flex min-w-0 flex-col items-center justify-center gap-2.5 rounded-xl border p-3 text-center transition-colors duration-300"
          >
            <VendorMark slug={mode.slug} label={mode.label} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none text-zinc-800 dark:text-zinc-200">
                {mode.code}
              </p>
              <p className="mt-1.5 text-xs leading-none text-zinc-500 dark:text-zinc-400">
                {mode.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ---- fig.02 — layered systems ------------------------------------------- */
/* An isometric cross-section of the foundation: five layers, laid down
   bottom-up (Data first, Experience last), each with a legend row to the
   right carrying the vendor marks. The SVG cell is a fixed 120x192px so
   legend rows can be pinned to the same y as their slab. On hover a
   request packet travels down through the layers and the response comes
   back up, while each slab's top face flashes as the packet passes. */

const CX = 60
const HALF_W = 44
const HALF_D = 22
const THICK = 8
const LAYER_STEP = 30
const LAYER_TOP = 26

const LAYERS = [
  {
    name: 'Experience',
    marks: [{ slug: 'nextdotjs', label: 'Next.js' }],
  },
  {
    name: 'Edge',
    marks: [{ slug: 'vercel', label: 'Vercel' }],
  },
  {
    name: 'Services',
    marks: [
      { slug: 'supabase', label: 'Supabase' },
      { slug: 'stripe', label: 'Stripe' },
    ],
  },
  {
    name: 'Content',
    marks: [{ slug: 'payloadcms', label: 'Payload CMS' }],
  },
  {
    name: 'Data',
    marks: [{ slug: 'postgresql', label: 'PostgreSQL' }],
  },
]

const layerY = (i) => LAYER_TOP + i * LAYER_STEP

function topFace(cy) {
  return `M${CX} ${cy - HALF_D} L${CX + HALF_W} ${cy} L${CX} ${cy + HALF_D} L${
    CX - HALF_W
  } ${cy} Z`
}
function leftFace(cy) {
  return `M${CX - HALF_W} ${cy} L${CX} ${cy + HALF_D} L${CX} ${
    cy + HALF_D + THICK
  } L${CX - HALF_W} ${cy + THICK} Z`
}
function rightFace(cy) {
  return `M${CX} ${cy + HALF_D} L${CX + HALF_W} ${cy} L${CX + HALF_W} ${
    cy + THICK
  } L${CX} ${cy + HALF_D + THICK} Z`
}

const last = LAYERS.length - 1
const SPINE = `M${CX} ${layerY(0) - HALF_D - 6} L${CX} ${
  layerY(last) + HALF_D + THICK + 4
}`

/* Foundation first: the bottom layer lands before the ones above it. */
const slab = {
  hidden: { opacity: 0, y: -18 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.15 + (last - i) * 0.12, ease },
  }),
}

const flash = {
  hidden: { opacity: 0 },
  visible: { opacity: 0 },
  hover: (i) => ({
    opacity: [0, 0.45, 0],
    transition: {
      duration: 2.4,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.22,
      times: [0, 0.12, 0.3],
    },
  }),
}

const packet = {
  hidden: { opacity: 0, offsetDistance: '0%' },
  visible: { opacity: 0, offsetDistance: '0%' },
  hover: (dir) => ({
    opacity: [0, 1, 1, 0],
    offsetDistance: dir === 'down' ? ['0%', '100%'] : ['100%', '0%'],
    transition: {
      offsetDistance: {
        duration: 1.2,
        repeat: Infinity,
        repeatDelay: 1.2,
        ease: 'easeInOut',
        delay: dir === 'down' ? 0 : 1.2,
      },
      opacity: {
        duration: 1.2,
        repeat: Infinity,
        repeatDelay: 1.2,
        ease: 'linear',
        delay: dir === 'down' ? 0 : 1.2,
        times: [0, 0.1, 0.9, 1],
      },
    },
  }),
}

const legendRow = {
  hidden: { opacity: 0, x: 10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, delay: 0.35 + (last - i) * 0.12, ease },
  }),
}

export function ArchitectFigure() {
  return (
    <div className={`flex items-stretch gap-2 ${FIGURE}`}>
      <svg
        viewBox="0 0 120 192"
        width="120"
        height="192"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d={SPINE}
          stroke="var(--amw-line-strong)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Draw bottom-up so upper slabs overlap the faces below them. */}
        {[...LAYERS.keys()].reverse().map((i) => {
          const cy = layerY(i)
          const foundation = i === last
          return (
            <motion.g key={LAYERS[i].name} variants={slab} custom={i}>
              <path d={leftFace(cy)} fill="var(--amw-line)" />
              <path d={rightFace(cy)} fill="var(--amw-line-strong)" />
              <path
                d={topFace(cy)}
                fill={
                  foundation ? 'var(--amw-accent-soft)' : 'var(--amw-card-2)'
                }
                stroke={
                  foundation
                    ? 'var(--amw-accent-ink)'
                    : 'var(--amw-line-strong)'
                }
                strokeWidth="1"
              />
              <motion.path
                d={topFace(cy)}
                fill="var(--amw-accent)"
                variants={flash}
                custom={i}
              />
              <path
                d={`M${CX + HALF_W} ${cy} L120 ${cy}`}
                stroke="var(--amw-line-strong)"
                strokeWidth="1"
              />
            </motion.g>
          )
        })}

        <motion.circle
          r="3"
          fill="var(--amw-accent-ink)"
          variants={packet}
          custom="down"
          style={{ offsetPath: `path("${SPINE}")`, offsetRotate: '0deg' }}
        />
        <motion.circle
          r="3"
          fill="var(--amw-accent)"
          variants={packet}
          custom="up"
          style={{ offsetPath: `path("${SPINE}")`, offsetRotate: '0deg' }}
        />
      </svg>

      <div className="relative min-w-0 flex-1">
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.name}
            variants={legendRow}
            custom={i}
            className="absolute inset-x-0 flex h-7 items-center gap-2"
            style={{ top: layerY(i) - 14 }}
          >
            <span className="flex shrink-0 items-center gap-1">
              {layer.marks.map((mark) => (
                <VendorMark key={mark.label} {...mark} size="xs" />
              ))}
            </span>
            <p
              className={`min-w-0 truncate text-xs font-medium leading-none ${
                i === last
                  ? 'text-[var(--amw-accent-ink)]'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {layer.name}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ---- fig.03 — ship and scale ---------------------------------------------- */

/* 7x7 dot-matrix frames for the PaceUI DotFlow, authored as string art:
   '#' lights a dot, '.' leaves it dark. */
function glyph(rows) {
  return rows.flatMap((row, y) =>
    Array.from(row)
      .map((ch, x) => (ch === '#' ? y * 7 + x : -1))
      .filter((i) => i >= 0)
  )
}

const COMMIT = [
  glyph([
    '.......',
    '.......',
    '.......',
    '...#...',
    '.......',
    '.......',
    '.......',
  ]),
  glyph([
    '.......',
    '.......',
    '..###..',
    '..###..',
    '..###..',
    '.......',
    '.......',
  ]),
  glyph([
    '.......',
    '.#####.',
    '.#...#.',
    '.#.#.#.',
    '.#...#.',
    '.#####.',
    '.......',
  ]),
]

const BUILD = [1, 2, 3, 4, 5, 6, 7].map((n) =>
  glyph(
    Array.from({ length: 7 }, (_, y) => (y >= 7 - n ? '#######' : '.......'))
  )
)

const ARROW = ['...#...', '..###..', '.#####.', '...#...', '...#...']
const DEPLOY = [2, 1, 0].map((offset) =>
  glyph(Array.from({ length: 7 }, (_, y) => ARROW[y - offset] ?? '.......'))
)

const SCALE = [
  [1, 2, 1],
  [2, 3, 2],
  [3, 5, 3],
  [4, 6, 5],
].map((heights) =>
  glyph(
    Array.from({ length: 7 }, (_, y) =>
      ['.', heights[0], '.', heights[1], '.', heights[2], '.']
        .map((h) => (typeof h === 'number' && 7 - y <= h ? '#' : '.'))
        .join('')
    )
  )
)

const PIPELINE = [
  { title: 'commit pushed', frames: COMMIT, duration: 220, repeatCount: 2 },
  { title: 'build passing', frames: BUILD, duration: 110, repeatCount: 1 },
  {
    title: 'deployed on vercel',
    frames: DEPLOY,
    duration: 200,
    repeatCount: 2,
  },
  { title: 'scaling traffic', frames: SCALE, duration: 200, repeatCount: 2 },
]

const SPARK_POINTS = [4, 9, 7, 12, 11, 16, 15, 21, 20, 26]

const sparkLine = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 1, ease } },
  hover: {
    pathLength: [0, 1],
    opacity: 1,
    transition: { duration: 0.9, ease },
  },
}

const sparkFill = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, delay: 0.6 } },
}

const statCard = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.3, ease },
  },
}

export function ShipFigure({ active = false }) {
  const spark = useMemo(() => {
    const w = 128
    const h = 40
    const max = Math.max(...SPARK_POINTS)
    const pts = SPARK_POINTS.map((v, i) => [
      (i / (SPARK_POINTS.length - 1)) * w,
      h - (v / max) * (h - 2) - 1,
    ])
    const line = pts
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ')
    return { line, area: `${line} L${w} ${h} L0 ${h} Z`, w, h }
  }, [])

  return (
    <div className={`relative flex flex-col ${FIGURE}`}>
      {/* Pipeline endpoints sit in the panel's top-right corner, opposite
          the fig. kicker, so the readout below can run the full width. */}
      <div className="absolute right-4 top-2.5 flex items-center gap-1.5">
        <VendorMark slug="github" label="GitHub" size="xs" />
        <VendorMark slug="vercel" label="Vercel" size="xs" />
      </div>

      <DotFlow
        items={PIPELINE}
        isPlaying={active}
        columns={7}
        dotSize="size-1.5"
        className="mt-4 w-full"
      />

      <motion.div
        variants={statCard}
        className="border-[var(--amw-line)] bg-[var(--amw-card-2)] group-hover:border-[var(--amw-accent)]/60 mt-4 flex flex-1 items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors duration-300"
      >
        {/* The figure and its label keep their width; the sparkline is the
            part that gives way on a narrow card. It used to be the other way
            round, and at 320px "uptime" was squeezed into a 16px cell. */}
        <div className="shrink-0">
          <div className="amw-price flex items-baseline gap-0.5 text-2xl font-semibold leading-none text-zinc-900 dark:text-zinc-50">
            <RollingNumber
              key={active ? 'live' : 'idle'}
              targetNumber="99.98"
              height={28}
              duration={1.4}
            />
            <span className="text-sm">%</span>
          </div>
          <p className="amw-kicker mt-1.5 leading-none">uptime</p>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <svg
            viewBox={`0 0 ${spark.w} ${spark.h}`}
            width={spark.w}
            height={spark.h}
            fill="none"
            aria-hidden="true"
            className="block h-auto max-w-full"
          >
            <defs>
              <linearGradient id="amw-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--amw-accent)"
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor="var(--amw-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <motion.path
              d={spark.area}
              fill="url(#amw-spark-fill)"
              variants={sparkFill}
            />
            <motion.path
              d={spark.line}
              stroke="var(--amw-accent-ink)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              variants={sparkLine}
            />
          </svg>
          <p className="amw-kicker text-[var(--amw-accent-ink)] mt-0.5 leading-none">
            +38% traffic
          </p>
        </div>
      </motion.div>
    </div>
  )
}

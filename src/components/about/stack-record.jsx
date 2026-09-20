'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { RotateCcw } from 'lucide-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMediaQuery } from '@/hooks/use-client-value'
import logoCreem from '@/images/logos/creem.png'
import logoPolar from '@/images/logos/polar.png'
import logoMotion from '@/images/logos/motion.png'

/* Physics stack ported from the RBP portfolio template
   (github.com/DavidHDev/rbp-portfolio, components/about/stack.tsx):
   chips fall into a matter-js world and can be grabbed and thrown.
   The engine loads lazily, the rAF loop writes transforms straight to
   the DOM (no React state per frame), and reduced motion gets a static
   pill wall instead of the simulation. */

const CHIPS = [
  { label: 'Next.js', slug: 'nextdotjs', bg: '#1f1f1f', fg: '#ffffff' },
  { label: 'React', slug: 'react', bg: '#1FB6CB', fg: '#ffffff' },
  { label: 'JavaScript', slug: 'javascript', bg: '#F7DF1E', fg: '#0a0a0a' },
  { label: 'TypeScript', slug: 'typescript', bg: '#2F74C0', fg: '#ffffff' },
  { label: 'Figma', slug: 'figma', bg: '#1f1f1f', fg: '#ffffff' },
  { label: 'Node.js', slug: 'nodedotjs', bg: '#339933', fg: '#ffffff' },
  { label: 'Tailwind CSS', slug: 'tailwindcss', bg: '#2BBCF5', fg: '#ffffff' },
  { label: 'Supabase', slug: 'supabase', bg: '#3ECF8E', fg: '#0a0a0a' },
  { label: 'PostgreSQL', slug: 'postgresql', bg: '#336791', fg: '#ffffff' },
  { label: 'Payload CMS', slug: 'payloadcms', bg: '#1f1f1f', fg: '#ffffff' },
  { label: 'Vercel', slug: 'vercel', bg: '#0a0a0a', fg: '#ffffff' },
  { label: 'Stripe', slug: 'stripe', bg: '#635BFF', fg: '#ffffff' },
  { label: 'GSAP', slug: 'gsap', bg: '#0AE448', fg: '#0a0a0a' },
  { label: 'Motion', image: logoMotion, bg: '#0f0f0f', fg: '#ffffff' },
  { label: 'Cursor', slug: 'cursor', bg: '#111111', fg: '#ffffff' },
  { label: 'GitHub', slug: 'github', bg: '#181717', fg: '#ffffff' },
  /* Payment platforms; marks vendored from creem.io and polar.sh
     (not on Simple Icons). Motion's mark is vendored from motion.dev. */
  { label: 'Creem', image: logoCreem, bg: '#1f1f1f', fg: '#ffffff' },
  { label: 'Polar', image: logoPolar, bg: '#0062FF', fg: '#ffffff' },
]

const CHIP_RADIUS = 14
const ICON_RADIUS = 10
const WALL_PAD = 16

export function StackRecord() {
  const containerRef = useRef(null)
  const measureRef = useRef(null)
  const chipRefs = useRef([])
  const [resetKey, setResetKey] = useState(0)
  const reduce = useReducedMotion()
  /* Below md the simulation is not a flourish, it is a failure. Eighteen chips
     fall into roughly 343x210 on a phone: ten stack off the top edge, eight are
     never visible at all, and "PostgreSQL" clips to "greS". The reader's last
     impression of the technical credentials was a clipped pile. Drag-to-throw
     also steals the page scroll, because a thumb swipe that starts on a chip
     grabs the chip.

     The server assumes narrow, so the static wall is also what ships without
     JavaScript. `useMediaQuery` reads through useSyncExternalStore, so the
     hydrating render matches the server rather than flipping after mount. */
  const isNarrow = useMediaQuery('(max-width: 767px)', true)
  const showStatic = reduce || isNarrow

  useEffect(() => {
    if (showStatic) return
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    let cancelled = false
    let cleanup

    void (async () => {
      const Matter = await import('matter-js')
      if (cancelled) return

      const {
        Engine,
        Runner,
        World,
        Bodies,
        Body,
        Mouse,
        MouseConstraint,
        Events,
      } = Matter

      const measureChildren = Array.from(measure.children)
      const dims = measureChildren.map((el) => {
        const r = el.getBoundingClientRect()
        return { w: Math.max(80, r.width), h: Math.max(28, r.height) }
      })

      let width = container.clientWidth
      let height = container.clientHeight

      const engine = Engine.create()
      engine.gravity.y = 1
      const world = engine.world

      const wallThickness = 400
      const floor = Bodies.rectangle(
        width / 2,
        height - WALL_PAD + wallThickness / 2,
        width * 3,
        wallThickness,
        { isStatic: true }
      )
      const leftWall = Bodies.rectangle(
        WALL_PAD - wallThickness / 2,
        height / 2,
        wallThickness,
        height * 4,
        { isStatic: true }
      )
      const rightWall = Bodies.rectangle(
        width - WALL_PAD + wallThickness / 2,
        height / 2,
        wallThickness,
        height * 4,
        { isStatic: true }
      )
      World.add(world, [floor, leftWall, rightWall])

      const states = CHIPS.map((chip, i) => {
        const dim = dims[i] ?? { w: 120, h: 36 }
        const { w, h } = dim
        const halfW = w / 2
        const minX = WALL_PAD + halfW + 4
        const maxX = width - WALL_PAD - halfW - 4
        const x = minX + Math.random() * Math.max(1, maxX - minX)
        const y = -80 - i * 60 - Math.random() * 120
        const body = Bodies.rectangle(x, y, w, h, {
          chamfer: { radius: CHIP_RADIUS },
          restitution: 0.35,
          friction: 0.5,
          frictionAir: 0.025,
          density: 0.0018,
          angle: (Math.random() - 0.5) * 0.4,
        })
        World.add(world, body)
        return { chip, body, width: w, height: h }
      })

      const mouse = Mouse.create(container)

      /* matter's Mouse hijacks wheel events; unbind so the page scrolls. */
      const wheelTarget = mouse.element
      if (wheelTarget.mousewheel) {
        wheelTarget.removeEventListener('wheel', wheelTarget.mousewheel)
        wheelTarget.removeEventListener(
          'DOMMouseScroll',
          wheelTarget.mousewheel
        )
      }

      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: 0.2,
          damping: 0.2,
          render: { visible: false },
        },
      })
      World.add(world, mouseConstraint)

      Events.on(mouseConstraint, 'startdrag', () => {
        container.style.cursor = 'grabbing'
      })
      Events.on(mouseConstraint, 'enddrag', () => {
        container.style.cursor = 'grab'
      })

      const runner = Runner.create()
      Runner.run(runner, engine)

      let raf = 0
      const tick = () => {
        for (let i = 0; i < states.length; i++) {
          const s = states[i]
          const el = chipRefs.current[i]
          if (!s || !el) continue
          const { x, y } = s.body.position
          el.style.transform = `translate3d(${x - s.width / 2}px, ${
            y - s.height / 2
          }px, 0) rotate(${s.body.angle}rad)`
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      const onResize = () => {
        const newW = container.clientWidth
        const newH = container.clientHeight
        if (newW === width && newH === height) return
        Body.setPosition(floor, {
          x: newW / 2,
          y: newH - WALL_PAD + wallThickness / 2,
        })
        Body.setPosition(leftWall, {
          x: WALL_PAD - wallThickness / 2,
          y: newH / 2,
        })
        Body.setPosition(rightWall, {
          x: newW - WALL_PAD + wallThickness / 2,
          y: newH / 2,
        })
        width = newW
        height = newH
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(container)

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        Runner.stop(runner)
        World.clear(world, false)
        Engine.clear(engine)
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [resetKey, showStatic])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="amw-kicker">Stack</h3>

      {showStatic ? (
        <div className="border-[var(--amw-line)] bg-[color-mix(in_srgb,var(--amw-card-2)_70%,transparent)] rounded-2xl border p-3">
          {/* Every chip readable, in the same pill language as the "What I do"
              row directly above. Eighteen vendor brand colours next to each
              other is a logo soup, and the system budgets one accent. */}
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {CHIPS.map((chip) => (
              <li key={chip.label}>
                <StaticChip chip={chip} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="border-[var(--amw-line)] bg-[color-mix(in_srgb,var(--amw-card-2)_70%,transparent)] relative h-40 overflow-hidden rounded-2xl border sm:h-64">
          <button
            type="button"
            onClick={() => setResetKey((k) => k + 1)}
            aria-label="Reset stack"
            className="border-[var(--amw-line-strong)] bg-[var(--amw-card)] hover:text-[var(--amw-accent-ink)] absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border text-zinc-600 transition-colors dark:text-zinc-300"
          >
            <RotateCcw
              className="h-4 w-4"
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </button>

          <div
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 flex flex-wrap gap-2"
          >
            {CHIPS.map((chip) => (
              <ChipPill key={`m-${chip.label}`} chip={chip} />
            ))}
          </div>

          <div
            ref={containerRef}
            className="absolute inset-0 cursor-grab select-none"
            style={{ touchAction: 'none' }}
          >
            {CHIPS.map((chip, i) => (
              <div
                key={`${resetKey}-${chip.label}`}
                ref={(el) => {
                  chipRefs.current[i] = el
                }}
                className="pointer-events-none absolute left-0 top-0 will-change-transform"
                style={{ transform: 'translate3d(-9999px, -9999px, 0)' }}
              >
                <ChipPill chip={chip} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* The readable form. Same pill language as `SkillsRecord` directly above it:
   card surface, hairline, zinc label. The vendor mark stays as identification,
   on a neutral tile, so the row reads as a list of tools rather than a wall of
   competing brand colours. */
function StaticChip({ chip }) {
  return (
    <span className="border-[var(--amw-line)] bg-[var(--amw-card)] inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm text-zinc-700 dark:text-zinc-300">
      <span
        className="bg-[var(--amw-card-2)] border-[var(--amw-line)] inline-flex h-6 w-6 items-center justify-center rounded-full border"
        aria-hidden="true"
      >
        {chip.image ? (
          <Image
            src={chip.image}
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
            draggable={false}
            unoptimized
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://cdn.simpleicons.org/${chip.slug}`}
            alt=""
            width={14}
            height={14}
            loading="lazy"
            className="h-3.5 w-3.5"
            draggable={false}
          />
        )}
      </span>
      {chip.label}
    </span>
  )
}

function ChipPill({ chip }) {
  return (
    <div
      className="dark:ring-white/15 inline-flex items-center gap-2 p-1 pr-2 text-sm font-medium tracking-tight dark:ring-1 sm:text-[15px]"
      style={{
        backgroundColor: chip.bg,
        color: chip.fg,
        borderRadius: `${CHIP_RADIUS}px`,
      }}
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center bg-white/95"
        style={{ borderRadius: `${ICON_RADIUS}px` }}
        aria-hidden="true"
      >
        {chip.image ? (
          <Image
            src={chip.image}
            alt=""
            width={18}
            height={18}
            className="h-5 w-5 object-contain"
            draggable={false}
            unoptimized
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://cdn.simpleicons.org/${chip.slug}`}
            alt=""
            width={18}
            height={18}
            loading="lazy"
            className="h-5 w-5"
            draggable={false}
          />
        )}
      </span>
      <span>{chip.label}</span>
    </div>
  )
}

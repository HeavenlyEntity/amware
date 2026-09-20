'use client'

import { useReducedMotion } from '@/components/AccessibilityProvider'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import {
  chooseScene,
  DESCRIPTIONS,
  drawScene,
  phaseAt,
} from '@/lib/glyph-matrix/scenes'

const STORAGE_KEY = 'amware-masterpiece-scene-v1'
// One selection per document, including Strict Mode replays and route returns.
let visitScene
function getVisitScene() {
  if (visitScene) return visitScene
  let previous
  try {
    previous = sessionStorage.getItem(STORAGE_KEY)
  } catch {
    /* Storage can be disabled. */
  }
  visitScene = chooseScene(previous)
  try {
    sessionStorage.setItem(STORAGE_KEY, visitScene)
  } catch {
    /* Animation still works without persistence. */
  }
  return visitScene
}

export function MasterpieceInterlude() {
  const canvasRef = useRef(null)
  const sectionRef = useRef(null)
  const descriptionRef = useRef(null)
  const controllerRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scene = getVisitScene()
    section.dataset.scene = scene
    descriptionRef.current.textContent = DESCRIPTIONS[scene]
    let width = 0,
      height = 0,
      pitch = 6,
      columns = 0,
      rows = 0
    let backdrop,
      dark = false,
      visible = false,
      reduced = false,
      stopped = false
    let elapsed = 0,
      lastTime = null,
      frame = 0,
      lastPaint = -Infinity

    function paint() {
      if (!width || !height || !backdrop) return
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(backdrop, 0, 0, width, height)
      const phase = phaseAt(elapsed, reduced)
      section.dataset.phase = phase.stage
      if (phase.stage === 'standby') return
      const pixels = drawScene(scene, columns, rows, phase.time)
      const ox = (width - (columns - 1) * pitch) / 2
      const oy = (height - (rows - 1) * pitch) / 2
      ctx.fillStyle = dark ? '#fafafa' : '#18181b'
      for (const index of pixels) {
        const x = index % columns,
          y = Math.floor(index / columns)
        // Columns illuminate in sequence; small row offsets soften the sweep.
        const position = (x + (y % 4) * 0.35) / columns
        const entry = Math.min(
          1,
          Math.max(0, (phase.reveal * 1.15 - position) / 0.15)
        )
        const exit = phase.exit
          ? Math.min(
              1,
              Math.max(0, (position - phase.exit * 1.15 + 0.15) / 0.15)
            )
          : 1
        ctx.globalAlpha = entry * exit
        if (!ctx.globalAlpha) continue
        ctx.beginPath()
        ctx.arc(ox + x * pitch, oy + y * pitch, pitch * 0.28, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    function resize() {
      const box = section.getBoundingClientRect()
      width = box.width
      height = box.height
      if (!width || !height) return
      // At least 116 columns keep the longest thought bubble intact on phones.
      pitch = Math.min(6.5, width / 116, height / 72)
      columns = Math.floor(width / pitch)
      rows = Math.floor(height / pitch)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dark = document.documentElement.classList.contains('dark')
      backdrop = document.createElement('canvas')
      backdrop.width = canvas.width
      backdrop.height = canvas.height
      const bg = backdrop.getContext('2d')
      if (!bg) {
        backdrop = null
        return
      }
      bg.scale(dpr, dpr)
      bg.fillStyle = dark ? '#18181b' : '#ffffff'
      bg.fillRect(0, 0, width, height)
      bg.fillStyle = dark ? '#343436' : '#dedee0'
      bg.beginPath()
      const ox = (width - (columns - 1) * pitch) / 2,
        oy = (height - (rows - 1) * pitch) / 2
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < columns; x++) {
          const xx = ox + x * pitch,
            yy = oy + y * pitch
          bg.moveTo(xx + pitch * 0.23, yy)
          bg.arc(xx, yy, pitch * 0.23, 0, Math.PI * 2)
        }
      bg.fill()
      paint()
    }
    function tick(now) {
      frame = 0
      if (lastTime !== null) elapsed += Math.min(now - lastTime, 100)
      lastTime = now
      if (now - lastPaint >= 1000 / 24) {
        paint()
        lastPaint = now
      }
      frame = requestAnimationFrame(tick)
    }
    function sync() {
      cancelAnimationFrame(frame)
      frame = 0
      lastTime = null
      if (visible && !document.hidden && !stopped && !reduced)
        frame = requestAnimationFrame(tick)
      paint()
    }
    controllerRef.current = {
      update(nextPaused, nextReduced) {
        stopped = nextPaused
        reduced = nextReduced
        sync()
      },
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0 }
    )
    observer.observe(section)
    const sizes = new ResizeObserver(resize)
    sizes.observe(section)
    const theme = new MutationObserver(resize)
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    document.addEventListener('visibilitychange', sync)
    resize()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      sizes.disconnect()
      theme.disconnect()
      document.removeEventListener('visibilitychange', sync)
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    controllerRef.current?.update(paused, reduceMotion)
  }, [paused, reduceMotion])

  return (
    <div className="sm:px-8">
      <div className="mx-auto w-full max-w-7xl lg:px-8">
        <section
          ref={sectionRef}
          aria-label="A masterpiece takes effort"
          data-testid="masterpiece-interlude"
          className="relative isolate h-[340px] w-full overflow-hidden bg-white dark:bg-zinc-900 sm:h-[420px] lg:h-[460px]"
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
          />
          <p ref={descriptionRef} className="sr-only">
            A crowned creator brings a masterpiece to life.
          </p>
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={
                paused
                  ? 'Play masterpiece animation'
                  : 'Pause masterpiece animation'
              }
              aria-pressed={paused}
              className="hover:text-zinc-950 absolute bottom-2 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:text-white"
            >
              {paused ? (
                <Play size={16} aria-hidden="true" />
              ) : (
                <Pause size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

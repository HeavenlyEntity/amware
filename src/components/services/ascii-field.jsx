'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import {
  hasWebGL2,
  useDarkTheme,
  useDeskWebGL,
} from '@/components/founders/desk/use-desk-webgl'
import { useMediaQuery, useMounted } from '@/hooks/use-client-value'

/*
 * AsciiField: the services board's GradientASCII light (src/lib/fx).
 *
 * Two placements, one component:
 * - `hero`: the phone hero's live field (HeroMobile.dc.html), phones only
 *   (below 768px; the desktop hero has the work wall instead). The owner
 *   chose the live field over a still (F5), so it relaxes the desk gate for
 *   touch screens, at a device-pixel ratio capped at 1.5.
 * - `accent`: the quiet light behind the engagement cards, top right. Desk
 *   gate (wide screen, fine pointer), and only once it is near the viewport.
 *
 * Static first: the server and the hydrating render draw the CSS poster (an
 * accent glow, no glyphs), which is also all that reduced motion gets, the
 * site's pause toggle as well as the OS setting. The canvas is absolutely
 * positioned over the poster, so its arrival moves nothing. The module is
 * loaded on demand, it pauses itself off screen and in a hidden tab, and the
 * WebGL context is released on unmount.
 */

const RAMP_DARK = ['#064e48', '#0b756c', '#14bbac', '#3ce8ce', '#ccfbf1']
/* Light mode inverts the field and draws ink glyphs; the ramp runs the other
   way so the deep teal lands where the glyphs are densest, on white. */
const RAMP_LIGHT = ['#ccfbf1', '#3ce8ce', '#14bbac', '#0b756c', '#064e48']

const SHARED = {
  characters: ' ·:=+x*#%@',
  glyphOpacity: 0.85,
  gradientOpacity: 0.55,
  glow: 0.3,
  flicker: 0.15,
  softness: 0.6,
  flow: 0.6,
  speed: 0.6,
  grain: 0.06,
  mouseInteraction: true,
  clickEffect: 'wave',
}

export const ASCII_VARIANTS = {
  hero: {
    shape: 'rise',
    cellSize: 14,
    density: 0.7,
    scale: 1.2,
    scrambleRadius: 0.1,
    maxDpr: 1.5,
  },
  accent: {
    shape: 'eclipse',
    cellSize: 13,
    density: 0.72,
    scale: 1.15,
    scrambleRadius: 0.08,
    maxDpr: 2,
  },
}

const PHONE = '(max-width: 767px)'
const FALLBACK_MONO = '"JetBrains Mono", ui-monospace, monospace'

/* The atlas is drawn on a 2D canvas, which cannot read a CSS variable, so the
   site mono (next/font's --font-nav-code on <html>) is resolved to its
   family string first. */
function siteMono() {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-nav-code')
      .trim()
    return value ? `${value}, ui-monospace, monospace` : FALLBACK_MONO
  } catch {
    return FALLBACK_MONO
  }
}

function usePhoneGate() {
  const mounted = useMounted()
  const phone = useMediaQuery(PHONE, false)
  const reduced = useReducedMotion()
  return mounted && phone && !reduced && hasWebGL2()
}

export function AsciiField({ variant = 'accent', className = '' }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const fieldRef = useRef(null)
  const [live, setLive] = useState(false)
  const dark = useDarkTheme()
  const near = useInView(hostRef, { once: true, margin: '200px' })
  const deskGate = useDeskWebGL()
  const phoneGate = usePhoneGate()
  const allowed = variant === 'hero' ? phoneGate : deskGate && near

  const options = {
    ...SHARED,
    ...ASCII_VARIANTS[variant],
    colors: dark ? RAMP_DARK : RAMP_LIGHT,
    lightMode: !dark,
    reduced: false,
  }
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (!allowed) return undefined
    let cancelled = false
    import('@/lib/fx/gradient-ascii')
      .then(({ mount }) => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (cancelled || !host || !canvas) return
        const field = mount(host, canvas, {
          ...optionsRef.current,
          fontFamily: siteMono(),
        })
        fieldRef.current = field
        /* No context or no shaders: keep the poster rather than fade it out
           over a blank canvas. */
        if (!field.failed) setLive(true)
      })
      /* The chunk did not load: the poster stays, which is the fallback. */
      .catch(() => {})
    return () => {
      cancelled = true
      fieldRef.current?.destroy()
      fieldRef.current = null
      setLive(false)
    }
  }, [allowed])

  /* A theme flip re-points the ramp on the running field. */
  useEffect(() => {
    fieldRef.current?.set({ ...optionsRef.current, fontFamily: siteMono() })
  }, [dark])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-print="hide"
      data-field={live ? 'live' : 'poster'}
      className={`svc-ascii svc-ascii--${variant} ${className}`}
    >
      <div className="svc-ascii-poster" />
      {allowed ? <canvas ref={canvasRef} className="svc-ascii-canvas" /> : null}
    </div>
  )
}

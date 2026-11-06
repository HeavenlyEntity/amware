'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useInView } from 'motion/react'

import { useDeskWebGL } from '@/components/founders/desk/use-desk-webgl'
import '@/styles/founders-desk.css'

/*
 * GlassPanel: the glass hero panel the desk and review boards draw.
 *
 * Always a static glass box first: the accent glow over a fine grid on the
 * card surface, in both themes, with `children` (the corner tags) on top. That
 * poster is what the server renders, what print, phones, touch screens and
 * reduced motion keep, and what holds the panel's size, so the WebGL arriving
 * later shifts nothing.
 *
 * `lens` (optional) adds the React Bits FluidGlass lens: a WebGL2 glass object
 * refracting `lens.text`, following the pointer and reshaping on click. It is
 * loaded with `next/dynamic` (`ssr: false`) only where `useDeskWebGL` allows
 * it (≥900px, fine pointer, motion allowed, WebGL2 present), after the Layer
 * face has loaded so the first frame is not drawn in a fallback font. Until
 * then the poster shows the same text, statically. Every other key of `lens`
 * is passed to FluidGlass as is (see src/components/react-bits/fluid-glass).
 * The text colour follows the theme's ink unless `lens.textColor` is set.
 *
 * Props: { children, className, label, lens, lazy } where `label` names the
 * panel for assistive tech when it is decorative-plus-figure. Without `label`
 * the panel is decorative and hidden from assistive tech. `lazy` (default
 * false) holds the lens back until the panel is within 200px of the
 * viewport, for a panel far down a page that should not open a WebGL context
 * while the visitor is still reading the top of it.
 */

const FluidGlass = dynamic(
  () => import('@/components/react-bits/fluid-glass'),
  {
    ssr: false,
    loading: () => null,
  }
)

const LENS_FONT = 'Layer, sans-serif'

export function GlassPanel({
  children,
  className = '',
  label,
  lens,
  lazy = false,
}) {
  const ref = useRef(null)
  const webgl = useDeskWebGL()
  const near = useInView(ref, { once: true, margin: '200px' })
  const [fontReady, setFontReady] = useState(false)
  const wantsLens = Boolean(lens?.text) && webgl && (!lazy || near)

  useEffect(() => {
    if (!wantsLens || fontReady) return undefined
    let live = true
    const done = () => {
      if (live) setFontReady(true)
    }
    const fonts = document.fonts
    if (fonts?.load) fonts.load(`700 96px ${LENS_FONT}`).then(done, done)
    else done()
    return () => {
      live = false
    }
  }, [wantsLens, fontReady])

  const live = wantsLens && fontReady
  const { text, ...lensProps } = lens ?? {}

  return (
    <div
      ref={ref}
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-lens={live ? 'live' : 'poster'}
      className={`amw-glass ${className}`}
    >
      {text ? (
        <p className="amw-glass-poster" aria-hidden="true">
          {text}
        </p>
      ) : null}
      {live ? (
        <div className="amw-glass-lens" data-print="hide">
          <FluidGlass
            fontFamily={LENS_FONT}
            fontWeight={700}
            {...lensProps}
            text={text}
          />
        </div>
      ) : null}
      {children ? <div className="amw-glass-content">{children}</div> : null}
    </div>
  )
}

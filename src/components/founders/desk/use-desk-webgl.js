'use client'

import { useSyncExternalStore } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMediaQuery, useMounted } from '@/hooks/use-client-value'

/*
 * When the desk's WebGL (the GlyphOrb backdrop, the FluidGlass lens) may run.
 *
 * Only on a wide screen with a fine pointer, where it has room and something
 * to follow; never under reduced motion (the site toggle as well as the OS
 * setting); never before hydration, so the server HTML and the first client
 * render are both the static poster and nothing shifts; and only where WebGL2
 * really exists, so a refused context leaves the poster rather than a blank
 * box. Every caller renders a poster first and layers the canvas over it.
 */

const RICH = '(min-width: 900px) and (pointer: fine)'

let webgl2 = null
function hasWebGL2() {
  if (webgl2 !== null) return webgl2
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    webgl2 = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl2 = false
  }
  return webgl2
}

export function useDeskWebGL() {
  const mounted = useMounted()
  const rich = useMediaQuery(RICH, false)
  const reduced = useReducedMotion()
  return mounted && rich && !reduced && hasWebGL2()
}

/* The site toggles `.dark` on <html>; the canvases need to know which token
   set they are drawn over. */
const subscribeTheme = (notify) => {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}
const readDark = () => document.documentElement.classList.contains('dark')

export function useDarkTheme() {
  return useSyncExternalStore(subscribeTheme, readDark, () => false)
}

'use client'

import dynamic from 'next/dynamic'

import { DeskMotionSync } from '@/components/founders/desk/motion-flag'
import {
  useDarkTheme,
  useDeskWebGL,
} from '@/components/founders/desk/use-desk-webgl'
import '@/styles/founders-desk.css'

/*
 * DeskBackdrop: the GlyphOrb planet behind the top right of every desk page
 * (design: docs/design/2026-11-04-desk-dock/reference/desk-bg.js).
 *
 * A banded ASCII planet in the desk's teal, tucked into the top-right corner
 * behind everything. Its canvas is painted in the page surface colour and a
 * radial mask fades it out, so it reads as depth rather than a panel. It turns
 * slowly on its own and takes no pointer input.
 *
 * Static first: the server renders a soft CSS glow in the same place, which is
 * all that phones, touch screens, reduced motion and print get. The orb
 * (React Bits Pro GlyphOrb) loads with `next/dynamic` (`ssr: false`) only
 * where `useDeskWebGL` allows it, over that glow. Both themes: on the light
 * page it draws in ink rather than glow.
 *
 * It sits inside the site's centred content column (`max-w-7xl`, the same
 * gutters as the layout's surface), because the canvas is painted in that
 * surface's colour and must not spill onto the body background beside it.
 *
 * Each desk page mounts it as the FIRST child of a `relative isolate` page
 * root; it is absolutely positioned, `z-index:-1`, `pointer-events:none`,
 * `aria-hidden`, and hidden in print. No props.
 */

const GlyphOrb = dynamic(() => import('@/components/react-bits/glyph-orb'), {
  ssr: false,
  loading: () => null,
})

/* The surface each theme paints behind the page (`--amw-page`, storefront.css)
   and the two inks the planet is banded in. */
const THEMES = {
  dark: { background: '#18181b', colors: ['#0b756c', '#3ce8ce'] },
  light: { background: '#ffffff', colors: ['#5eead4', '#0b756c'] },
}

export function DeskBackdrop() {
  const webgl = useDeskWebGL()
  const dark = useDarkTheme()
  const theme = dark ? THEMES.dark : THEMES.light

  return (
    <div className="amw amw-deskbg-frame" aria-hidden="true" data-print="hide">
      <DeskMotionSync />
      <div className="amw-deskbg-column">
        <div className="amw-deskbg-surface">
          <div className="amw-deskbg">
            <div className="amw-deskbg-poster" />
            {webgl ? (
              <div className="amw-deskbg-canvas">
                <GlyphOrb
                  key={dark ? 'dark' : 'light'}
                  colors={theme.colors}
                  backgroundColor={theme.background}
                  mode={dark ? 'glow' : 'ink'}
                  glyphSize={9}
                  spacing={1.1}
                  size={1.15}
                  centerX={0.64}
                  centerY={0.4}
                  tilt={-20}
                  spin={0.6}
                  bands={9}
                  turbulence={1}
                  lightAngle={-60}
                  lightHeight={0.35}
                  rim={0.8}
                  atmosphere={0.7}
                  contrast={0.45}
                  glow={0.14}
                  intensity={0.85}
                  interactive={false}
                  draggable={false}
                  clickStorm={false}
                  hoverLight={false}
                  quality={0.75}
                  style={{ height: '100%', minHeight: 0 }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

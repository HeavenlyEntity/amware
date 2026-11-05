'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useDarkTheme } from '@/components/founders/desk/use-desk-webgl'
import { useMediaQuery, useMounted } from '@/hooks/use-client-value'

import coverGearz from '@/images/projects/gearz-mockup.webp'
import coverEdenKode from '@/images/projects/edenkode-cover.webp'
import coverCelestial from '@/images/projects/celestial-cover.png'
import coverKingdomKode from '@/images/projects/kingdomkode-cover.png'
import coverConventionSuite from '@/images/projects/conventionsuite-cover-v4.png'
import coverMipi from '@/images/photos/MiPi-mockup.webp'
import coverPortalGen from '@/images/projects/portalgen-cover.png'
import coverNeatsuite from '@/images/projects/neatsuite-cover.png'
import coverAuthjs from '@/images/projects/authjs-cover.png'
import coverChamoji from '@/images/projects/chamoji-cover.webp'
import coverWindstone from '@/images/projects/windstone-cover.png'
import coverFuriousFroth from '@/images/projects/furiousfroth-cover.png'
import coverVrsa from '@/images/projects/vrsa-cover.png'
import coverVbRemoteSat from '@/images/projects/vbremotesat-cover.png'
import coverGscPortal from '@/images/photos/gsc-portal.webp'
import coverBookingCalendar from '@/images/photos/booking-calendar.webp'
import coverConventionSuiteV3 from '@/images/projects/conventionsuite-cover-v3.png'
import coverCelestialSalon from '@/images/projects/celestial-salon-cover.png'
import coverGearzDashboard from '@/images/projects/gearz-io-dashboard.webp'
import coverMipiSite from '@/images/projects/mipi-cover.png'

/*
 * WorkWall: the services hero's backdrop on desktop, a tilted, drifting wall
 * of the project covers (React Bits GridMotion, as the board customised it).
 *
 * Covers: the /projects gallery's, in its order (most recent first), then the
 * event-services customer portals the board adds (the GSC portal, the booking
 * calendar, ConventionSuite) and a few second shots of the same projects. The
 * Exhibit House cover is left out: it is a drawn placeholder, not work.
 *
 * Static first: the server renders a CSS poster (a tilted grid of empty
 * tiles), which is all phones get; the phone hero has the ASCII field
 * instead. The wall itself is a lazy client chunk, fetched once the page has
 * gone idle so it never competes with the headline, and it fades in over the
 * poster. Under reduced motion (the site toggle as well as the OS setting) it
 * is laid out once and holds still. Decorative throughout: aria-hidden, and
 * every image has an empty alt.
 */

const GridMotion = dynamic(
  () => import('@/components/react-bits/grid-motion'),
  {
    ssr: false,
    loading: () => null,
  }
)

export const WALL_COVERS = [
  coverGearz,
  coverEdenKode,
  coverCelestial,
  coverKingdomKode,
  coverConventionSuite,
  coverMipi,
  coverPortalGen,
  coverNeatsuite,
  coverAuthjs,
  coverChamoji,
  coverWindstone,
  coverFuriousFroth,
  coverVrsa,
  coverVbRemoteSat,
  coverGscPortal,
  coverBookingCalendar,
  coverConventionSuiteV3,
  coverCelestialSalon,
  coverGearzDashboard,
  coverMipiSite,
]

/* The board's settings (Main.dc.html); the tile ground follows the theme. */
export const WALL_SETTINGS = {
  rows: 4,
  aspectRatio: 1.33,
  gap: 14,
  radius: 12,
  angle: -12,
  tilt: 14,
  speed: 16,
  direction: 'alternate',
  parallax: 0.45,
  spotlight: 0.5,
  dim: 0.5,
  grayscale: true,
  fade: 0.35,
  sizes: '320px',
}

const DESKTOP = '(min-width: 768px)'

/* Wait for the browser to be idle (at most a second), or 200ms where there
   is no requestIdleCallback. */
function useIdle(enabled) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!enabled || idle) return undefined
    const done = () => setIdle(true)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(done, { timeout: 1000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(done, 200)
    return () => window.clearTimeout(id)
  }, [enabled, idle])
  return idle
}

export function WorkWall({ className = '' }) {
  const mounted = useMounted()
  const desktop = useMediaQuery(DESKTOP, false)
  const reduced = useReducedMotion()
  const dark = useDarkTheme()
  const allowed = mounted && desktop
  const idle = useIdle(allowed)
  const [ready, setReady] = useState(false)
  const live = allowed && idle
  /* A wall that unmounts (the window narrowed past the breakpoint) starts
     again from opacity 0 when it comes back, so the poster returns too. */
  if (!live && ready) setReady(false)

  return (
    <div
      aria-hidden="true"
      data-print="hide"
      data-wall={live && ready ? 'live' : 'poster'}
      className={`svc-wall ${className}`}
    >
      <div className="svc-wall-poster" />
      {live ? (
        <GridMotion
          {...WALL_SETTINGS}
          items={WALL_COVERS}
          reduced={reduced}
          theme={dark ? 'dark' : 'light'}
          tileColor={dark ? '#141419' : '#f4f4f5'}
          className="svc-wall-grid"
          onReady={() => setReady(true)}
        />
      ) : null}
    </div>
  )
}

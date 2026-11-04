'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import {
  isBearerPath,
  isSignedOnboarding,
  redactAnalyticsEvent,
} from '@/lib/analytics/privatePaths'
import { WHOP_PIXEL } from '@/lib/analytics/whop-pixel'
import { WhopRouteEvents } from '@/components/analytics/WhopRouteEvents'

/* The third-party scripts, off every path `isBearerPath` names. The site
 * layout cannot see the path, so the choice is made here, and a route group
 * would mean moving the pages.
 *
 * Two components, because the pixel has to be first. `WhopPixel` goes in the
 * layout's <head>: next/script runs it in an effect, and React runs effects
 * in tree order, so <head> installs `window.whop` before the effect of any
 * component in <body>, such as TrackPurchase, tries to use it. next/script
 * rather than a plain <script> because a buyer who lands on a license page
 * and moves on has no pixel yet, and React does not run a <script> it adds
 * after the page has loaded. Its `id` keeps the snippet to one run, which
 * matters because the snippet's `page` event is outside its own guard. That
 * event also reports the page the pixel loaded on, and `WhopRouteEvents`
 * skips its first render, so the two never count one view twice.
 *
 * The signed onboarding link differs from Whop's return only in its query.
 * useSearchParams here would put every static page behind a client render, so
 * the pixel reads the address itself. That is safe to differ from the server,
 * which renders nothing for an afterInteractive inline script.
 */

function isPixelBarred(pathname) {
  if (isBearerPath(pathname)) return true
  return (
    typeof window !== 'undefined' &&
    isSignedOnboarding(pathname, window.location.search)
  )
}

export function WhopPixel() {
  const pathname = usePathname()
  if (isPixelBarred(pathname)) return null
  return (
    <Script
      id="whop-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: WHOP_PIXEL }}
    />
  )
}

export function SiteTelemetry() {
  const pathname = usePathname()
  if (isBearerPath(pathname)) return null
  return (
    <>
      <Analytics beforeSend={redactAnalyticsEvent} />
      {/* The pixel reports the first page view; this reports the client-side
          navigations that follow it. */}
      <WhopRouteEvents />
    </>
  )
}

import { siteOrigin } from '@/lib/site-origin'
import type { Metadata } from 'next'
import { Geist, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { SiteHeader } from '@/components/SiteHeader'
import { Footer } from '@/components/Footer'
import { StagewiseInit } from '@/components/StagewiseInit'
import { WHOP_PIXEL } from '@/lib/analytics/whop-pixel'
import { WhopRouteEvents } from '@/components/analytics/WhopRouteEvents'

import '@/styles/tailwind.css'
import '@/styles/global.css'
import '@/styles/globals.css'
import '@/styles/storefront.css'
import 'focus-visible'
import '@/styles/accessibility.css'
import { AccessibilityProvider } from '@/components/AccessibilityProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const navCode = JetBrains_Mono({
  subsets: ['latin'],
  /* 700 is the creed's acronym weight; without it the browser fakes the
     bold and AMWARE stops reading against the 500 body letters. */
  weight: ['500', '600', '700'],
  variable: '--font-nav-code',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const siteUrl = siteOrigin

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: 'Alec Mingione', template: '%s - Alec Mingione' },
  ...(siteUrl && {
    alternates: {
      types: {
        'application/rss+xml': `${siteUrl}/rss/feed.xml`,
        'application/feed+json': `${siteUrl}/rss/feed.json`,
      },
    },
  }),
  other: { 'impact-site-verification': 'f77f8902-5007-4ccb-8dc0-d58a1ceb6915' },
}

// Pre-paint dark-mode script (ported verbatim from the old _document.jsx).
const modeScript = `
  let darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  updateMode()
  darkModeMediaQuery.addEventListener('change', updateModeWithoutTransitions)
  window.addEventListener('storage', updateModeWithoutTransitions)
  function updateMode() {
    let isSystemDarkMode = darkModeMediaQuery.matches
    let isDarkMode = window.localStorage.isDarkMode === 'true' || (!('isDarkMode' in window.localStorage) && isSystemDarkMode)
    if (isDarkMode) { document.documentElement.classList.add('dark') } else { document.documentElement.classList.remove('dark') }
    if (isDarkMode === isSystemDarkMode) { delete window.localStorage.isDarkMode }
  }
  function disableTransitionsTemporarily() {
    document.documentElement.classList.add('[&_*]:transition-none!')
    window.setTimeout(() => { document.documentElement.classList.remove('[&_*]:transition-none!') }, 0)
  }
  function updateModeWithoutTransitions() { disableTransitionsTemporarily(); updateMode() }
`

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${navCode.variable} ${geist.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
        {/* Whop Pixel. Whop's instruction is "inside the <head> of every page
            in your funnel", which this layout is: every marketing, catalogue,
            pricing and checkout page renders through it. It sits after the
            dark-mode script because that one has to run before first paint or
            the page flashes, and an ads pixel has no such claim on the
            critical path. */}
        <script dangerouslySetInnerHTML={{ __html: WHOP_PIXEL }} />
      </head>
      <body className="flex h-full flex-col bg-zinc-50 font-sans dark:bg-black">
        <div
          aria-hidden="true"
          className="fixed inset-0 flex justify-center sm:px-8"
        >
          <div className="flex w-full max-w-7xl lg:px-8">
            <div className="w-full bg-white ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-300/20" />
          </div>
        </div>
        <AccessibilityProvider>
          <div className="relative flex w-full flex-col">
            <a className="skip-link" href="#main-content">
              Skip to main content
            </a>
            <SiteHeader />
            <div id="site-content">
              <main id="main-content" tabIndex={-1} className="flex-auto">
                {children}
              </main>
              <Footer />
            </div>
          </div>
        </AccessibilityProvider>
        <Analytics />
        <SpeedInsights />
        <StagewiseInit />
        {/* The head snippet reports the first page view; this reports the
            client-side navigations that follow it. */}
        <WhopRouteEvents />
      </body>
    </html>
  )
}

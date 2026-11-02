import { readFileSync } from 'node:fs'
import path from 'node:path'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

let pathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

/* jsdom does not run scripts, so the stand-ins do what the real ones do where
   it matters here: next/script runs its snippet in an effect. */
const scripts = vi.fn()
let track
vi.mock('next/script', () => ({
  default: function Script(props) {
    useEffect(() => {
      scripts(props)
      window.whop = { track }
    }, [props])
    return null
  },
}))
const analytics = vi.fn()
vi.mock('@vercel/analytics/next', () => ({
  Analytics: (props) => {
    analytics(props)
    return null
  },
}))

import { SiteTelemetry, WhopPixel } from '../SiteTelemetry'
import { TrackPurchase } from '../TrackPurchase'
import { whopTrack, WHOP_EVENT } from '@/lib/analytics/whop'
import { redactAnalyticsEvent } from '@/lib/analytics/privatePaths'
import { WHOP_PIXEL } from '@/lib/analytics/whop-pixel'

const BEARER_PATHS = [
  '/access/seats/signed.token',
  '/access/signed.token',
  '/access/resend',
]

beforeEach(() => {
  vi.clearAllMocks()
  track = vi.fn()
  pathname = '/'
})

afterEach(() => {
  delete window.whop
  window.history.pushState({}, '', '/')
})

describe('the pixel', () => {
  it('runs the published snippet, unchanged, under one id', () => {
    render(<WhopPixel />)
    expect(scripts).toHaveBeenCalledTimes(1)
    expect(scripts.mock.calls[0][0]).toMatchObject({
      id: 'whop-pixel',
      dangerouslySetInnerHTML: { __html: WHOP_PIXEL },
    })
  })

  it.each(BEARER_PATHS)('stays off %s', (path) => {
    pathname = path
    render(<WhopPixel />)
    expect(scripts).not.toHaveBeenCalled()
    expect(window.whop).toBeUndefined()
  })

  it.each([
    '/checkout/onboarding?r=req_1&s=sig_1',
    '/checkout/onboarding?r=req_1',
    '/checkout/onboarding?s=sig_1',
  ])('stays off the signed link %s', (address) => {
    pathname = '/checkout/onboarding'
    window.history.pushState({}, '', address)
    render(<WhopPixel />)
    expect(scripts).not.toHaveBeenCalled()
    expect(window.whop).toBeUndefined()
  })

  it.each([
    '/checkout/onboarding?ref=abc',
    '/checkout/onboarding?payment_id=pay_1',
    '/checkout/onboarding',
  ])('stays on the Whop return %s', (address) => {
    pathname = '/checkout/onboarding'
    window.history.pushState({}, '', address)
    render(<WhopPixel />)
    expect(scripts).toHaveBeenCalledTimes(1)
  })

  /* Next updates the address after it renders the new route, so the pixel has
     to go by the new path, not a query left over from the signed link. */
  it('mounts on the next page even while the signed address lingers', () => {
    pathname = '/checkout/onboarding'
    window.history.pushState({}, '', '/checkout/onboarding?r=req_1&s=sig_1')
    const { rerender } = render(<WhopPixel />)
    expect(scripts).not.toHaveBeenCalled()

    pathname = '/contact'
    rerender(<WhopPixel />)
    expect(scripts).toHaveBeenCalledTimes(1)
  })

  it('is there before a page component fires its purchase', () => {
    pathname = '/checkout/success'
    render(
      <>
        <WhopPixel />
        <TrackPurchase eventId="req_1" value={499} />
      </>
    )
    expect(track).toHaveBeenCalledWith(
      'purchase',
      expect.objectContaining({ event_id: 'req_1', value: 499 })
    )
  })
})

describe('Analytics and the route events', () => {
  it('mounts Analytics with the redactor on an ordinary page', () => {
    render(<SiteTelemetry />)
    expect(analytics).toHaveBeenCalledTimes(1)
    expect(analytics.mock.calls[0][0].beforeSend).toBe(redactAnalyticsEvent)
  })

  it.each(BEARER_PATHS)('stays off %s', (path) => {
    pathname = path
    render(<SiteTelemetry />)
    expect(analytics).not.toHaveBeenCalled()
  })

  it('reports no route change into a bearer path', () => {
    window.whop = { track }
    const { rerender } = render(<SiteTelemetry />)
    pathname = '/access/seats/signed.token'
    rerender(<SiteTelemetry />)
    expect(track).not.toHaveBeenCalled()
  })

  it('reports a route change on the way back out once', () => {
    pathname = '/access/seats/signed.token'
    const { rerender } = render(
      <>
        <WhopPixel />
        <SiteTelemetry />
      </>
    )
    pathname = '/contact'
    rerender(
      <>
        <WhopPixel />
        <SiteTelemetry />
      </>
    )
    // The snippet's own `page` covers this view; the route events add none.
    expect(scripts).toHaveBeenCalledTimes(1)
    expect(track).not.toHaveBeenCalled()
  })
})

describe('where the pixel is not loaded', () => {
  it('whopTrack and TrackPurchase do nothing, and do not throw', () => {
    expect(whopTrack(WHOP_EVENT.beginCheckout, { value: 1 })).toBe(false)
    expect(() =>
      render(<TrackPurchase eventId="req_1" value={499} />)
    ).not.toThrow()
  })

  it('whopTrack refuses on a bearer path even with a pixel in memory', () => {
    window.whop = { track }
    window.history.pushState({}, '', '/access/seats/signed.token')

    expect(whopTrack(WHOP_EVENT.beginCheckout, { value: 1 })).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('whopTrack refuses on a signed link even with a pixel in memory', () => {
    window.whop = { track }
    window.history.pushState({}, '', '/checkout/onboarding?r=req_1&s=sig_1')

    expect(whopTrack(WHOP_EVENT.page)).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('whopTrack still fires on a Whop return to the same page', () => {
    window.whop = { track }
    window.history.pushState({}, '', '/checkout/onboarding?ref=abc')

    expect(whopTrack(WHOP_EVENT.page)).toBe(true)
    expect(track).toHaveBeenCalledTimes(1)
  })
})

describe('the site layout', () => {
  const layout = readFileSync(
    path.resolve(process.cwd(), 'src/app/(site)/layout.tsx'),
    'utf8'
  )

  it('renders the pixel in <head>, ahead of every page', () => {
    const pixel = layout.indexOf('<WhopPixel />')
    expect(pixel).toBeGreaterThan(layout.indexOf('<head>'))
    expect(pixel).toBeLessThan(layout.indexOf('</head>'))
  })

  it('reaches the scripts only through the gate', () => {
    expect(layout).toContain('<SiteTelemetry />')
    expect(layout).not.toContain('<Analytics')
    expect(layout).not.toContain('<WhopRouteEvents')
    expect(layout).not.toContain('WHOP_PIXEL')
  })
})

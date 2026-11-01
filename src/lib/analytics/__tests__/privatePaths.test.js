import { describe, expect, it } from 'vitest'

import { isBearerPath, redactAnalyticsEvent } from '../privatePaths'

const TOKEN = 'eyJhbGciOi.signed.token'

describe('isBearerPath', () => {
  it.each([
    `/access/seats/${TOKEN}`,
    `/access/${TOKEN}`,
    '/access/resend',
    '/access',
    '/access/',
  ])('keeps third parties off %s', (path) => {
    expect(isBearerPath(path)).toBe(true)
  })

  it.each([
    '/',
    '/accessibility',
    '/products/access',
    '/checkout/onboarding',
    '/pricing',
    '',
    null,
    undefined,
  ])('leaves %s alone', (path) => {
    expect(isBearerPath(path)).toBe(false)
  })
})

describe('redactAnalyticsEvent', () => {
  const site = 'https://www.amware.dev'
  const send = (url) => redactAnalyticsEvent({ type: 'pageview', url })

  it('drops r and s from the onboarding address', () => {
    expect(send(`${site}/checkout/onboarding?r=req_1&s=sig_1`)).toEqual({
      type: 'pageview',
      url: `${site}/checkout/onboarding`,
    })
  })

  it('keeps anything else on the onboarding address', () => {
    expect(send(`${site}/checkout/onboarding?r=req_1&s=sig_1&utm=x`).url).toBe(
      `${site}/checkout/onboarding?utm=x`
    )
  })

  it('redacts a relative address too', () => {
    expect(send('/checkout/onboarding?r=req_1&s=sig_1').url).toBe(
      '/checkout/onboarding'
    )
  })

  it('sends nothing at all from a bearer path', () => {
    expect(send(`${site}/access/seats/${TOKEN}`)).toBeNull()
    expect(send(`${site}/access/${TOKEN}`)).toBeNull()
  })

  it('leaves every other page as it is, query included', () => {
    const event = { type: 'event', url: `${site}/blog?r=1&s=2` }
    expect(redactAnalyticsEvent(event)).toBe(event)
  })

  it('drops an event whose address cannot be read', () => {
    expect(
      redactAnalyticsEvent({ type: 'pageview', url: 'http://' })
    ).toBeNull()
  })
})

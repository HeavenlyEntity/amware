import { pathToRegexp } from 'next/dist/compiled/path-to-regexp'
import { describe, expect, it } from 'vitest'

import nextConfig from '../../../../next.config.mjs'

/* Reads the real config, wrappers included, and matches paths the way Next
   does, so a rule that stops matching fails here rather than in production. */
async function referrerPolicyFor(pathname) {
  const rules = await nextConfig.headers()
  const values = rules
    .filter((rule) => pathToRegexp(rule.source).test(pathname))
    .flatMap((rule) => rule.headers)
    .filter((header) => header.key === 'Referrer-Policy')
    .map((header) => header.value)
  return values.at(-1)
}

describe('Referrer-Policy on bearer pages', () => {
  it.each([
    '/access/seats/tok.en',
    '/access/tok.en',
    '/access/resend',
    '/access',
    '/checkout/onboarding',
  ])('keeps the address of %s from the next page', async (pathname) => {
    expect(await referrerPolicyFor(pathname)).toBe('strict-origin')
  })

  it('leaves ordinary pages on the browser default', async () => {
    expect(await referrerPolicyFor('/contact')).toBeUndefined()
    expect(await referrerPolicyFor('/products/warekit')).toBeUndefined()
  })

  /* no-referrer turns a form POST's Origin into "null", and Next aborts a
     server action that arrives that way, as a form submitted before hydration
     does. */
  it('never uses a policy that blanks the Origin of a form POST', async () => {
    const rules = await nextConfig.headers()
    const values = rules
      .flatMap((rule) => rule.headers)
      .filter((header) => header.key === 'Referrer-Policy')
      .map((header) => header.value)
    expect(values).not.toContain('no-referrer')
  })
})

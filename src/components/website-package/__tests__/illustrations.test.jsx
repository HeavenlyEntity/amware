import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DesigningSkeleton } from '../designing'
import { Microinteractions } from '../microinteractions'
import { Copywriting } from '../copywriting'
import { Consultation } from '../consultation'

/* The four pictures on the website-build cards. They are decoration: the
   card title and description carry the meaning, so screen readers skip
   them and nothing inside takes keyboard focus. None of the template's
   brand, personas or borrowed claims survive the port. */

const TABBABLE =
  'a[href], button:not([tabindex="-1"]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

describe.each([
  ['DesigningSkeleton', DesigningSkeleton],
  ['Microinteractions', Microinteractions],
  ['Copywriting', Copywriting],
  ['Consultation', Consultation],
])('%s', (_, Illustration) => {
  it('is hidden from screen readers and out of the tab order', () => {
    const { container } = render(<Illustration />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll(TABBABLE)).toHaveLength(0)
  })

  it("carries none of the template's brand or personas", () => {
    const { container } = render(<Illustration />)
    expect(container.textContent).not.toMatch(
      /Mainline|\bAva\b|voice agents|free trial/i
    )
  })
})

it('puts Alec, not a stock face, on the strategy call', () => {
  const { container } = render(<Consultation />)
  const srcs = [...container.querySelectorAll('img')].map((img) =>
    img.getAttribute('src')
  )
  expect(srcs.some((s) => /at-the-desk/.test(s))).toBe(true)
  expect(srcs.some((s) => /webcam-person/.test(s))).toBe(false)
})

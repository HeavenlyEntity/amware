import { describe, expect, it } from 'vitest'
import {
  servicesTestimonials,
  showPlaceholders,
} from '../services-testimonials.js'

describe('showPlaceholders', () => {
  it.each([
    [{ nodeEnv: 'development' }, true],
    [{ nodeEnv: 'production', vercelEnv: 'preview' }, true],
    [{ nodeEnv: 'production', vercelEnv: 'production' }, false],
    [{ nodeEnv: 'production' }, false],
    [{ nodeEnv: 'test' }, false],
    [{}, false],
    [undefined, false],
  ])('%o → %s', (env, expected) => {
    expect(showPlaceholders(env)).toBe(expected)
  })
})

describe('servicesTestimonials in production', () => {
  const t = servicesTestimonials({
    nodeEnv: 'production',
    vercelEnv: 'production',
  })
  const all = [t.featured, ...Object.values(t.supporting), ...t.wall].filter(
    Boolean
  )

  it('shows only real people, with no stock photos', () => {
    expect(all.some((x) => x.placeholder)).toBe(false)
    expect(all.every((x) => x.image === null)).toBe(true)
  })

  it("features Mark's website-build quote, in full, with no partner pill", () => {
    expect(t.featured.name).toBe('Mark Schilling')
    expect(t.featured.quote).toMatch(/^I came in with a clear vision/)
    expect(t.featured.quote).toMatch(/not a website\.$/)
    expect(t.featured.partner).toBeNull()
  })

  it("keeps Dewayne's employment reference last", () => {
    expect(t.supporting.topLeft.name).toBe('Grace L.')
    expect(t.supporting.bottomLeft.name).toBe('Mike Pryke')
    expect(t.supporting.topRight).toBeNull()
    expect(t.supporting.bottomRight.name).toBe('Dewayne K.')
    expect(t.supporting.bottomRight.designation).toMatch(/Former supervisor/)
  })

  it('leaves the wall empty until there are more than four', () => {
    expect(t.wall).toEqual([])
  })
})

describe('servicesTestimonials on a preview', () => {
  const t = servicesTestimonials({
    nodeEnv: 'production',
    vercelEnv: 'preview',
  })

  it("uses the template's placeholder bento", () => {
    expect(t.featured.id).toBe(6)
    expect(t.featured.partner.name).toBe('Orbit Inference')
    expect(
      ['topLeft', 'bottomLeft', 'topRight', 'bottomRight'].map(
        (k) => t.supporting[k].id
      )
    ).toEqual([1, 8, 0, 5])
  })

  it('puts every other placeholder on the wall', () => {
    expect(t.wall.map((x) => x.id)).toEqual([2, 4, 7, 9])
  })
})

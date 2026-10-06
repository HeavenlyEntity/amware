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

  it('fills every bento slot, so a renamed person cannot drop out of it', () => {
    expect(t.featured).not.toBeNull()
    expect(Object.values(t.supporting).every(Boolean)).toBe(true)
  })

  it("features Mark's LinkedIn recommendation, with no partner pill", () => {
    expect(t.featured.name).toBe('Mark Schilling')
    expect(t.featured.quote).toMatch(/^From the very first conversation/)
    expect(t.featured.quote).toMatch(/nothing short of transformative\.$/)
    expect(t.featured.partner).toBeNull()
  })

  it('fills the rest of the bento with clients', () => {
    expect(t.supporting.topLeft.name).toBe('Grace L.')
    expect(t.supporting.bottomLeft.name).toBe('Mike Pryke')
    expect(t.supporting.topRight.name).toBe('Brian Meece')
    expect(t.supporting.bottomRight.name).toBe('John Boese')
  })

  it('puts the employment references on the wall, Dewayne last', () => {
    expect(t.wall.map((x) => x.name)).toEqual(['Rebecca Sunda', 'Dewayne K.'])
    expect(t.wall[0].designation).toMatch(/^Former manager/)
    expect(t.wall[1].designation).toMatch(/^Former supervisor/)
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

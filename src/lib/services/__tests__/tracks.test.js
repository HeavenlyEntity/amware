import { describe, expect, it } from 'vitest'
import { SERVICE_TRACKS, groupServices, trackFromHash } from '../tracks.js'

describe('groupServices', () => {
  it('splits services by category and keeps their order', () => {
    const { consulting, technical } = groupServices([
      { slug: 'advisor', category: 'consulting' },
      { slug: 'site', category: 'technical' },
      { slug: 'cto', category: 'consulting' },
    ])
    expect(consulting.map((d) => d.slug)).toEqual(['advisor', 'cto'])
    expect(technical.map((d) => d.slug)).toEqual(['site'])
  })

  it('treats a missing or unknown category as consulting', () => {
    const { consulting, technical } = groupServices([
      { slug: 'a' },
      { slug: 'b', category: 'mystery' },
    ])
    expect(consulting.map((d) => d.slug)).toEqual(['a', 'b'])
    expect(technical).toEqual([])
  })

  it('copes with no services', () => {
    expect(groupServices()).toEqual({ consulting: [], technical: [] })
  })
})

describe('tracks', () => {
  it('labels the stored values for the tabs', () => {
    expect(SERVICE_TRACKS.map((t) => [t.id, t.label, t.hash])).toEqual([
      ['consulting', 'Consulting', 'consulting'],
      ['technical', 'Build & support', 'build-support'],
    ])
  })

  it('reads a track from the URL hash', () => {
    expect(trackFromHash('#build-support')).toBe('technical')
    expect(trackFromHash('consulting')).toBe('consulting')
    expect(trackFromHash('#nope')).toBeNull()
    expect(trackFromHash('')).toBeNull()
  })
})

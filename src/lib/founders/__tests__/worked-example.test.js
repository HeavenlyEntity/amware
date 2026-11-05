import { describe, expect, it } from 'vitest'

globalThis.window = globalThis.window ?? {}

const { EXAMPLE } = await import('../equity/benchmarks.js')
const { INITIAL_KEYS } = await import('../offer-store.js')
const { exampleHref, examplePatchFor, exampleStorePatch } = await import(
  '../worked-example.js'
)

describe('the worked example', () => {
  it('fills only keys the shared store owns', () => {
    const patch = exampleStorePatch()
    for (const key of Object.keys(patch)) {
      expect(INITIAL_KEYS).toContain(key)
    }
    /* The equity wizard's own fields stay out of the store. */
    expect(patch).not.toHaveProperty('founders')
    expect(patch).not.toHaveProperty('path')
    expect(patch.offeredEquityPct).toBe(EXAMPLE.offeredEquityPct)
    expect(patch.workAnswered).toBe(true)
  })

  it('hands out copies, so editing the example cannot edit EXAMPLE', () => {
    const patch = exampleStorePatch()
    expect(patch.responsibilities).toEqual(EXAMPLE.responsibilities)
    expect(patch.responsibilities).not.toBe(EXAMPLE.responsibilities)
  })

  it('narrows to any key set', () => {
    expect(examplePatchFor(['founders', 'marketSalary'])).toEqual({
      founders: EXAMPLE.founders,
    })
  })

  it('links with ?example', () => {
    expect(exampleHref('/founders/equity')).toBe('/founders/equity?example')
  })
})

describe('the example replaces, never merges', () => {
  it('resets every store key the example does not set', () => {
    const patch = exampleStorePatch()
    expect(Object.keys(patch).sort()).toEqual([...INITIAL_KEYS].sort())
    expect(patch.askedAt).toBeNull()
  })
})

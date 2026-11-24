import { describe, expect, it } from 'vitest'

import { DIAGNOSTIC } from '../../../content/site/codebase-diagnostic'

const text = JSON.stringify(DIAGNOSTIC)

describe('DIAGNOSTIC copy', () => {
  it('names no price, no length and no credit', () => {
    expect(text).not.toMatch(/\$\s?\d/)
    expect(text).not.toMatch(/one week|counts toward|credited/i)
  })
  it('says the one deposit rule that is decided', () => {
    expect(DIAGNOSTIC.promise.copy).toMatch(/can’t help/)
  })
  it('has four steps, eight review items and three report specs', () => {
    expect(DIAGNOSTIC.start.steps).toHaveLength(4)
    expect(DIAGNOSTIC.review.items).toHaveLength(8)
    expect(DIAGNOSTIC.report.specs.map((s) => s.term)).toEqual([
      'access',
      'deposit',
      'report',
    ])
  })
  it('labels the sample report as an example', () => {
    expect(DIAGNOSTIC.sample.caption).toMatch(/not from a real client/i)
  })
  it('uses curly apostrophes only', () => {
    expect(text).not.toMatch(/[a-z]'[a-z]/i)
  })
})

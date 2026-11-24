import { describe, expect, it } from 'vitest'
import { DIAGNOSTIC_SLUG, depositTerms } from '../deposit-terms'

describe('depositTerms', () => {
  it('keeps the retainer wording for every other service', () => {
    for (const slug of ['fractional-cto', '', null, undefined]) {
      const terms = depositTerms(slug)
      expect(terms.sheetTitle).toBe('Reserve your start')
      expect(terms.sheetLine('$1,500', 'Fractional CTO')).toBe(
        '$1,500 deposit for Fractional CTO, credited in full against your first month.'
      )
      expect(terms.emailLine).toMatch(/first month/)
    }
  })

  it('never mentions a first month or a credit for the Diagnostic', () => {
    const terms = depositTerms(DIAGNOSTIC_SLUG)
    const all = [
      terms.sheetTitle,
      terms.sheetLine('$1,500', 'Codebase Diagnostic'),
      terms.reservedTitle,
      terms.reservedWithCall,
      terms.reservedWithoutCall,
      terms.emailLine,
    ].join(' ')
    expect(all).not.toMatch(/first month|credited|counts toward/i)
    expect(all).toMatch(/can’t help/)
    expect(terms.sheetLine('$1,500', 'Codebase Diagnostic')).toBe(
      '$1,500 deposit for the Codebase Diagnostic. Fully refunded if I can’t help.'
    )
  })
})

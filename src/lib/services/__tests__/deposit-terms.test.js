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

/* Where the return page sends a buyer whose payment did not finish, and
   where "back" goes once it has. /services leaves the Diagnostic out on
   purpose, so its buyer must be sent to its own pages instead. retryLine
   finishes "try again …" in both of the page's sentences. */
describe('depositTerms: return-page links', () => {
  it('keeps today’s retainer links and wording, character for character', () => {
    for (const slug of ['fractional-cto', '', null, undefined, 'evil']) {
      const terms = depositTerms(slug)
      expect(terms.retryHref).toBe('/services')
      expect(terms.retryLine).toBe('from the engagement you chose')
      expect(terms.backHref).toBe('/services')
      expect(terms.backLabel).toBe('Back to engagements')
    }
  })

  it('sends a Diagnostic buyer back to the Diagnostic', () => {
    const terms = depositTerms(DIAGNOSTIC_SLUG)
    expect(terms.retryHref).toBe('/services/codebase-diagnostic/reserve')
    expect(terms.retryLine).toBe('from the link I sent you')
    expect(terms.backHref).toBe('/services/codebase-diagnostic')
    expect(terms.backLabel).toBe('Back to the Diagnostic')
  })
})

describe('depositTerms: receipt email fragments', () => {
  it('keeps the retainer’s engagement wording', () => {
    const terms = depositTerms('fractional-cto')
    expect(terms.emailNoun).toBe(' engagement')
    expect(terms.emailClosing).toBe('set the engagement up')
  })

  it('names no engagement for the Diagnostic', () => {
    const terms = depositTerms(DIAGNOSTIC_SLUG)
    expect(terms.emailNoun).toBe('')
    expect(terms.emailClosing).toBe('agree the scope')
  })
})

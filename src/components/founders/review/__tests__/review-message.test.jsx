import { describe, expect, it } from 'vitest'

import { EXAMPLE } from '@/lib/founders/equity/benchmarks'
import { briefForContact } from '@/lib/founders/handoff'
import { computeRead } from '@/lib/founders/equity/engine'
import { exampleStorePatch } from '@/lib/founders/worked-example'
import { ENGINE_KEYS } from '@/lib/founders/offer-store'
import {
  MANUAL_TEMPLATE,
  buildReview,
  composeReview,
  manualFilled,
  replyByDate,
  scaleMaxFor,
} from '../review-message'

const equity = () => buildReview({ from: 'equity', inputs: EXAMPLE })
const jobOffer = () => buildReview({ from: 'job-offer', inputs: EXAMPLE })

const storeOnly = () => {
  const patch = exampleStorePatch()
  const inputs = {}
  for (const key of ENGINE_KEYS) inputs[key] = patch[key]
  return inputs
}

describe('buildReview', () => {
  it('shows the equity calculator’s numbers from its snapshot', () => {
    const review = equity()
    expect(review.classLabel).toBe('Founding executive')
    expect(review.context).toBe('CTO · pre-seed')
    expect(review.headline).toEqual({
      lead: 'The number to say: ',
      figure: '12%',
      tail: ' fully diluted.',
    })
    expect(review.band).toMatchObject({ lo: 8.5, hi: 15.5, offer: 3, max: 30 })
    expect(review.subject).toBe('Offer review: CTO at pre-seed')
  })

  it('drifts without the snapshot, which is the bug the snapshot fixes', () => {
    const review = buildReview({ from: 'equity', inputs: storeOnly() })
    expect(review.headline.figure).toBe('13%')
    expect(review.band).toMatchObject({ lo: 9.5, hi: 16.5 })
  })

  it('lists the brief’s eight lines with the board’s short labels', () => {
    expect(equity().facts.map((fact) => fact.short)).toEqual([
      'Seat',
      'Stage',
      'Equity offered',
      'Salary',
      'Exit path',
      'The read',
      'Number to say',
      'If it ends',
    ])
    expect(equity().facts[0].value).toBe(
      'CTO, converting from fractional or contract'
    )
  })

  it('uses the engine’s own ask sentence and the target rung’s band on the job offer route', () => {
    const review = jobOffer()
    expect(review.from).toBe('job-offer')
    const sentence = review.ask.sentences.target
    expect(
      `${review.headline.lead}${review.headline.figure}${review.headline.tail}`
    ).toBe(sentence)
    expect(review.band.lo).toBe(review.ask.target.read.offer.range.lo)
    expect(review.band.atAsk).toBe(true)
    expect(review.askLine).toMatch(
      /^The ask: \$\d+k and [\d.]+%, floor \$\d+k$/
    )
  })

  it('returns null rather than half a card when there is nothing to read', () => {
    expect(buildReview(null)).toBeNull()
    expect(buildReview({ from: 'equity' })).toBeNull()
  })

  it('keeps briefForContact’s message unchanged by the line refactor', () => {
    const text = briefForContact(computeRead(EXAMPLE)).message
    expect(
      text.startsWith(
        equity()
          .facts.map((f) => f.line)
          .join('\n')
      )
    ).toBe(true)
    expect(text).toContain(
      '\n\nWhat I want help with: \n\n--- Full brief ---\n'
    )
  })
})

describe('composeReview folds the deadline and help into the message', () => {
  it('builds the full message for the equity route', () => {
    const review = equity()
    const out = composeReview({
      review,
      help: ['counter', 'vesting'],
      deadline: 'two_weeks',
      note: '  A competing offer at 5%.  ',
    })
    expect(out.subject).toBe('Offer review: CTO at pre-seed')
    expect(out.factCount).toBe(8)
    expect(out.includedCount).toBe(8)
    expect(out.message).toBe(
      [
        review.facts.map((f) => f.line).join('\n'),
        'Answering by: within two weeks\nWhat I want help with: What to counter with, Vesting and cliff',
        'A competing offer at 5%.',
        `--- Full brief ---\n${review.briefText}`,
      ].join('\n\n')
    )
  })

  it('drops unticked lines and the detached brief', () => {
    const out = composeReview({
      review: equity(),
      off: ['salary', 'ends'],
      briefOn: false,
    })
    expect(out.includedCount).toBe(6)
    expect(out.message).not.toContain('Salary vs market:')
    expect(out.message).not.toContain('If it ends:')
    expect(out.message).not.toContain('--- Full brief ---')
    expect(out.message).toContain('Role and seat: CTO')
  })

  it('writes a dash when no help is picked, and no note block when empty', () => {
    const out = composeReview({ review: equity(), help: [], note: '   ' })
    expect(out.message).toContain('What I want help with: —')
    expect(out.message).not.toMatch(/—\n\n\n/)
  })

  it('puts urgency in the subject and the message', () => {
    const out = composeReview({ review: equity(), deadline: 'this_week' })
    expect(out.subject).toBe(
      'Offer review (answering this week): CTO at pre-seed'
    )
    expect(out.message).toContain('Answering by: this week')
    const none = composeReview({ review: null, deadline: 'none' })
    expect(none.subject).toBe('Offer review')
    expect(none.message).toContain('Answering by: no deadline')
  })

  it('sends the ask as its own row on the job offer route, which can be left out', () => {
    const review = jobOffer()
    expect(review.facts.at(-1)).toMatchObject({ id: 'ask', short: 'The ask' })
    const out = composeReview({ review, briefOn: false })
    expect(out.factCount).toBe(9)
    expect(out.message).toContain(`If it ends:`)
    expect(out.message).toContain(`\n${review.askLine}\n\nAnswering by:`)
    const without = composeReview({ review, briefOn: false, off: ['ask'] })
    expect(without.message).not.toContain('The ask:')
    expect(without.includedCount).toBe(8)
  })

  it('sends the manual text when there is no read', () => {
    const manual = MANUAL_TEMPLATE.replace(
      'Role and seat: ',
      'Role and seat: Head of data'
    )
    const out = composeReview({ review: null, manual, help: ['fair'] })
    expect(out.subject).toBe('Offer review')
    expect(out.message.startsWith('Role and seat: Head of data')).toBe(true)
    expect(out.message).toContain('What I want help with: Is this offer fair?')
    expect(out.message).not.toContain('--- Full brief ---')
  })
})

describe('helpers', () => {
  it('treats the untouched template as empty, and any value as filled', () => {
    expect(manualFilled(MANUAL_TEMPLATE)).toBe(false)
    expect(manualFilled('')).toBe(false)
    expect(manualFilled(`${MANUAL_TEMPLATE}\nSalary vs market: 150k`)).toBe(
      true
    )
    expect(manualFilled('They offered me 2% and 140k.')).toBe(true)
  })

  it('keeps 30% as the floor of the band scale', () => {
    expect(scaleMaxFor(15.5, 3)).toBe(30)
    expect(scaleMaxFor(29, 3)).toBe(40)
    expect(scaleMaxFor(10, 45)).toBe(50)
  })

  it('promises two business days from today in Phoenix', () => {
    // Wednesday 4 Nov 2026, 10:00 in Phoenix.
    expect(replyByDate(new Date('2026-11-04T17:00:00Z'))).toBe('Friday, Nov 6')
    // Thursday skips the weekend to Monday.
    expect(replyByDate(new Date('2026-11-05T17:00:00Z'))).toBe('Monday, Nov 9')
    // Saturday counts Monday and Tuesday.
    expect(replyByDate(new Date('2026-11-07T17:00:00Z'))).toBe(
      'Tuesday, Nov 10'
    )
    // 02:00 UTC Thursday is still Wednesday evening in Phoenix.
    expect(replyByDate(new Date('2026-11-05T02:00:00Z'))).toBe('Friday, Nov 6')
  })
})

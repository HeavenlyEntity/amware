import { describe, expect, it } from 'vitest'
import {
  FIRST_REMINDER_DAYS,
  LAST_REMINDER_DAYS,
  RENEW_WINDOW_DAYS,
  TERM_MONTHS,
  TERM_TIERS,
  addMonths,
  computeUpdatesUntil,
  dateInForce,
  dueAction,
  formatTermDate,
  nextUntil,
  priceLabel,
  renewalReturn,
  sameInstant,
  termState,
} from '../licenseTerm'

const BOUGHT = '2026-12-10T15:00:00.000Z'
const UNTIL = '2027-12-10T15:00:00.000Z'
const sale = (over = {}) => ({
  status: 'paid',
  grantsTier: 'pro',
  kind: 'sale',
  createdAt: BOUGHT,
  ...over,
})
const renewal = (createdAt, over = {}) => ({
  status: 'paid',
  grantsTier: null,
  kind: 'renewal',
  createdAt,
  ...over,
})
const at = (iso) => new Date(iso)
const pro = (over = {}) => ({
  id: 41,
  tier: 'pro',
  updatesComputedUntil: UNTIL,
  ...over,
})

describe('the constants', () => {
  it('are the decided values', () => {
    expect([
      TERM_MONTHS,
      RENEW_WINDOW_DAYS,
      FIRST_REMINDER_DAYS,
      LAST_REMINDER_DAYS,
    ]).toEqual([12, 60, 30, 7])
    expect(TERM_TIERS).toEqual(['pro', 'team'])
  })
})

describe('addMonths', () => {
  it('keeps the day and the time of day', () => {
    expect(addMonths(BOUGHT, 12).toISOString()).toBe(UNTIL)
  })
  it('ends a 29 February purchase on 28 February', () => {
    expect(addMonths('2028-02-29T10:00:00.000Z', 12).toISOString()).toBe(
      '2029-02-28T10:00:00.000Z'
    )
  })
  it('clamps to the last day of a shorter month', () => {
    expect(addMonths('2027-01-31T00:00:00.000Z', 1).toISOString()).toBe(
      '2027-02-28T00:00:00.000Z'
    )
  })
  it('is null for a value that is not a date', () => {
    expect(addMonths('soon', 12)).toBeNull()
  })
})

describe('computeUpdatesUntil', () => {
  it('starts 12 months from the first Pro or Team sale', () => {
    expect(computeUpdatesUntil([sale()], 'pro')).toEqual({
      until: UNTIL,
      keep: false,
    })
  })
  it('adds 12 months to the end date for an early renewal', () => {
    expect(
      computeUpdatesUntil([sale(), renewal('2027-11-01T09:00:00.000Z')], 'pro')
        .until
    ).toBe('2028-12-10T15:00:00.000Z')
  })
  it('treats a renewal paid on the end instant as early', () => {
    expect(computeUpdatesUntil([sale(), renewal(UNTIL)], 'pro').until).toBe(
      '2028-12-10T15:00:00.000Z'
    )
  })
  it('counts a late renewal from the day it was paid', () => {
    expect(
      computeUpdatesUntil([sale(), renewal('2028-01-15T12:00:00.000Z')], 'pro')
        .until
    ).toBe('2029-01-15T12:00:00.000Z')
  })
  it('adds 12 months for each of two renewals, in date order', () => {
    const rows = [
      renewal('2027-11-02T09:00:00.000Z'),
      sale(),
      renewal('2027-11-01T09:00:00.000Z'),
    ]
    expect(computeUpdatesUntil(rows, 'pro').until).toBe(
      '2029-12-10T15:00:00.000Z'
    )
  })
  it('ignores a refunded renewal', () => {
    const rows = [
      sale(),
      renewal('2027-11-01T09:00:00.000Z', { status: 'refunded' }),
    ]
    expect(computeUpdatesUntil(rows, 'pro').until).toBe(UNTIL)
  })
  it('does not move the date for an upgrade in between', () => {
    const rows = [
      sale(),
      sale({
        kind: 'upgrade',
        grantsTier: 'team',
        createdAt: '2027-03-01T00:00:00.000Z',
      }),
    ]
    expect(computeUpdatesUntil(rows, 'team').until).toBe(UNTIL)
  })
  it('keeps the stored date when the original sale is refunded and the upgrade is paid', () => {
    const rows = [
      sale({ status: 'refunded' }),
      sale({
        kind: 'upgrade',
        grantsTier: 'team',
        createdAt: '2027-03-01T00:00:00.000Z',
      }),
    ]
    expect(computeUpdatesUntil(rows, 'team')).toEqual({
      until: null,
      keep: true,
    })
  })
  it('reads a row with no kind as a sale', () => {
    expect(computeUpdatesUntil([sale({ kind: null })], 'pro').until).toBe(UNTIL)
  })
  it('never starts a term from a Lite claim or an Enterprise quote', () => {
    expect(computeUpdatesUntil([sale({ grantsTier: 'lite' })], 'lite')).toEqual(
      { until: null, keep: false }
    )
    expect(
      computeUpdatesUntil([sale({ grantsTier: 'enterprise' })], 'enterprise')
    ).toEqual({ until: null, keep: false })
  })
  it('gives Enterprise no worked-out date even after a Pro sale', () => {
    expect(
      computeUpdatesUntil(
        [sale(), sale({ grantsTier: 'enterprise' })],
        'enterprise'
      )
    ).toEqual({ until: null, keep: false })
  })
  it('gives a license with no paid tier no date', () => {
    expect(computeUpdatesUntil([sale({ status: 'refunded' })], null)).toEqual({
      until: null,
      keep: false,
    })
  })
  it('ignores a row whose date cannot be read', () => {
    expect(
      computeUpdatesUntil([sale({ createdAt: undefined })], 'pro')
    ).toEqual({ until: null, keep: true })
  })
})

describe('dateInForce', () => {
  it('takes the later of the worked-out date and the override', () => {
    expect(dateInForce(UNTIL, '2028-03-01T00:00:00.000Z')).toBe(
      '2028-03-01T00:00:00.000Z'
    )
    expect(dateInForce(UNTIL, '2027-01-01T00:00:00.000Z')).toBe(UNTIL)
  })
  it('uses whichever one exists', () => {
    expect(dateInForce(null, '2028-03-01T00:00:00.000Z')).toBe(
      '2028-03-01T00:00:00.000Z'
    )
    expect(dateInForce(UNTIL, null)).toBe(UNTIL)
    expect(dateInForce(null, null)).toBeNull()
  })
})

describe('nextUntil', () => {
  it('adds to the end date when paid on or before it, else counts from the payment', () => {
    expect(nextUntil(UNTIL, '2027-11-01T00:00:00.000Z')).toBe(
      '2028-12-10T15:00:00.000Z'
    )
    expect(nextUntil(UNTIL, '2028-01-15T12:00:00.000Z')).toBe(
      '2029-01-15T12:00:00.000Z'
    )
    expect(nextUntil(null, BOUGHT)).toBe(UNTIL)
  })
})

describe('termState', () => {
  it('has ended from the end instant on', () => {
    expect(termState(pro(), at('2027-12-10T14:59:59.000Z')).ended).toBe(false)
    expect(termState(pro(), at(UNTIL)).ended).toBe(true)
  })
  it('opens Renew 60 days before the end and keeps it open after', () => {
    expect(termState(pro(), at('2027-10-11T14:59:00.000Z')).renewOpen).toBe(
      false
    )
    expect(termState(pro(), at('2027-10-11T15:00:00.000Z')).renewOpen).toBe(
      true
    )
    expect(termState(pro(), at('2028-06-01T00:00:00.000Z')).renewOpen).toBe(
      true
    )
    expect(termState(pro(), at('2027-01-01T00:00:00.000Z')).renewOpensOn).toBe(
      '2027-10-11T15:00:00.000Z'
    )
  })
  it('lets Enterprise have a date only by override, and never self-renew', () => {
    const ent = { tier: 'enterprise', updatesUntilOverride: UNTIL }
    expect(termState(ent, at('2028-01-01T00:00:00.000Z'))).toMatchObject({
      until: UNTIL,
      ended: true,
      selfRenew: false,
      renewOpen: false,
    })
  })
  it('gives Lite and a refunded license no term', () => {
    expect(
      termState({ tier: 'lite', updatesComputedUntil: UNTIL }, at(BOUGHT)).until
    ).toBeNull()
    expect(
      termState({ tier: null, updatesUntilOverride: UNTIL }, at(BOUGHT)).until
    ).toBeNull()
  })
})

describe('dueAction', () => {
  it('sends the first reminder from 30 days before, not 31', () => {
    expect(dueAction(pro(), at('2027-11-09T14:00:00.000Z'))).toBeNull()
    expect(dueAction(pro(), at('2027-11-10T16:00:00.000Z'))).toBe(
      'first-reminder'
    )
  })
  it('sends nothing more once the first reminder went for this date', () => {
    expect(
      dueAction(
        pro({ firstReminderSentFor: UNTIL }),
        at('2027-11-20T00:00:00.000Z')
      )
    ).toBeNull()
  })
  it('sends only the last reminder inside 7 days, even if the first never went', () => {
    expect(dueAction(pro(), at('2027-12-04T06:00:00.000Z'))).toBe(
      'last-reminder'
    )
    expect(
      dueAction(
        pro({ lastReminderSentFor: UNTIL }),
        at('2027-12-04T06:00:00.000Z')
      )
    ).toBeNull()
  })
  it('does not count a mark sent for an older end date', () => {
    expect(
      dueAction(
        pro({ firstReminderSentFor: '2026-12-10T15:00:00.000Z' }),
        at('2027-11-20T00:00:00.000Z')
      )
    ).toBe('first-reminder')
  })
  it('compares marks as instants, not strings', () => {
    expect(
      dueAction(
        pro({ firstReminderSentFor: '2027-12-10T15:00:00+00:00' }),
        at('2027-11-20T00:00:00.000Z')
      )
    ).toBeNull()
  })
  it('withdraws once the end has passed and access is still in place', () => {
    expect(dueAction(pro(), at('2027-12-11T06:00:00.000Z'))).toBe('withdraw')
  })
  it('sends the ended notice when access is withdrawn and the notice did not go', () => {
    const withdrawn = pro({
      accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
      accessWithdrawnFor: UNTIL,
    })
    expect(dueAction(withdrawn, at('2027-12-12T06:00:00.000Z'))).toBe(
      'notify-ended'
    )
    expect(
      dueAction(
        { ...withdrawn, endedNoticeSentFor: UNTIL },
        at('2027-12-12T06:00:00.000Z')
      )
    ).toBeNull()
  })
  it('restores access when the date in force is ahead again', () => {
    const renewed = pro({
      updatesComputedUntil: '2028-12-12T06:00:00.000Z',
      accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
    })
    expect(dueAction(renewed, at('2027-12-13T00:00:00.000Z'))).toBe('restore')
  })
  it('never acts on a license with no date in force, or no paid tier', () => {
    expect(
      dueAction({ tier: 'enterprise' }, at('2030-01-01T00:00:00.000Z'))
    ).toBeNull()
    expect(
      dueAction(pro({ tier: null }), at('2030-01-01T00:00:00.000Z'))
    ).toBeNull()
  })
})

describe('renewalReturn', () => {
  it('is confirming until the date moves past the one the checkout started from', () => {
    expect(renewalReturn(UNTIL, UNTIL)).toBe('confirming')
    expect(renewalReturn('2028-12-10T15:00:00.000Z', UNTIL)).toBe('done')
  })
  it('ignores a value that is not a date', () => {
    expect(renewalReturn(UNTIL, 'yes')).toBeNull()
    expect(renewalReturn(UNTIL, undefined)).toBeNull()
  })
})

describe('formatting', () => {
  it('shows the UTC date, even near midnight', () => {
    expect(formatTermDate('2027-12-10T23:30:00.000Z')).toBe('10 December 2027')
    expect(formatTermDate('2027-12-10T00:30:00.000Z')).toBe('10 December 2027')
    expect(formatTermDate(null)).toBe('')
  })
  it('compares two shapes of one instant as equal', () => {
    expect(
      sameInstant('2027-12-10T15:00:00.000Z', '2027-12-10T15:00:00+00:00')
    ).toBe(true)
    expect(sameInstant(UNTIL, null)).toBe(false)
  })
  it('labels a price with two decimals, or not at all', () => {
    expect(priceLabel(199)).toBe('$199.00')
    expect(priceLabel(null)).toBeNull()
    expect(priceLabel('199')).toBeNull()
  })
})

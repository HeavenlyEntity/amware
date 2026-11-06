import { describe, expect, it } from 'vitest'
import { DEFAULT_STRATEGY_CALL_PRICE, strategyCall } from '../strategy-call.js'

/* The hero and book band sell the strategy call at the price the cards'
   buttons charge and through the same Cal.com event, both read off the
   consulting rows, never typed into the page. */

const CAL = 'https://cal.com/amware/on-demand-outcome'

describe('strategyCall', () => {
  it('takes the first deposit and the first Cal.com link', () => {
    expect(
      strategyCall([
        { slug: 'advisor', bookingUrl: 'https://example.com/book' },
        { slug: 'fractional-cto', depositAmount: 1500, bookingUrl: CAL },
        { slug: 'embedded-cto', depositAmount: 2500 },
      ])
    ).toEqual({
      price: 1500,
      booking: {
        link: 'amware/on-demand-outcome',
        namespace: 'on-demand-outcome',
      },
    })
  })

  it('falls back to the collection default and no booking link', () => {
    expect(strategyCall([])).toEqual({
      price: DEFAULT_STRATEGY_CALL_PRICE,
      booking: null,
    })
    expect(strategyCall(undefined).price).toBe(1500)
  })

  it('prices and books from the same row when one row has both', () => {
    expect(
      strategyCall([
        { slug: 'a', depositAmount: 900 },
        { slug: 'b', depositAmount: 1500, bookingUrl: CAL },
      ]).price
    ).toBe(1500)
  })

  it('reads a zero deposit as "no deposit", not a free call', () => {
    expect(
      strategyCall([{ depositAmount: 0 }, { depositAmount: 1800 }]).price
    ).toBe(1800)
  })
})

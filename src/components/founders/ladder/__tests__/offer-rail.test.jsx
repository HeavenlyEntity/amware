import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { OfferRail } from '../offer-rail'
import { fmtMoney, fmtPct } from '@/components/founders/format'
import { INITIAL } from '@/lib/founders/offer-store'
import { computeRead } from '@/lib/founders/equity/engine'
import { computeAsk } from '@/lib/founders/equity/negotiation'

/* The rail reads the same engine calls as the results, from the same store
   shape, so these build it the way the page does. */
function setup(over = {}, step = 1) {
  const store = { ...INITIAL, ...over }
  const read = computeRead(store)
  const ask = computeAsk(read, { industry: store.industry, geo: store.geo })
  render(<OfferRail read={read} ask={ask} store={store} step={step} />)
  return { read, ask }
}

describe('the live rail', () => {
  it('names itself and shows the engine’s target, not a typed one', () => {
    const { ask } = setup({ responsibilities: ['architecture'] })
    const rail = screen.getByRole('complementary', { name: 'Your ask so far' })
    const aim = within(rail)
      .getAllByText(ask.target.label)
      .find((el) => el.tagName === 'P').nextElementSibling
    expect(aim.textContent.replace(/\s+/g, ' ')).toContain(
      `${fmtMoney(ask.target.cash)} + and ${fmtPct(ask.target.equityPct)}`
    )
    const mini = within(rail).getByRole('list', { name: 'The ladder so far' })
    expect(within(mini).getAllByRole('listitem')).toHaveLength(3)
  })

  it('shows the cash bucket in the engine’s words while the class is pending', () => {
    setup()
    expect(screen.getByText('Market rate so far')).toBeInTheDocument()
    expect(screen.getByText('Possible aim')).toBeInTheDocument()
  })

  it('shows the class once there is one', () => {
    setup({ joining: 'formation' })
    expect(screen.getByText('Founder')).toBeInTheDocument()
    expect(screen.queryByText('Possible aim')).toBeNull()
  })

  it('steps the known line in as the reader reaches each step', () => {
    setup({ industry: 'ai' }, 1)
    expect(screen.getByText('CTO · — · —')).toBeInTheDocument()
  })

  it('shows stage and industry from step 2', () => {
    setup({ industry: 'ai' }, 2)
    expect(screen.getByText('CTO · pre-seed · AI')).toBeInTheDocument()
  })

  it('unlocks the offer step from either mode, shares included', () => {
    setup(
      {
        offerMode: 'shares',
        optionCount: 300_000,
        fullyDilutedShares: 10_000_000,
      },
      3
    )
    expect(screen.getByText('3 of 3 unlocked')).toBeInTheDocument()
  })
})

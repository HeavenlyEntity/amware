import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Verdict } from '../results/verdict'
import { ResultsScreen } from '../results/results-screen'
import { subscribeDesk } from '../desk-toast'
import { computeRead } from '@/lib/founders/equity/engine'
import { EXAMPLE } from '@/lib/founders/equity/benchmarks'
import { ASK_HREF } from '@/lib/founders/tools'

const cases = [
  {
    name: 'below',
    inputs: { ...EXAMPLE, offeredEquityPct: 3 },
    text: /sized as a hire while doing founder work/i,
  },
  {
    name: 'within',
    inputs: { ...EXAMPLE, offeredEquityPct: 10 },
    text: /The percent is fair/i,
  },
  {
    name: 'above',
    inputs: { ...EXAMPLE, offeredEquityPct: 25 },
    text: /Above the band/i,
  },
  {
    name: 'no offer',
    inputs: { ...EXAMPLE, offeredEquityPct: null },
    text: /Enter the offer to see the gap/i,
  },
  {
    name: 'formation founder',
    inputs: { ...EXAMPLE, joining: 'formation', founders: 2 },
    text: /founder shares/i,
  },
  {
    name: 'hire',
    inputs: {
      ...EXAMPLE,
      joining: 'hired_after',
      responsibilities: ['infra_oncall'],
    },
    text: /employee role/i,
  },
]

const renderResults = (read) =>
  render(
    <ResultsScreen
      read={read}
      overrides={{ valuations: {} }}
      onOverride={() => {}}
    />
  )

/* The page's h1 is the tool's question now (the board's header), so the
   six-way headline names the verdict card as its h2 (spec fork F1). */
describe('Verdict headline', () => {
  for (const c of cases) {
    it(`renders the ${c.name} sentence`, () => {
      const read = computeRead(c.inputs)
      renderResults(read)
      const heading = screen.getByRole('heading', { level: 2, name: c.text })
      expect(heading.closest('section')).toHaveAttribute(
        'aria-labelledby',
        heading.id
      )
      expect(
        screen.getByRole('link', { name: /review this offer/i })
      ).toHaveAttribute('href', '/contact/offer-review')
    })
  }
})

describe('the number to say', () => {
  it('asks for the band middle when the offer is below the band', () => {
    const read = computeRead({ ...EXAMPLE, offeredEquityPct: 3 })
    render(<Verdict read={read} />)
    expect(screen.getByText('Ask for')).toBeInTheDocument()
    expect(
      screen.getByText(`${read.offer.numberToSay.value}%`)
    ).toBeInTheDocument()
    expect(screen.getByText(/points below the band/)).toBeInTheDocument()
  })

  it('says to hold, not to ask, when the offer is already inside', () => {
    render(<Verdict read={computeRead({ ...EXAMPLE, offeredEquityPct: 10 })} />)
    expect(screen.getByText('Hold at')).toBeInTheDocument()
    expect(screen.queryByText('Ask for')).toBeNull()
  })

  it('copies the sentence and says so through the desk toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const heard = vi.fn()
    const stop = subscribeDesk(heard)
    const read = computeRead(EXAMPLE)
    render(<Verdict read={read} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy what to say' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(read.offer.numberToSay.sentence)
    )
    await waitFor(() =>
      expect(heard).toHaveBeenCalledWith('Copied what to say')
    )
    stop()
  })

  it('shows the sentence to select by hand when the clipboard refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    const read = computeRead(EXAMPLE)
    render(<Verdict read={read} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy what to say' }))
    expect(await screen.findByLabelText(/blocked the clipboard/i)).toHaveValue(
      read.offer.numberToSay.sentence
    )
  })
})

describe('the hand-off to the ask (T7)', () => {
  it('offers the next question as a link, never as a second button', () => {
    renderResults(computeRead(EXAMPLE))
    const handoff = screen.getByRole('link', { name: /turn this into an ask/i })
    expect(handoff).toHaveAttribute('href', ASK_HREF)
    /* One primary. Two buttons side by side is a tool menu, and the reader has
       to choose before they know what either does. */
    expect(handoff.className).not.toMatch(/bg-\[var\(--amw-accent\)\]/)
  })
})

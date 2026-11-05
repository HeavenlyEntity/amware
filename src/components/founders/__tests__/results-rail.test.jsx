import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ResultsRail } from '../results-rail'
import { computeRead, EXAMPLE_READ } from '@/lib/founders/equity/engine'
import { EXAMPLE } from '@/lib/founders/equity/benchmarks'

describe('ResultsRail', () => {
  it('shows a possible range and no badge on step 1', () => {
    const read = computeRead({ ...EXAMPLE, responsibilities: [] })
    render(<ResultsRail read={read} step={1} />)
    expect(screen.getByText(/Possible range/)).toBeInTheDocument()
    expect(screen.queryByText('Founding executive')).not.toBeInTheDocument()
    expect(screen.getByText('No badge yet')).toBeInTheDocument()
    /* The board's unlock checklist replaced the "Still needed" list; it still
       names every step left and where it is. */
    expect(screen.getByText('0 of 3 unlocked')).toBeInTheDocument()
    expect(screen.getByText('step 2')).toBeInTheDocument()
  })

  it('unlocks a step once it is behind the visitor, and the offer once entered', () => {
    const { rerender } = render(<ResultsRail read={EXAMPLE_READ} step={2} />)
    expect(screen.getByText('1 of 3 unlocked')).toBeInTheDocument()
    expect(
      screen.getByText('Role and how you’re joining').parentElement
    ).toHaveAttribute('data-done', 'true')
    rerender(<ResultsRail read={EXAMPLE_READ} step={3} />)
    /* The worked example carries an offer, so step 3 is unlocked already. */
    expect(screen.getByText('3 of 3 unlocked')).toBeInTheDocument()
    expect(screen.getByText(/Offered 3% · below the band/)).toBeInTheDocument()
  })

  it('keeps the badge at "?" on step 2 with zero chips and asks the user to pick', () => {
    const read = computeRead({ ...EXAMPLE, responsibilities: [] })
    render(<ResultsRail read={read} step={2} />)
    expect(screen.queryByText('Founding executive')).not.toBeInTheDocument()
    expect(screen.getByText(/Pick what was yours/)).toBeInTheDocument()
  })

  it('shows the class badge from the first chip and an empty offer note before step 3', () => {
    render(<ResultsRail read={EXAMPLE_READ} step={2} />)
    expect(screen.getByText('Founding executive')).toBeInTheDocument()
    expect(screen.getByText('Offer not entered yet.')).toBeInTheDocument()
  })

  it('marks banked work as n/a for salaried joiners', () => {
    const read = computeRead({ ...EXAMPLE, joining: 'hired_after' })
    render(<ResultsRail read={read} step={2} />)
    expect(screen.getByText('n/a (salaried)')).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))
/* The lens must never load outside its gate; jsdom has no WebGL. */
vi.mock('@/components/react-bits/fluid-glass', () => {
  throw new Error('FluidGlass loaded outside its gate')
})

import { BookBand } from '../book-band'
import { SERVICES_PAGE } from '@/content/site/services-page'

const booking = {
  link: 'amware/on-demand-outcome',
  namespace: 'on-demand-outcome',
}

/* The band at the bottom of /services, for the visitor who has not picked a
   track: the deposit's value and refund terms sit around the button exactly
   as they do on the cards (F15). */

describe('BookBand', () => {
  it('is the #book region, named by its heading', () => {
    render(<BookBand booking={booking} />)
    const band = screen.getByRole('region', {
      name: SERVICES_PAGE.band.title,
    })
    expect(band).toHaveAttribute('id', 'book')
    expect(within(band).getByText(SERVICES_PAGE.band.copy)).toBeInTheDocument()
  })

  it('wraps the strategy call in the deposit terms: value, button, refund', () => {
    render(<BookBand booking={booking} />)
    const note = screen.getByRole('note', {
      name: 'First call value and refund terms',
    })
    const button = screen.getByRole('button', { name: /book a strategy call/i })
    const refund = screen.getByText('Full refund if we don’t work together.')
    expect(button).toHaveAttribute(
      'data-cal-namespace',
      'on-demand-outcome-services'
    )
    expect(
      note.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      button.compareDocumentPosition(refund) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    // No figure: the popup shows the deposit before it is charged.
    expect(document.getElementById('book')).not.toHaveTextContent('$')
  })

  it('sends the visitor to the contact form, with no deposit terms, without a Cal.com link', () => {
    render(<BookBand booking={null} />)
    expect(
      screen.getByRole('link', { name: /book a strategy call/i })
    ).toHaveAttribute('href', '/contact')
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('shows the glass as a static poster', () => {
    const { container } = render(<BookBand booking={booking} />)
    const glass = container.querySelector('.amw-glass')
    expect(glass).toHaveAttribute('data-lens', 'poster')
    expect(glass).toHaveAttribute('aria-hidden', 'true')
    expect(glass).toHaveTextContent('Scope first.')
    expect(container.querySelector('canvas')).toBeNull()
  })
})

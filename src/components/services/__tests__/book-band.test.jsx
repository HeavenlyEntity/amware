import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))
/* The lens must never load outside its gate; jsdom has no WebGL. */
vi.mock('@/components/react-bits/fluid-glass', () => {
  throw new Error('FluidGlass loaded outside its gate')
})

import { BOOK_LENS, BookBand } from '../book-band'
import { SERVICES_PAGE } from '@/content/site/services-page'

const booking = {
  link: 'amware/intro-call',
  namespace: 'intro-call',
}

/* The band at the bottom of /services, for the visitor who has not picked a
   track: the free intro call's terms sit around the button exactly as they
   do on the cards. */

describe('BookBand', () => {
  it('is the #book region, named by its heading', () => {
    render(<BookBand booking={booking} />)
    const band = screen.getByRole('region', {
      name: SERVICES_PAGE.band.title,
    })
    expect(band).toHaveAttribute('id', 'book')
    expect(within(band).getByText(SERVICES_PAGE.band.copy)).toBeInTheDocument()
  })

  it('wraps the intro call in its terms: what it is, button, length', () => {
    render(<BookBand booking={booking} />)
    const note = screen.getByRole('note', { name: 'What the intro call is' })
    const button = screen.getByRole('button', {
      name: /book a free intro call/i,
    })
    const refund = screen.getByText('Intro call · 15 min · free')
    expect(button).toHaveAttribute('data-cal-namespace', 'intro-call-services')
    expect(
      note.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      button.compareDocumentPosition(refund) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    // No figure, and no refund promise: the call is free.
    expect(document.getElementById('book')).not.toHaveTextContent('$')
    expect(document.getElementById('book')).not.toHaveTextContent(/refund/i)
  })

  it('sends the visitor to the contact form, with no call terms, without a Cal.com link', () => {
    render(<BookBand booking={null} />)
    expect(
      screen.getByRole('link', { name: /book a free intro call/i })
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

  it('reshapes through the crown, as on the boards', () => {
    expect(BOOK_LENS.shapes).toEqual(['diamond', 'crown', 'torus', 'prism'])
  })
})

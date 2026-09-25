import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TestimonialsWithCarousel } from '../testimonials-with-carousel'
import { testimonials } from '@/content/site/testimonials'

/* A buyer weighing an engagement pages through what the people on the other
   side of the work said: three at a time, with the arrows wrapping round, and
   every card a real quote attributed to a real person. */

const people = (count) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Person ${i + 1}`,
    role: `Founder of Company ${i + 1}`,
    description: `Quote number ${i + 1}.`,
    verbatim: true,
  }))

/* Verbatim quotes render inside curly quotation marks, so match the words. */
const quote = (n) => new RegExp(`Quote number ${n}\\.`)

function renderCarousel(items) {
  return render(
    <TestimonialsWithCarousel
      eyebrow="// AMWARE · TESTIMONIALS"
      title="What founders say"
      items={items}
    />
  )
}

const next = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Next testimonials' }))
const previous = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Previous testimonials' }))

describe('TestimonialsWithCarousel', () => {
  it('shows three at a time and pages on to the rest', async () => {
    renderCarousel(people(4))
    expect(screen.getAllByRole('figure')).toHaveLength(3)
    expect(screen.getByText(quote(1))).toBeInTheDocument()
    expect(screen.queryByText(quote(4))).not.toBeInTheDocument()

    next()
    expect(await screen.findByText(quote(4))).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText(quote(1))).not.toBeInTheDocument()
    )
  })

  it('wraps from the first page back to the last', async () => {
    renderCarousel(people(4))
    previous()
    expect(await screen.findByText(quote(4))).toBeInTheDocument()
  })

  it('tells screen readers which testimonials are showing', async () => {
    renderCarousel(people(4))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Showing 1 to 3 of 4')
    next()
    await waitFor(() => expect(status).toHaveTextContent('Showing 4 to 4 of 4'))
  })

  it('drops the arrows when everything fits on one page', () => {
    renderCarousel(people(3))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('marks each card up as a quote attributed to its person', () => {
    renderCarousel(people(1))
    const figure = screen.getByRole('figure')
    expect(figure.querySelector('blockquote')).toHaveTextContent(
      'Quote number 1.'
    )
    expect(figure.querySelector('figcaption')).toHaveTextContent('Person 1')
    expect(figure.querySelector('figcaption')).toHaveTextContent(
      'Founder of Company 1'
    )
    /* No photo on file, so initials stand in, hidden from screen readers
       because the name is right beside them. */
    expect(figure.querySelector('img')).toBeNull()
    expect(screen.getByText('P1')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps quotation markup off a summary', () => {
    /* A blockquote around words the person never said would present them as
       their own, the same rule the homepage rail follows. */
    renderCarousel([{ ...people(1)[0], verbatim: false }])
    const figure = screen.getByRole('figure')
    expect(figure.querySelector('blockquote')).toBeNull()
    expect(screen.getByText('Quote number 1.')).toBeInTheDocument()
  })

  it('names the section by its heading', () => {
    renderCarousel(people(1))
    expect(
      screen.getByRole('region', { name: 'What founders say' })
    ).toBeInTheDocument()
  })
})

describe('shared testimonials', () => {
  /* The services page and the homepage read the same list, so a change of
     wording from any of these people lands on both. Every entry names a real
     person and says who they are to the work. */
  it('gives every testimonial a name, a role and the quote', () => {
    expect(testimonials.length).toBeGreaterThan(0)
    for (const t of testimonials) {
      expect(t.name).toBeTruthy()
      expect(t.role).toBeTruthy()
      expect(t.description).toBeTruthy()
    }
  })
})

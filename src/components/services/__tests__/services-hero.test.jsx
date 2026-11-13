import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/* The embed loads Cal.com's script on mount; what the hero owes the test is
   the data attributes the embed reads off the button. */
vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

import { ServicesHero } from '../services-hero'
import { SERVICES_PAGE } from '@/content/site/services-page'

/* The /services hero as a buyer meets it: the approved words, one click to
   the strategy-call popup, no figure (the advisory side quotes none), and a
   quiet way down to the tracks. */

const booking = {
  link: 'amware/on-demand-outcome',
  namespace: 'on-demand-outcome',
}

describe('ServicesHero', () => {
  it('says the approved words, once, under one h1', () => {
    render(<ServicesHero booking={booking} />)
    const hero = screen.getByRole('region', {
      name: SERVICES_PAGE.hero.title,
    })
    expect(within(hero).getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(hero).getByText(SERVICES_PAGE.hero.lede)).toBeInTheDocument()
    expect(
      within(hero).getByText(SERVICES_PAGE.hero.location)
    ).toBeInTheDocument()
    /* The eyebrow reads "Services"; the "// SEC.00 /" prefix is decoration. */
    const prefix = within(hero).getByText('// SEC.00 /', { exact: false })
    expect(prefix).toHaveAttribute('aria-hidden', 'true')
    expect(prefix.parentElement).toHaveTextContent('// SEC.00 / Services')
  })

  it('opens the strategy-call popup on its own page namespace', () => {
    render(<ServicesHero booking={booking} />)
    const cta = screen.getByRole('button', { name: /book a strategy call/i })
    expect(cta).toHaveAttribute('data-cal-link', 'amware/on-demand-outcome')
    expect(cta).toHaveAttribute(
      'data-cal-namespace',
      'on-demand-outcome-services'
    )
    expect(JSON.parse(cta.getAttribute('data-cal-config'))).toMatchObject({
      notes: 'Engagement: not sure yet (from /services)',
    })
    /* The arrow is decoration; the name is the words. */
    expect(cta).toHaveAccessibleName('book a strategy call')
  })

  it('falls back to the contact form without a Cal.com link', () => {
    render(<ServicesHero booking={null} />)
    expect(screen.queryByRole('button', { name: /strategy call/i })).toBeNull()
    expect(
      screen.getByRole('link', { name: /book a strategy call/i })
    ).toHaveAttribute('href', '/contact')
  })

  it('names the call and its refund term without a price', () => {
    const { container } = render(<ServicesHero booking={booking} />)
    expect(
      screen.getByText('60 minutes · full refund if we don’t work together')
    ).toBeInTheDocument()
    expect(container).not.toHaveTextContent('$')
  })

  it('promises no refund when the call is the contact form', () => {
    const { container } = render(<ServicesHero booking={null} />)
    expect(screen.getByText('Strategy call · 60 minutes')).toBeInTheDocument()
    expect(container).not.toHaveTextContent(/refund/i)
  })

  it('scrolls to the tracks with the quiet link', () => {
    render(<ServicesHero booking={booking} />)
    expect(
      screen.getByRole('link', { name: /compare engagements/i })
    ).toHaveAttribute('href', '#engagements')
  })

  it('draws both backdrops as static posters, out of the accessibility tree', () => {
    const { container } = render(<ServicesHero booking={booking} />)
    const wall = container.querySelector('.svc-wall')
    const field = container.querySelector('.svc-ascii')
    expect(wall).toHaveAttribute('aria-hidden', 'true')
    expect(wall).toHaveAttribute('data-wall', 'poster')
    expect(field).toHaveAttribute('aria-hidden', 'true')
    expect(field).toHaveAttribute('data-field', 'poster')
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })
})

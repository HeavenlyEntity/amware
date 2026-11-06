import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* /services is a public page: if Payload cannot be read it still renders,
   says so where the cards would be, and the strategy call falls back to the
   contact form. With the rows, the hero and band read the price and the
   booking link off them. */

const payload = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({
  getPayloadClient: vi.fn(async () => payload),
}))
vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))
vi.mock('@/components/analytics/TrackView', () => ({ TrackView: () => null }))
vi.mock('@/components/website-package', () => ({
  WebsitePackage: () => <section aria-label="Website package" />,
}))

import ServicesPage from '../page'

const tier = (over) => ({
  id: over.slug,
  name: over.slug,
  summary: 'Best for someone',
  startingPrice: 3000,
  priceLabel: 'per month',
  bookingUrl: 'https://cal.com/amware/on-demand-outcome',
  depositAmount: 1500,
  status: 'published',
  ...over,
})

describe('ServicesPage', () => {
  it('degrades to a refreshable notice when the services cannot be read', async () => {
    payload.find.mockRejectedValueOnce(new Error('db down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(await ServicesPage())
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /engineer behind the tools/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/couldn’t be loaded/i)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', {
      name: /book a strategy call/i,
    })) {
      expect(link).toHaveAttribute('href', '/contact')
    }
  })

  it('sells the call at the rows’ deposit, counts the retainers, and keeps the card anchors', async () => {
    payload.find.mockResolvedValueOnce({
      docs: [
        tier({ slug: 'advisor', depositAmount: 1800 }),
        tier({ slug: 'fractional-cto', popular: true }),
        tier({ slug: 'embedded-cto' }),
      ],
    })
    const { container } = render(await ServicesPage())
    expect(screen.getAllByText('Strategy call · $1,800')).toHaveLength(2)
    expect(
      screen.getByText('3 retainers · published pricing')
    ).toBeInTheDocument()
    for (const slug of ['advisor', 'fractional-cto', 'embedded-cto']) {
      expect(container.querySelector(`li#${slug}`)).not.toBeNull()
    }
    expect(container.querySelector('#engagements')).not.toBeNull()
    expect(container.querySelector('#book')).not.toBeNull()
  })
})

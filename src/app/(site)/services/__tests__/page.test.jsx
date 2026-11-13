import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* /services is a public page: if Payload cannot be read it still renders,
   says so where the cards would be, and the intro call falls back to the
   contact form. With the rows, the hero and band read the booking link off
   them, and no service on either track names a figure. */

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
  bookingUrl: 'https://cal.com/amware/intro-call',
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
        name: /stop losing users/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/couldn’t be loaded/i)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    // Both calls are free, so the promise and its FAQ answer hold even
    // when the button falls back to the contact form.
    expect(
      screen.getByRole('region', { name: /two free calls/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/isn’t worth it/i)).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /who this is for/i })
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', {
      name: /book a free intro call/i,
    })) {
      expect(link).toHaveAttribute('href', '/contact')
    }
  })

  it('quotes no figure on either track, counts the retainers, and keeps the card anchors', async () => {
    payload.find.mockResolvedValueOnce({
      docs: [
        tier({ slug: 'advisor', depositAmount: 1800 }),
        tier({ slug: 'fractional-cto', popular: true }),
        tier({ slug: 'embedded-cto' }),
        tier({
          slug: 'one-pager',
          category: 'technical',
          startingPrice: 2500,
          priceLabel: 'one-time payment',
          bookingUrl: null,
          depositAmount: null,
        }),
      ],
    })
    const { container } = render(await ServicesPage())
    // No price, deposit amount or "published pricing" anywhere in the page,
    // the structured data included.
    expect(container).not.toHaveTextContent('$')
    expect(container.innerHTML).not.toMatch(/"price"|1,?800|2,?500|3,?000/)
    expect(container).not.toHaveTextContent('one-time payment')
    // Under the hero button, and again on each card and the band.
    expect(
      screen.getAllByText('Intro call · 15 min · free').length
    ).toBeGreaterThan(1)
    expect(container).not.toHaveTextContent(/60 minutes/i)
    expect(
      screen.getByText('3 retainers · scoped on a call')
    ).toBeInTheDocument()
    for (const slug of [
      'advisor',
      'fractional-cto',
      'embedded-cto',
      'one-pager',
    ]) {
      expect(container.querySelector(`li#${slug}`)).not.toBeNull()
    }
    expect(container.querySelector('#engagements')).not.toBeNull()
    expect(container.querySelector('#book')).not.toBeNull()
  })

  it('runs the buyer from pain to promise, fit and objections, with FAQ data that matches', async () => {
    payload.find.mockResolvedValueOnce({
      docs: [tier({ slug: 'advisor' }), tier({ slug: 'fractional-cto' })],
    })
    const { container } = render(await ServicesPage())
    const order = [
      /stop losing users/i,
      /holding you back/i,
      /pick how much/i,
      /two free calls/i,
      /who this is for/i,
      /before you book/i,
      /not sure how bad/i,
    ].map((name) => screen.getByRole('heading', { name }))
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
    const faq = [
      ...container.querySelectorAll('script[type="application/ld+json"]'),
    ]
      .map((node) => JSON.parse(node.textContent))
      .find((data) => data['@type'] === 'FAQPage')
    const shown = [...container.querySelectorAll('.svc-faq summary')].map(
      (node) => node.textContent
    )
    expect(faq.mainEntity.map((q) => q.name)).toEqual(shown)
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(
      [...container.querySelectorAll('.svc-faq details p')].map(
        (node) => node.textContent
      )
    )
    expect(shown).toContain('What if the call isn’t worth it?')
  })
})

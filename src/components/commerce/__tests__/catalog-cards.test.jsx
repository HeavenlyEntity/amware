import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/commerce/BuyButton', () => ({
  BuyButton: ({ label }) => <button type="button">{label}</button>,
}))
/* The embed loads Cal.com's script on mount; jsdom has no business doing
   that. What the card owes the test is the data attributes the embed reads. */
vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

import {
  CourseCard,
  ProductCard,
  ServiceCard,
} from '@/components/commerce/catalog-cards'

const product = {
  slug: 'saas-kit',
  name: 'SaaS Kit',
  type: 'boilerplate',
  tagline: 'Auth, billing, CMS. Wired.',
  price: 149,
  currency: 'USD',
  creemProductId: 'prod_1',
  heroImage: { url: '/img/kit.webp' },
  techStack: [{ tech: 'Next.js' }, { tech: 'Payload' }],
}

describe('catalog cards', () => {
  it('product card is one stretched link named by the title, with number, price, and stack', () => {
    render(
      <ul>
        <ProductCard product={product} index={0} />
      </ul>
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('SaaS Kit')
    expect(links[0]).toHaveAttribute('href', '/products/saas-kit')
    expect(screen.getByText('01')).toBeInTheDocument()
    /* Was '$149.00'. One price format across the storefront now: whole
       dollars stay whole, because ".00" is two characters of noise on the
       line a buyer reads most carefully. */
    expect(screen.getByText('$149')).toBeInTheDocument()
    expect(screen.getByText('Boilerplate')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Stack' })).toHaveTextContent(
      'Next.js'
    )
  })

  it('product card without a price says pricing soon', () => {
    render(
      <ul>
        <ProductCard product={{ ...product, price: null }} index={3} />
      </ul>
    )
    expect(screen.getByText('pricing soon')).toBeInTheDocument()
    expect(screen.getByText('04')).toBeInTheDocument()
  })

  it('course card links from its title and shows free when unpriced', () => {
    render(
      <ul>
        <CourseCard
          course={{
            slug: 'auth',
            title: 'Auth from scratch',
            level: 'intermediate',
          }}
          index={1}
        />
      </ul>
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/courses/auth')
    expect(screen.getByText('free')).toBeInTheDocument()
    expect(screen.getByText('intermediate')).toBeInTheDocument()
  })

  it('service card shows the from-price, the description slot, and the quote link without a product id', () => {
    render(
      <ul>
        <ServiceCard
          service={{ slug: 'cto', name: 'Fractional CTO', startingPrice: 3500 }}
          index={0}
          description={<p>Weekly shipping.</p>}
        />
      </ul>
    )
    /* Was '$3500.00'. A retainer is thousands a month, and that rendering
       had no separator and two cents nobody charges. */
    expect(screen.getByText('$3,500')).toBeInTheDocument()
    expect(screen.getByText('Weekly shipping.')).toBeInTheDocument()
    // No booking link on this one, so it still falls back to the quote form.
    expect(
      screen.getByRole('link', { name: /request a quote/i })
    ).toHaveAttribute('href', '/contact')
  })

  it('service card says what the price is per, when the tier says so', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            startingPrice: 7500,
            priceLabel: 'per month',
            commitment: 'about 20 to 25 hrs a month',
          }}
        />
      </ul>
    )
    // $7,500 and $7,500 per month are very different offers.
    expect(screen.getByText('$7,500')).toBeInTheDocument()
    expect(screen.getByText('per month')).toBeInTheDocument()
    expect(screen.getByText(/20 to 25 hrs/)).toBeInTheDocument()
  })

  it('service card leads with the reservation when the tier has a deposit plan', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            startingPrice: 7500,
            bookingUrl: 'https://cal.com/amware/on-demand-outcome',
            whopPlanId: 'plan_live',
            depositAmount: 1500,
            depositNote: 'Old CMS copy that must not override the guarantee.',
          }}
        />
      </ul>
    )
    // The deposit is the one ask; the intro call now lives inside its
    // received state, so the card no longer asks for the call beside it.
    expect(
      screen.getByRole('button', { name: /reserve your start · \$1,500/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /book an intro call/i })
    ).toBeNull()
    expect(
      screen.queryByRole('link', { name: /book an intro call/i })
    ).toBeNull()
    const guarantee = screen.getByRole('note', {
      name: /first call value and refund terms/i,
    })
    expect(guarantee).toHaveTextContent('Know what to fix next in 60 minutes.')
    expect(guarantee).toHaveTextContent(
      'You leave knowing your highest-priority technical risk and the next move to make.'
    )
    expect(guarantee).toHaveTextContent(
      'Free tool included: CTO Systems Audit Prompt'
    )
    const reserve = screen.getByRole('button')
    const refund = screen.getByText('Full refund if we don’t work together.')
    expect(guarantee.compareDocumentPosition(reserve)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(reserve.compareDocumentPosition(refund)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(screen.queryByText(/move forward/i)).toBeNull()
    expect(screen.queryByText(/old cms copy/i)).toBeNull()
  })

  it('service card asks for the call when the tier has a booking link but no deposit plan', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            startingPrice: 7500,
            bookingUrl: 'https://cal.com/amware/on-demand-outcome',
            depositNote: 'A $1,500 deposit, credited against month one.',
          }}
        />
      </ul>
    )
    // A retainer starts with a conversation, not a quote request -- and a
    // Cal.com link books it here, in the embed, rather than sending the
    // visitor away to a page that cannot report back.
    const button = screen.getByRole('button', { name: /book an intro call/i })
    expect(button).toHaveAttribute('data-cal-link', 'amware/on-demand-outcome')
    expect(button).toHaveAttribute('data-cal-namespace', 'on-demand-outcome')
    expect(
      screen.queryByRole('link', { name: /book an intro call/i })
    ).toBeNull()
    expect(screen.getByText(/\$1,500 deposit/)).toBeInTheDocument()
  })

  it('service card links out when the booking link is not Cal.com', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            bookingUrl: 'https://calendly.com/amware/intro',
          }}
        />
      </ul>
    )
    const link = screen.getByRole('link', { name: /book an intro call/i })
    expect(link).toHaveAttribute('href', 'https://calendly.com/amware/intro')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('keeps cents when a price actually has them', () => {
    render(
      <ul>
        <ServiceCard
          service={{ slug: 'a', name: 'A', startingPrice: 1250.5 }}
        />
      </ul>
    )
    expect(screen.getByText('$1,250.5')).toBeInTheDocument()
  })

  it('service card with a product id renders the purchase button instead', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'audit',
            name: 'Audit',
            startingPrice: 900,
            creemProductId: 'p',
          }}
        />
      </ul>
    )
    expect(
      /* Was 'Purchase — $900'. The price sits directly above the button in
         the same card, so repeating it bought nothing and the em-dash was
         the AI tell it always is. */
      screen.getByRole('button', { name: 'Purchase' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

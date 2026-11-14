import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

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
  ServiceStrip,
} from '@/components/commerce/catalog-cards'

const product = {
  slug: 'saas-kit',
  name: 'SaaS Kit',
  type: 'boilerplate',
  tagline: 'Auth, billing, CMS. Wired.',
  price: 149,
  currency: 'USD',
  creemProductId: 'prod_kit',
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

  it('product card pill says View spec only when a checkout route exists', () => {
    const { unmount } = render(
      <ul>
        <ProductCard product={product} index={0} />
      </ul>
    )
    expect(screen.getByText('View spec')).toBeInTheDocument()
    unmount()

    // A kit with only a Whop plan is not on sale: kits sell through Creem.
    const { unmount: unmountWhopKit } = render(
      <ul>
        <ProductCard
          product={{ ...product, creemProductId: null, whopPlanId: 'plan_1' }}
          index={0}
        />
      </ul>
    )
    expect(screen.getByText('Details')).toBeInTheDocument()
    unmountWhopKit()

    // A kit with a Creem id is.
    const { unmount: unmountCreemKit } = render(
      <ul>
        <ProductCard
          product={{ ...product, whopPlanId: null, creemProductId: 'prod_1' }}
          index={0}
        />
      </ul>
    )
    expect(screen.getByText('View spec')).toBeInTheDocument()
    unmountCreemKit()

    const digital = {
      ...product,
      type: 'digital',
      whopPlanId: null,
      creemProductId: 'prod_1',
    }
    render(
      <ul>
        <ProductCard product={digital} index={0} />
      </ul>
    )
    expect(screen.getByText('View spec')).toBeInTheDocument()
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

  it('a build card offers a free quote in place of its price, with the description slot and the quote link', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            startingPrice: 3500,
          }}
          index={0}
          description={<p>Weekly shipping.</p>}
        />
      </ul>
    )
    expect(screen.getByText('Free quote for your project')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).toBeNull()
    expect(screen.getByText('Weekly shipping.')).toBeInTheDocument()
    // No booking link on this one, so it falls back to the quote form.
    expect(
      screen.getByRole('link', { name: 'Get your free quote' })
    ).toHaveAttribute('href', '/contact')
  })

  it('a build card names no figure or period, even with both stored', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            startingPrice: 7500,
            priceLabel: 'per month',
            commitment: 'about 20 to 25 hrs a month',
          }}
        />
      </ul>
    )
    expect(screen.queryByText(/\$/)).toBeNull()
    expect(screen.queryByText('per month')).toBeNull()
    expect(screen.queryByText(/starts at/i)).toBeNull()
    expect(screen.getByText(/20 to 25 hrs/)).toBeInTheDocument()
  })

  it('service card books the free intro call before any standalone deposit checkout', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            startingPrice: 7500,
            bookingUrl: 'https://cal.com/amware/intro-call',
            whopPlanId: 'plan_live',
            depositAmount: 1500,
            depositNote: 'Old CMS copy that must not override the guarantee.',
          }}
        />
      </ul>
    )
    // A Cal.com link is the free intro call, even with a legacy plan.
    const book = screen.getByRole('button', { name: 'Book a free intro call' })
    expect(screen.queryByRole('button', { name: /reserve/i })).toBeNull()
    const terms = screen.getByRole('note', { name: 'What the intro call is' })
    expect(terms).toHaveTextContent('Start with a free 15-minute call.')
    expect(terms).toHaveTextContent('Free ebook included')
    expect(terms).toHaveTextContent('Turn Website Visitors Into Buyers')
    expect(terms).not.toHaveTextContent(/audit prompt/i)
    const steps = within(terms).getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    ;['Book the call', 'Get the ebook', 'Win more buyers'].forEach((label, i) =>
      expect(within(steps[i]).getByText(label)).toBeInTheDocument()
    )
    expect(book).toHaveAttribute('data-cal-link', 'amware/intro-call')
    expect(book).toHaveAttribute('data-cal-namespace', 'intro-call-cto')
    expect(JSON.parse(book.getAttribute('data-cal-config')).notes).toBe(
      'Engagement: Fractional CTO'
    )
    fireEvent.click(book)
    expect(screen.queryByRole('dialog')).toBeNull()
    const fine = screen.getByText('Intro call · 15 min · free')
    expect(terms.compareDocumentPosition(book)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(book.compareDocumentPosition(fine)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(screen.queryByText(/full refund/i)).toBeNull()
    expect(screen.queryByText(/old cms copy/i)).toBeNull()
  })

  it('service card books the intro call when the tier has a booking link but no deposit plan', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            startingPrice: 7500,
            bookingUrl: 'https://cal.com/amware/intro-call',
            depositNote: 'A $1,500 deposit, credited against month one.',
          }}
        />
      </ul>
    )
    // A Cal.com link books it here, in the embed, rather than sending the
    // visitor away to a page that cannot report back.
    const button = screen.getByRole('button', {
      name: 'Book a free intro call',
    })
    expect(button).toHaveAttribute('data-cal-link', 'amware/intro-call')
    expect(button).toHaveAttribute('data-cal-namespace', 'intro-call-cto')
    expect(screen.queryByRole('link', { name: /intro call/i })).toBeNull()
    // The CMS deposit note quotes the deposit, so no card shows it.
    expect(screen.queryByText(/\$1,500 deposit/)).toBeNull()
  })

  it('an advisory card names no figure: no price, no deposit amount, no deposit note', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'consulting',
            startingPrice: 7500,
            priceLabel: 'per month',
            commitment: 'about 20 to 25 hrs a month',
            bookingUrl: 'https://cal.com/amware/intro-call',
            depositAmount: 1500,
            depositNote: 'A $1,500 deposit, credited against month one.',
          }}
        />
      </ul>
    )
    expect(
      screen.getByRole('button', { name: 'Book a free intro call' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Scoped and priced on the call')
    ).toBeInTheDocument()
    expect(screen.getByText(/20 to 25 hrs/)).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).toBeNull()
    expect(screen.queryByText('per month')).toBeNull()
    expect(screen.queryByText(/starts at/i)).toBeNull()
  })

  it('a card without a category is advisory too, as every older row is', () => {
    render(
      <ul>
        <ServiceCard
          service={{ slug: 'advisor', name: 'Advisor', startingPrice: 3000 }}
        />
      </ul>
    )
    expect(screen.queryByText('$3,000')).toBeNull()
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

  it('tags a service the CMS marks popular', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'company-site',
            name: 'Company Site',
            category: 'technical',
            startingPrice: 4500,
            popular: true,
          }}
        />
      </ul>
    )
    expect(screen.getByText('Most popular')).toBeInTheDocument()
  })

  it('lights a bare pixel field on hover instead of a frame of its own', () => {
    render(
      <ul>
        <ServiceCard
          service={{ slug: 'advisor', name: 'Advisor', category: 'consulting' }}
        />
      </ul>
    )
    const card = document.getElementById('advisor')
    const surface = card.querySelector('.amw-pixel-card')
    expect(surface).toHaveClass('amw-pixel-card--bare')
    expect(surface.querySelector('canvas')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
    expect(
      within(surface).getByRole('heading', { name: 'Advisor' })
    ).toBeInTheDocument()
  })

  it('leaves the tag off a service the CMS does not mark popular', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'one-pager',
            name: 'One Pager',
            category: 'technical',
            startingPrice: 2500,
          }}
        />
      </ul>
    )
    expect(screen.queryByText('Most popular')).toBeNull()
  })

  it('keeps the intro call terms around the button on a popular card', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            startingPrice: 7500,
            popular: true,
            bookingUrl: 'https://cal.com/amware/intro-call',
            whopPlanId: 'plan_live',
            depositAmount: 1500,
          }}
        />
      </ul>
    )
    expect(screen.getByText('Most popular')).toBeInTheDocument()
    const note = screen.getByRole('note', { name: 'What the intro call is' })
    const button = screen.getByRole('button', {
      name: 'Book a free intro call',
    })
    const fine = screen.getByText('Intro call · 15 min · free')
    expect(note.compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(button.compareDocumentPosition(fine)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('keeps the deposit terms around a standalone deposit checkout', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'cto',
            name: 'Fractional CTO',
            category: 'technical',
            whopPlanId: 'plan_live',
            depositAmount: 1500,
          }}
        />
      </ul>
    )
    const note = screen.getByRole('note', { name: 'Deposit terms' })
    const button = screen.getByRole('button', { name: /reserve your start/i })
    expect(note.compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(
      screen.getByText(
        'Credited in full to month one, or returned before work begins.'
      )
    ).toBeInTheDocument()
    // The ebook goes out with the intro call's confirmation; no call is
    // booked here, so these terms promise none.
    expect(note).not.toHaveTextContent(/ebook/i)
  })

  it('lays an open-ended service out as a strip with its summary and the quote link', () => {
    render(
      <ul>
        <ServiceStrip
          service={{
            slug: 'custom-work',
            name: 'Custom work',
            summary: 'If you have specific requirements, let’s talk.',
          }}
        />
      </ul>
    )
    expect(
      screen.getByRole('heading', { name: 'Custom work' })
    ).toBeInTheDocument()
    expect(screen.getByText(/specific requirements/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Get your free quote' })
    ).toHaveAttribute('href', '/contact')
  })

  it('service card with a product id renders the purchase button instead', () => {
    render(
      <ul>
        <ServiceCard
          service={{
            slug: 'audit',
            name: 'Audit',
            category: 'technical',
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

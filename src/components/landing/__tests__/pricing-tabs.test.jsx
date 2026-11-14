import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

/* Whop's embed is an iframe loader; the sheet stays closed in these tests,
   so a stub is all the button needs. */
vi.mock('@/components/commerce/WhopCheckout', () => ({
  WhopCheckout: () => <div data-testid="embed" />,
}))

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

/* jsdom has no canvas; the pixel hover is decoration, so the retainer cards
   render through a plain wrapper that keeps their markup. */
vi.mock('@/components/react-bits/pixel-card', () => ({
  PixelCard: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
}))

import { Pricing } from '../pricing'

/* The homepage offer section as a buyer meets it: two tabs, the right one
   open by default, the kit prices coming from the same rows /pricing reads
   rather than from copy someone typed here. */

const kit = (over) => ({
  id: over.slug,
  name: over.name,
  slug: over.slug,
  stack: 'next-netsuite',
  seats: 1,
  pricingHighlights: [{ highlight: 'Lifetime updates' }],
  ...over,
})

const catalogue = [
  kit({ slug: 'lite', name: 'Lite', tier: 'lite', price: 0 }),
  kit({
    slug: 'pro',
    name: 'Pro',
    tier: 'pro',
    price: 499,
    whopPlanId: 'plan_pro',
  }),
  kit({ slug: 'team', name: 'Team', tier: 'team', price: 999, seats: 5 }),
]

const tab = (name) => screen.getByRole('tab', { name })
const panel = () => screen.getByRole('tabpanel')
/* The panels cross-fade, so after a switch the new one exists only once the
   old one has left. */
const panelNamed = (name) => screen.findByRole('tabpanel', { name })

describe('Pricing tabs', () => {
  it('offers WareKits and Anti-Slop Alec as real tabs', () => {
    render(<Pricing kits={catalogue} />)
    const list = screen.getByRole('tablist', { name: /choose an offer/i })
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'WareKits',
      'Anti-Slop Alec',
    ])
    expect(panel()).toHaveAttribute(
      'aria-labelledby',
      tab('WareKits').getAttribute('id')
    )
  })

  it('opens on WareKits when a kit is published, and shows the tiers from the data', () => {
    render(<Pricing kits={catalogue} />)
    expect(tab('WareKits')).toHaveAttribute('aria-selected', 'true')
    const p = panel()
    expect(within(p).getByText('Free')).toBeInTheDocument()
    expect(within(p).getByText('$499')).toBeInTheDocument()
    expect(within(p).getByText('$999')).toBeInTheDocument()
    expect(within(p).getByText('5 developers')).toBeInTheDocument()
    expect(within(p).queryByText('Advisor')).toBeNull()
  })

  it('never puts a buy link on a tier with nothing to charge against', () => {
    render(<Pricing kits={catalogue} />)
    const p = panel()
    expect(
      within(p).getByRole('link', { name: /get it free/i })
    ).toHaveAttribute('href', '/products/lite')
    expect(
      within(p).getByRole('link', { name: /buy this kit/i })
    ).toHaveAttribute('href', '/products/pro')
    expect(within(p).getByText('In development')).toBeInTheDocument()
    expect(within(p).queryByRole('link', { name: /team/i })).toBeNull()
  })

  it('switches to the retainers on click', async () => {
    render(<Pricing kits={catalogue} />)
    fireEvent.click(tab('Anti-Slop Alec'))
    expect(tab('Anti-Slop Alec')).toHaveAttribute('aria-selected', 'true')
    const p = await panelNamed('Anti-Slop Alec')
    expect(within(p).getByText('Advisor')).toBeInTheDocument()
    expect(within(p).getByText('Fractional CTO')).toBeInTheDocument()
    expect(within(p).getByText('Embedded CTO')).toBeInTheDocument()
    // The retainers quote no figure; the scope is set on the call.
    expect(p).not.toHaveTextContent('$')
    expect(within(p).getByText('about 20-25 hrs a month')).toBeInTheDocument()
    expect(
      within(p).getByRole('link', { name: /compare engagements/i })
    ).toHaveAttribute('href', '/services')
    expect(within(p).queryByText('$499')).toBeNull()
  })

  it('moves between tabs with the arrow keys', () => {
    render(<Pricing kits={catalogue} />)
    fireEvent.keyDown(tab('WareKits'), { key: 'ArrowRight' })
    expect(tab('Anti-Slop Alec')).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tab('Anti-Slop Alec'), { key: 'ArrowRight' })
    expect(tab('WareKits')).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tab('WareKits'), { key: 'End' })
    expect(tab('Anti-Slop Alec')).toHaveAttribute('aria-selected', 'true')
  })

  it('opens on Anti-Slop Alec when no kit is published, and says why on the kit tab', async () => {
    render(<Pricing kits={[]} />)
    expect(tab('Anti-Slop Alec')).toHaveAttribute('aria-selected', 'true')
    expect(within(panel()).getByText('Advisor')).toBeInTheDocument()

    fireEvent.click(tab('WareKits'))
    const p = await panelNamed('WareKits')
    expect(within(p).getByText(/not on sale yet/i)).toBeInTheDocument()
    expect(
      within(p).getByRole('link', { name: /tell me when they are ready/i })
    ).toHaveAttribute('href', '/contact')
    expect(within(p).queryByText('Free')).toBeNull()
  })
})

describe('Pricing retainers and the free intro call', () => {
  const services = [
    {
      slug: 'fractional-cto',
      name: 'Fractional CTO',
      whopPlanId: 'plan_dep',
      depositAmount: 1500,
      bookingUrl: 'https://cal.com/amware/intro-call',
    },
  ]
  const cardButton = () => {
    const card = within(panel()).getByText('Fractional CTO').closest('li')
    return {
      card,
      book: within(card).getByRole('button', {
        name: 'Book a free intro call',
      }),
    }
  }

  it('books the free intro call on the engagement card, wrapped in its terms', () => {
    render(<Pricing kits={[]} services={services} />)
    const { card, book } = cardButton()
    // Only the tier with a booking link gets a card button.
    expect(
      within(panel()).getAllByRole('button', { name: 'Book a free intro call' })
    ).toHaveLength(1)
    const terms = within(card).getByRole('note', {
      name: 'What the intro call is',
    })
    expect(terms).toHaveTextContent('Start with a free 15-minute call.')
    expect(terms).toHaveTextContent('Free ebook included')
    expect(terms).toHaveTextContent('Turn Website Visitors Into Buyers')
    expect(within(terms).getByRole('list')).toHaveAccessibleName(
      'How you get the ebook'
    )
    expect(terms.compareDocumentPosition(book)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    const fine = within(card).getByText('Intro call · 15 min · free')
    expect(book.compareDocumentPosition(fine)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    // Both calls are free: no refund promise and no deposit line remain.
    expect(panel()).not.toHaveTextContent('Full refund')
    expect(panel()).not.toHaveTextContent('The deposit holds your start')
  })

  it('carries the selected engagement into the Cal.com popup', () => {
    render(<Pricing kits={[]} services={services} />)
    const { book } = cardButton()
    expect(book).toHaveAttribute('data-cal-link', 'amware/intro-call')
    expect(book).toHaveAttribute(
      'data-cal-namespace',
      'intro-call-fractional-cto'
    )
    expect(JSON.parse(book.getAttribute('data-cal-config')).notes).toBe(
      'Engagement: Fractional CTO'
    )
    fireEvent.click(book)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByTestId('embed')).toBeNull()
  })

  it('books the intro call without a standalone Whop plan', () => {
    render(
      <Pricing
        kits={[]}
        services={services.map((service) => ({ ...service, whopPlanId: null }))}
      />
    )
    expect(cardButton().book).toHaveAttribute(
      'data-cal-link',
      'amware/intro-call'
    )
  })

  it('takes a deposit on a retainer with a Whop plan and no booking link', () => {
    render(
      <Pricing
        kits={[]}
        services={services.map((service) => ({ ...service, bookingUrl: null }))}
      />
    )
    const card = within(panel()).getByText('Fractional CTO').closest('li')
    const terms = within(card).getByRole('note', { name: 'Deposit terms' })
    expect(terms).not.toHaveTextContent(/ebook/i)
    expect(
      within(card).getByRole('button', { name: /reserve your start/i })
    ).toBeInTheDocument()
    expect(
      within(card).queryByRole('button', { name: 'Book a free intro call' })
    ).toBeNull()
  })

  it('links to /services under the cards, with no call path', () => {
    render(<Pricing kits={[]} services={services} />)
    expect(
      within(panel()).getByRole('link', { name: /compare engagements/i })
    ).toHaveAttribute('href', '/services')
    expect(within(panel()).queryByText(/how it starts/i)).toBeNull()
  })

  it('shows no booking button when no service has a booking link', () => {
    render(<Pricing kits={[]} services={[]} />)
    // No card button without a link or a plan.
    for (const name of ['Advisor', 'Fractional CTO', 'Embedded CTO']) {
      const card = within(panel()).getByText(name).closest('li')
      expect(within(card).queryByRole('button')).toBeNull()
    }
    expect(
      within(panel()).queryByRole('link', { name: 'Book a free intro call' })
    ).toBeNull()
    expect(
      within(panel()).getByRole('link', { name: /compare engagements/i })
    ).toHaveAttribute('href', '/services')
  })
})

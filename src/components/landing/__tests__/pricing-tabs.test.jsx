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
    creemProductId: 'p',
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
    expect(within(p).getByText('Up to 5 collaborators')).toBeInTheDocument()
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
    expect(within(p).getByText('$7,500')).toBeInTheDocument()
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

describe('Pricing retainers and the deposit', () => {
  const services = [
    {
      slug: 'fractional-cto',
      name: 'Fractional CTO',
      whopPlanId: 'plan_dep',
      depositAmount: 1500,
      bookingUrl: 'https://cal.com/amware/on-demand-outcome',
    },
  ]

  it('opens the matching Cal.com booking on the engagement card', () => {
    render(<Pricing kits={[]} services={services} />)
    const p = panel()
    const buttons = within(p).getAllByRole('button', {
      name: /book your strategy call/i,
    })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent('$1,500')
    // It sits inside the Fractional CTO card, not beside another tier.
    const card = buttons[0].closest('li')
    expect(card).toHaveTextContent('Fractional CTO')
    const guarantee = within(card).getByRole('note', {
      name: /first call value and refund terms/i,
    })
    expect(guarantee).toHaveTextContent('Know what to fix next in 60 minutes.')
    expect(guarantee).toHaveTextContent(
      'You leave knowing your highest-priority technical risk and the next move to make.'
    )
    expect(guarantee).toHaveTextContent(
      'Free tool included: CTO Systems Audit Prompt'
    )
    expect(guarantee.compareDocumentPosition(buttons[0])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    const refund = within(card).getByText(
      'Full refund if we don’t work together.'
    )
    expect(buttons[0].compareDocumentPosition(refund)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(p).toHaveTextContent(
      'The deposit holds your start. After the intro call, it is either credited in full to month one or returned before work begins.'
    )
  })

  it('bypasses standalone Whop checkout and carries the selected engagement', () => {
    render(<Pricing kits={[]} services={services} />)
    const book = within(panel()).getByRole('button', {
      name: /book your strategy call/i,
    })
    expect(book).toHaveAttribute('data-cal-link', 'amware/on-demand-outcome')
    expect(book).toHaveAttribute(
      'data-cal-namespace',
      'on-demand-outcome-fractional-cto'
    )
    expect(JSON.parse(book.getAttribute('data-cal-config')).notes).toBe(
      'Engagement: Fractional CTO'
    )
    fireEvent.click(book)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByTestId('embed')).toBeNull()
  })

  it('allows Cal.com booking without a standalone Whop plan', () => {
    render(
      <Pricing
        kits={[]}
        services={services.map((service) => ({ ...service, whopPlanId: null }))}
      />
    )
    expect(
      within(panel()).getByRole('button', { name: /book your strategy call/i })
    ).toHaveAttribute('data-cal-link', 'amware/on-demand-outcome')
  })

  it('shows no deposit button when no service carries a plan', () => {
    render(<Pricing kits={[]} services={[]} />)
    expect(
      within(panel()).queryByRole('button', {
        name: /book your strategy call/i,
      })
    ).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('@/lib/commerce/creemCheckout', () => ({
  startCreemCheckout: vi.fn(async () => ({ error: null })),
}))
vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { FoundingTable } from '../standard/founding-table'
import { PRESALE } from '@/content/site/standard-presale'

const { cta } = PRESALE.founding

const ready = (tier, price) => ({
  state: 'ready',
  price,
  slug: `warekit-standard-${tier}`,
})
const planned = { state: 'planned', price: null, slug: null }
const presaleOf = (pro, team) => ({
  open: pro.state === 'ready' || team.state === 'ready',
  pro,
  team,
})

const both = presaleOf(ready('pro', 149), ready('team', 299))
const closed = presaleOf(planned, planned)

/* The wide table holds every plan at once; the one-plan layout repeats the
   same actions, so the assertions read the table. */
const column = (id) =>
  screen.getByTestId('compare-table').querySelector(`[data-plan-col="${id}"]`)
const livePrice = (id) =>
  column(id).querySelector('[data-price-live]').textContent
const struck = (id) => column(id).querySelector('s')?.textContent ?? null
const forms = () => document.querySelectorAll('form')

describe('FoundingTable', () => {
  it('sells both tiers at the row’s price, to two decimals', () => {
    render(<FoundingTable presale={both} />)
    expect(livePrice('pro')).toBe('149.00')
    expect(livePrice('team')).toBe('299.00')
    expect(struck('pro')).toContain('299.00')
    expect(struck('team')).toContain('599.00')
    expect(
      within(column('pro')).getByRole('button', { name: cta.pro })
    ).toHaveAttribute('type', 'submit')
    expect(
      within(column('team')).getByRole('button', { name: cta.team })
    ).toHaveAttribute('type', 'submit')
    expect(column('lite').querySelector('form')).toBeNull()
    /* Each plan is drawn in both layouts: two buy buttons, twice. */
    expect(forms()).toHaveLength(4)
    const slugs = [...forms()].map(
      (form) => form.querySelector('input[name="slug"]').value
    )
    expect(slugs.sort()).toEqual([
      'warekit-standard-pro',
      'warekit-standard-pro',
      'warekit-standard-team',
      'warekit-standard-team',
    ])
  })

  it('follows a price Alec has raised', () => {
    render(<FoundingTable presale={presaleOf(ready('pro', 199), planned)} />)
    expect(livePrice('pro')).toBe('199.00')
    expect(struck('pro')).toContain('299.00')
  })

  it('strikes nothing once the founding price reaches the regular one', () => {
    render(
      <FoundingTable
        presale={presaleOf(ready('pro', 299), ready('team', 649))}
      />
    )
    expect(livePrice('pro')).toBe('299.00')
    expect(livePrice('team')).toBe('649.00')
    expect(struck('pro')).toBeNull()
    expect(struck('team')).toBeNull()
  })

  it('offers the waitlist for a tier that is not on sale', () => {
    render(<FoundingTable presale={presaleOf(ready('pro', 149), planned)} />)
    expect(
      within(column('team')).getByRole('link', { name: cta.waitlist })
    ).toHaveAttribute('href', '#st-join')
    expect(column('team').querySelector('form')).toBeNull()
    expect(livePrice('team')).toBe('299.00')
    expect(
      within(column('pro')).getByRole('button', { name: cta.pro })
    ).toBeInTheDocument()
  })

  it('offers only the waitlist when the presale is closed, at the approved prices', () => {
    render(<FoundingTable presale={closed} />)
    expect(forms()).toHaveLength(0)
    for (const id of ['pro', 'team']) {
      expect(
        within(column(id)).getByRole('link', { name: cta.waitlist })
      ).toHaveAttribute('href', '#st-join')
    }
    expect(livePrice('pro')).toBe('149.00')
    expect(livePrice('team')).toBe('299.00')
    expect(struck('pro')).toContain('299.00')
    expect(struck('team')).toContain('599.00')
    /* Nothing would receive an answer, so the question is not asked. */
    expect(
      screen.queryByRole('group', { name: PRESALE.founding.building.label })
    ).not.toBeInTheDocument()
  })

  it('passes the chosen answer to both checkouts, and none by default', () => {
    render(<FoundingTable presale={both} />)
    const question = screen.getByRole('group', {
      name: PRESALE.founding.building.label,
    })
    expect(question).toHaveTextContent(PRESALE.founding.building.hint)
    const radios = within(question).getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(radios.every((radio) => !radio.checked)).toBe(true)
    expect(new Set(radios.map((radio) => radio.id)).size).toBe(4)
    expect(document.querySelectorAll('input[name="building"]')).toHaveLength(0)

    fireEvent.click(within(question).getByLabelText('A SaaS for teams'))
    const answers = [...forms()].map(
      (form) => form.querySelector('input[name="building"]')?.value
    )
    expect(answers).toEqual([
      'team-saas',
      'team-saas',
      'team-saas',
      'team-saas',
    ])
  })

  it('never offers Lite a checkout', () => {
    for (const presale of [
      both,
      closed,
      presaleOf(ready('pro', 149), planned),
    ]) {
      const view = render(<FoundingTable presale={presale} />)
      expect(column('lite').querySelector('form')).toBeNull()
      expect(livePrice('lite')).toBe('0.00')
      expect(struck('lite')).toBeNull()
      view.unmount()
    }

    /* While the waitlist is on the page, Lite points at it, and says so:
       the form it lands on sends one email when the presale opens. */
    for (const presale of [closed, presaleOf(ready('pro', 149), planned)]) {
      const view = render(<FoundingTable presale={presale} />)
      expect(
        within(column('lite')).getByRole('link', { name: cta.waitlist })
      ).toHaveAttribute('href', '#st-join')
      expect(
        within(column('lite')).queryByText(cta.lite)
      ).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('sends Lite nowhere once both tiers are on sale and the waitlist is gone', () => {
    render(<FoundingTable presale={both} />)
    expect(within(column('lite')).queryByRole('link')).not.toBeInTheDocument()
  })
})

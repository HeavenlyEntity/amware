import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* The plan comparison: a price switch, a wide table and, below `lg`, one plan
   at a time. Both layouts are in the DOM (Tailwind hides one of them at each
   width), so a plan's figures appear twice here. The site's reduced-motion
   hook is mocked; `firstRender`, when set, plays its first-render value. */

const env = vi.hoisted(() => ({ reduced: false, firstRender: undefined }))
vi.mock('@/components/AccessibilityProvider', async () => {
  const { useEffect, useState } = await import('react')
  return {
    useReducedMotion: () => {
      const [value, setValue] = useState(() =>
        env.firstRender === undefined ? env.reduced : env.firstRender
      )
      useEffect(() => setValue(env.reduced), [])
      return value
    },
  }
})

import { PricingCompare } from '@/components/blocks/pricing-15'
import { PRESALE } from '@/content/site/standard-presale'

const RealObserver = globalThis.IntersectionObserver
afterEach(() => {
  env.reduced = false
  env.firstRender = undefined
  globalThis.IntersectionObserver = RealObserver
})

const plans = [
  { id: 'lite', name: 'Lite', description: 'Free one.', price: '0.00' },
  {
    id: 'pro',
    name: 'Pro',
    description: 'The middle one.',
    price: '149.00',
    altPrice: '299.00',
    featured: true,
    badge: 'Recommended',
  },
  {
    id: 'team',
    name: 'Team',
    description: 'The big one.',
    price: '299.00',
    altPrice: '599.00',
  },
]

const groups = [
  {
    title: 'The kit',
    rows: [
      { label: 'Seats', values: ['1', '1', '5'] },
      { label: 'Billing', values: [false, true, true] },
    ],
  },
]

const toggle = {
  off: 'After launch',
  on: 'Founding',
  badge: 'Half price',
  label: 'Show the founding price',
}

const action = (plan) => <a href={`/buy/${plan.id}`}>Buy {plan.name}</a>

const live = (container) =>
  Array.from(container.querySelectorAll('[data-price-live]')).map(
    (node) => node.textContent
  )

const setup = (props = {}) =>
  render(
    <PricingCompare
      plans={plans}
      groups={groups}
      toggle={toggle}
      strike
      unit="one time"
      renderAction={action}
      {...props}
    />
  )

describe('PricingCompare', () => {
  it('shows the live price with the other struck through', () => {
    const { container } = setup()
    // Wide table: three plans. One-plan layout: the featured plan.
    expect(live(container)).toContain('149.00')
    const struck = Array.from(container.querySelectorAll('s')).map(
      (node) => node.textContent
    )
    expect(struck.some((text) => text.includes('299.00'))).toBe(true)
    expect(struck.some((text) => text.includes('599.00'))).toBe(true)
    // A struck figure is never also the live one.
    container.querySelectorAll('s').forEach((node) => {
      expect(node.querySelector('[data-price-live]')).toBeNull()
    })
    expect(screen.getAllByText('one time').length).toBeGreaterThan(0)
  })

  it('flips every plan to its other price from the switch', () => {
    const { container } = setup()
    const control = screen.getByRole('switch', {
      name: 'Show the founding price',
    })
    // A native button: the browser turns Space and Enter into this click.
    expect(control.tagName).toBe('BUTTON')
    expect(control).toHaveAttribute('type', 'button')
    expect(control).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', 'false')
    const prices = live(container)
    expect(prices).toContain('299.00')
    expect(prices).toContain('599.00')
    expect(prices).not.toContain('149.00')
    // While off, nothing is struck through.
    expect(container.querySelectorAll('s')).toHaveLength(0)

    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', 'true')
    expect(live(container)).toContain('149.00')
  })

  it('keeps a plan with no other price steady', () => {
    const { container } = setup()
    const liteCol = container.querySelector('[data-plan-col="lite"]')
    expect(liteCol.querySelector('[data-price-live]').textContent).toBe('0.00')
    expect(liteCol.querySelector('s')).toBeNull()
    fireEvent.click(screen.getByRole('switch'))
    expect(
      container.querySelector('[data-plan-col="lite"] [data-price-live]')
        .textContent
    ).toBe('0.00')
  })

  it('reads a tick and a dash aloud', () => {
    setup()
    const wide = screen.getByTestId('compare-table')
    // Wide table, Billing row: a dash, then two ticks.
    expect(within(wide).getAllByText('Included')).toHaveLength(2)
    expect(within(wide).getAllByText('Not included')).toHaveLength(1)
    expect(within(wide).getByText('5')).toBeInTheDocument()
    // One-plan layout: the panel on show is Pro's, with its one tick.
    const panel = screen
      .getAllByTestId('compare-panel')
      .find((node) => !node.hidden)
    expect(within(panel).getAllByText('Included')).toHaveLength(1)
    expect(within(panel).queryByText('Not included')).toBeNull()
  })

  it("asks the page for each plan's action", () => {
    const renderAction = vi.fn(action)
    setup({ renderAction })
    const wide = screen.getByTestId('compare-table')
    const narrow = screen.getByTestId('compare-panels')
    for (const plan of plans) {
      const calls = renderAction.mock.calls.filter(([p]) => p.id === plan.id)
      expect(calls).toHaveLength(2)
      expect(calls[0][0]).toBe(plan)
      // Once in each layout.
      expect(
        within(wide).getByRole('link', { name: `Buy ${plan.name}` })
      ).toHaveAttribute('href', `/buy/${plan.id}`)
      expect(
        within(narrow).getAllByText(`Buy ${plan.name}`, { selector: 'a' })
      ).toHaveLength(1)
    }
    // Only the chosen plan's panel is exposed in the one-plan layout.
    expect(
      within(narrow)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Buy Pro'])

    fireEvent.click(within(narrow).getByRole('button', { name: 'Team' }))
    expect(
      within(narrow)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Buy Team'])
    expect(
      within(narrow).getByRole('button', { name: 'Team' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the featured plan', () => {
    const { container } = setup()
    const featured = container.querySelectorAll(
      '[data-plan-col][data-featured]'
    )
    expect(featured).toHaveLength(1)
    expect(featured[0]).toHaveAttribute('data-plan-col', 'pro')
    expect(within(featured[0]).getByText('Recommended')).toBeInTheDocument()
    // No plan gets a badge it was not given.
    expect(
      within(container.querySelector('[data-plan-col="team"]')).queryByText(
        /popular|recommended/i
      )
    ).toBeNull()
    // The one-plan layout opens on the featured plan.
    expect(
      within(screen.getByTestId('compare-panels')).getByRole('button', {
        name: 'Pro',
      })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders no demo copy and no switch without a toggle', () => {
    const { container } = render(
      <PricingCompare plans={plans.slice(0, 1)} groups={[]} />
    )
    expect(screen.queryByRole('switch')).toBeNull()
    expect(container.textContent).not.toMatch(/popular|per seat|\/mo/i)
  })

  it('waits hidden below the fold once the hook settles on "not reduced"', async () => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    env.firstRender = true
    const { container } = setup()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const parts = container.querySelectorAll('[data-compare-part]')
    expect(parts.length).toBeGreaterThan(0)
    parts.forEach((part) => expect(part.style.opacity).toBe('0'))
  })

  it('never starts hidden when motion is reduced', () => {
    env.reduced = true
    const { container } = setup()
    const parts = container.querySelectorAll('[data-compare-part]')
    expect(parts.length).toBeGreaterThan(0)
    parts.forEach((part) => expect(part.style.opacity).not.toBe('0'))
  })

  it('tells a screen reader which price is charged', () => {
    const founding = PRESALE.founding
    const { on, off } = founding.toggle
    const prices = {
      lite: { price: '0.00' },
      pro: { price: '149.00', altPrice: '299.00' },
      team: { price: '299.00', altPrice: '599.00' },
    }
    const { container } = render(
      <PricingCompare
        plans={founding.plans.map((plan) => ({ ...plan, ...prices[plan.id] }))}
        groups={founding.groups}
        toggle={founding.toggle}
        unit={founding.unit}
        strike
      />
    )
    // The text left once everything hidden from assistive tech is removed.
    const spoken = (id) => {
      const block = container
        .querySelector(`[data-plan-col="${id}"] [data-price]`)
        .cloneNode(true)
      block.querySelectorAll('[aria-hidden="true"]').forEach((node) => {
        node.remove()
      })
      return block.textContent.replace(/\s+/g, ' ').trim()
    }

    expect(spoken('pro')).toBe(`${on}: $149.00${off}: $299.00${founding.unit}`)
    expect(spoken('lite')).toBe(`$0.00${founding.unit}`)

    fireEvent.click(screen.getByRole('switch'))
    expect(spoken('pro')).toBe(`${off}: $299.00${founding.unit}`)
    expect(spoken('lite')).toBe(`$0.00${founding.unit}`)
    expect(container.querySelector('[data-plan-col="lite"] s')).toBeNull()
  })

  it('draws every field of the founding terms', () => {
    const founding = PRESALE.founding
    const prices = {
      lite: { price: '0.00' },
      pro: { price: '149.00', altPrice: '299.00' },
      team: { price: '299.00', altPrice: '599.00' },
    }
    const withPrices = founding.plans.map((plan) => ({
      ...plan,
      ...prices[plan.id],
    }))
    const renderAction = vi.fn((plan) => <span>{founding.cta[plan.id]}</span>)
    const { container } = render(
      <PricingCompare
        plans={withPrices}
        groups={founding.groups}
        toggle={founding.toggle}
        unit={founding.unit}
        corner={founding.corner}
        note={founding.note}
        strike
        renderAction={renderAction}
      />
    )
    const texts = [
      founding.toggle.off,
      founding.toggle.on,
      founding.toggle.badge,
      founding.unit,
      founding.corner,
      founding.note,
    ]
    for (const plan of founding.plans) {
      texts.push(plan.name, plan.description, founding.cta[plan.id])
      if (plan.badge) texts.push(plan.badge)
    }
    for (const group of founding.groups) {
      texts.push(group.title)
      for (const row of group.rows) {
        texts.push(row.label)
        for (const value of row.values) {
          if (typeof value === 'string') texts.push(value)
        }
      }
    }
    for (const text of texts) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0)
    }
    expect(
      screen.getByRole('switch', { name: founding.toggle.label })
    ).toBeInTheDocument()
    const table = screen.getByTestId('compare-table')
    const ticks = founding.groups
      .flatMap((group) => group.rows)
      .flatMap((row) => row.values)
    expect(within(table).getAllByText('Included')).toHaveLength(
      ticks.filter((value) => value === true).length
    )
    expect(within(table).getAllByText('Not included')).toHaveLength(
      ticks.filter((value) => value === false).length
    )
    expect(
      container.querySelector('[data-plan-col][data-featured]')
    ).toHaveAttribute('data-plan-col', 'pro')
    expect(renderAction).toHaveBeenCalledTimes(founding.plans.length * 2)
  })
})

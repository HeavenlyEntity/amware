import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'

/* The roadmap timeline: one column per quarter, a rail with a "today" pin on
   the column marked today, and items marked by state. Reduced motion is the
   site's hook, so it is mocked here. That hook returns true on the server
   and on the first client render, and only then settles on the reader's
   setting; `firstRender`, when set, plays that first value. */

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

/* The setup's IntersectionObserver reports everything in view at once. A
   list below the fold is never reported, which this one plays. */
const RealObserver = globalThis.IntersectionObserver
const belowTheFold = () => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

afterEach(() => {
  env.reduced = false
  env.firstRender = undefined
  globalThis.IntersectionObserver = RealObserver
})

import { RoadmapTimeline } from '@/components/blocks/timeline-2'
import { PRESALE } from '@/content/site/standard-presale'

const quarters = [
  {
    label: 'Phase A',
    caption: 'First caption.',
    fill: 1,
    items: [
      { title: 'Shipped thing', status: 'Done', state: 'shipped' },
      { title: 'Other shipped thing', status: 'Done too', state: 'shipped' },
    ],
    icons: [{ label: 'Alpha', icon: 'alpha' }],
  },
  {
    label: 'Phase B',
    fill: 0.5,
    today: true,
    items: [{ title: 'Active thing', status: 'Doing', state: 'active' }],
  },
  {
    label: 'Phase C',
    fill: 0,
    items: [{ title: 'Planned thing', status: 'Later', state: 'planned' }],
  },
]

const columns = (container) =>
  Array.from(container.querySelectorAll('ol[data-roadmap] > li'))

describe('RoadmapTimeline', () => {
  it('draws one column per quarter with its items', () => {
    const { container } = render(<RoadmapTimeline quarters={quarters} />)
    const cols = columns(container)
    expect(cols).toHaveLength(3)
    quarters.forEach((quarter, index) => {
      const col = cols[index]
      expect(within(col).getByRole('heading', { level: 3 })).toHaveTextContent(
        quarter.label
      )
      const titles = within(col)
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent)
      expect(titles).toEqual(quarter.items.map((item) => item.title))
      quarter.items.forEach((item) => {
        expect(within(col).getByText(item.status)).toBeInTheDocument()
      })
    })
    expect(within(cols[0]).getByText('First caption.')).toBeInTheDocument()
  })

  it('pins only the column marked today, with its label', () => {
    const { container } = render(
      <RoadmapTimeline quarters={quarters} todayLabel="Now" />
    )
    const pins = container.querySelectorAll('[data-roadmap-today]')
    expect(pins).toHaveLength(1)
    const cols = columns(container)
    expect(cols[1].contains(pins[0])).toBe(true)
    expect(pins[0]).toHaveTextContent('Now')
    expect(pins[0].style.left).toBe('50%')
    // The heading says so to a screen reader too.
    expect(
      within(cols[1]).getByRole('heading', { level: 3 })
    ).toHaveTextContent('Phase B, Now')
    expect(
      within(cols[0]).getByRole('heading', { level: 3 })
    ).not.toHaveTextContent('Now')
  })

  it('marks shipped and active items differently and offers no vote', () => {
    const { container } = render(<RoadmapTimeline quarters={quarters} />)
    expect(container.querySelectorAll('[data-mark="shipped"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-mark="active"]')).toHaveLength(1)
    const planned = container.querySelector('[data-item-state="planned"]')
    expect(planned.querySelector('[data-mark]')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it("renders a column's icons through renderIcon", () => {
    const renderIcon = vi.fn((icon) => <svg data-testid={`icon-${icon}`} />)
    render(<RoadmapTimeline quarters={quarters} renderIcon={renderIcon} />)
    expect(renderIcon).toHaveBeenCalledWith('alpha')
    expect(screen.getByTestId('icon-alpha')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Alpha' })).toContainElement(
      screen.getByTestId('icon-alpha')
    )
  })

  it('renders nothing it was not given', () => {
    const { container } = render(<RoadmapTimeline quarters={[]} />)
    expect(columns(container)).toHaveLength(0)
    expect(container.textContent).toBe('')
  })

  it('shows every fill and pin at once when motion is reduced', () => {
    env.reduced = true
    const { container } = render(<RoadmapTimeline quarters={quarters} />)
    const fills = container.querySelectorAll('[data-roadmap-fill]')
    expect(fills).toHaveLength(3)
    expect(fills[0].style.transform).not.toMatch(/scaleX\(0\)/)
    expect(
      container.querySelector('[data-roadmap-today]').style.opacity
    ).not.toBe('0')
    container.querySelectorAll('[data-item-state]').forEach((item) => {
      expect(item.style.opacity).not.toBe('0')
    })
  })

  it('waits hidden below the fold once the hook settles on "not reduced"', async () => {
    belowTheFold()
    env.firstRender = true
    env.reduced = false
    const { container } = render(<RoadmapTimeline quarters={quarters} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const items = container.querySelectorAll('[data-item-state]')
    expect(items).toHaveLength(4)
    items.forEach((item) => expect(item.style.opacity).toBe('0'))
    expect(container.querySelector('[data-roadmap-today]').style.opacity).toBe(
      '0'
    )
  })

  it('draws every field of the Standard waves', () => {
    const { columns: waves, pin } = PRESALE.waves
    const renderIcon = vi.fn((icon) => <svg data-icon={icon} />)
    const { container } = render(
      <RoadmapTimeline
        quarters={waves}
        todayLabel={pin}
        renderIcon={renderIcon}
      />
    )
    const cols = columns(container)
    expect(cols).toHaveLength(waves.length)
    waves.forEach((wave, index) => {
      const col = cols[index]
      expect(within(col).getByText(wave.label, { exact: false })).toBeTruthy()
      if (wave.caption) {
        expect(within(col).getByText(wave.caption)).toBeInTheDocument()
      }
      for (const item of wave.items) {
        expect(
          within(col).getByRole('heading', { level: 4, name: item.title })
        ).toBeInTheDocument()
        expect(within(col).getAllByText(item.status).length).toBeGreaterThan(0)
        expect(
          within(col)
            .getByRole('heading', { level: 4, name: item.title })
            .closest('[data-item-state]')
        ).toHaveAttribute('data-item-state', item.state)
      }
      for (const icon of wave.icons ?? []) {
        expect(renderIcon).toHaveBeenCalledWith(icon.icon)
        expect(
          within(col).getByRole('img', { name: icon.label })
        ).toBeInTheDocument()
        expect(col.querySelector(`[data-icon="${icon.icon}"]`)).not.toBeNull()
      }
    })
    const todayIndex = waves.findIndex((wave) => wave.today)
    const pins = container.querySelectorAll('[data-roadmap-today]')
    expect(pins).toHaveLength(1)
    expect(cols[todayIndex].contains(pins[0])).toBe(true)
    expect(pins[0]).toHaveTextContent(pin)
    expect(container.querySelectorAll('[data-dot-on]')).toHaveLength(
      waves.filter((wave) => wave.fill > 0).length
    )
  })
})

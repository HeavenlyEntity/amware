import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/* The steps rail: one list item per step, each with an artifact card drawn
   from data. Reduced motion is the site's hook, so it is mocked here. */

const env = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))

import { StepsRail } from '@/components/blocks/how-it-works-10'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'

const kinds = [
  {
    day: 'Day 1',
    effort: 'About 10 minutes',
    title: 'Progress step',
    body: 'Progress body.',
    artifact: {
      kind: 'progress',
      title: 'Progress card',
      done: 'Delivered',
      figures: [{ label: 'Format', value: 'Written' }],
    },
  },
  {
    day: 'Day 2',
    effort: 'About 5 minutes',
    title: 'Rows step',
    body: 'Rows body.',
    artifact: {
      kind: 'rows',
      title: 'Rows card',
      meta: '3 items',
      rows: [
        { mark: '01', name: 'First row', role: 'Role one', done: 'Covered' },
        { name: 'Second row', tag: 'Next' },
      ],
    },
  },
  {
    day: 'Day 3',
    title: 'Outline step',
    body: 'Outline body.',
    artifact: {
      kind: 'outline',
      title: 'Outline card',
      sub: 'Outline sub',
      sections: [
        { label: 'Your problems', state: 'done' },
        { label: 'Biggest risk', state: 'doing' },
        { label: 'Next step', state: 'todo' },
      ],
      foot: 'Outline foot',
    },
  },
  {
    day: 'Day 4',
    effort: '60 min',
    title: 'Meter step',
    body: 'Meter body.',
    artifact: {
      kind: 'meter',
      title: 'Meter card',
      sub: 'Meter sub',
      badge: 'In progress',
      meterLabel: 'Places read',
      meterValue: '5 of 8',
      pct: 62.5,
      figures: [{ label: 'Places', value: '8' }],
    },
  },
]

function railItems(container) {
  return Array.from(container.querySelectorAll('ol[data-steps-rail] > li'))
}

describe('StepsRail', () => {
  it('renders one list item per step, with its title, body and when', () => {
    env.reduced = false
    const { container } = render(<StepsRail steps={kinds} />)
    const items = screen
      .getAllByRole('listitem')
      .filter((item) => item.parentElement?.matches('ol[data-steps-rail]'))
    expect(items).toHaveLength(4)
    expect(railItems(container)).toHaveLength(4)

    kinds.forEach((step, index) => {
      const item = items[index]
      expect(
        within(item).getByRole('heading', { level: 3, name: step.title })
      ).toBeInTheDocument()
      expect(within(item).getByText(step.body)).toBeInTheDocument()
      expect(within(item).getAllByText(step.day).length).toBeGreaterThan(0)
    })
    expect(
      within(items[0]).getByText('Day 1 · About 10 minutes')
    ).toBeInTheDocument()
    // No effort: the desktop column and the folded line both show the day alone.
    expect(within(items[2]).getAllByText('Day 3')).toHaveLength(2)
  })

  it('draws each artifact kind from data', () => {
    env.reduced = false
    const { container } = render(<StepsRail steps={kinds} />)
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('Covered')).toBeInTheDocument()
    expect(screen.getByText('Biggest risk')).toBeInTheDocument()
    expect(screen.getByText('5 of 8')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()

    const fill = container.querySelector('[data-meter-fill]')
    expect(fill).not.toBeNull()
    expect(fill.style.width).toBe('62.5%')
  })

  it('ships no stock portraits', () => {
    env.reduced = false
    const { container } = render(<StepsRail steps={kinds} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('unsplash')
  })

  it('shows every artifact when motion is reduced', () => {
    env.reduced = true
    const { container } = render(<StepsRail steps={kinds} />)
    const wrappers = container.querySelectorAll('[data-rail-artifact]')
    expect(wrappers).toHaveLength(4)
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.opacity).not.toBe('0')
    })
    const fills = container.querySelectorAll('[data-rail-fill]')
    expect(fills.length).toBeGreaterThan(0)
    fills.forEach((fill) => {
      expect(fill.style.transform).not.toMatch(/scale(Y)?\(0\)/)
    })
    env.reduced = false
  })

  it('draws every field of the Diagnostic steps', () => {
    env.reduced = false
    const { steps } = DIAGNOSTIC.start
    const { container } = render(<StepsRail steps={steps} />)
    expect(railItems(container)).toHaveLength(steps.length)

    const texts = []
    for (const step of steps) {
      texts.push(step.title, step.body)
      const { artifact } = step
      for (const key of [
        'title',
        'meta',
        'sub',
        'foot',
        'done',
        'badge',
        'meterLabel',
        'meterValue',
      ]) {
        if (artifact[key]) texts.push(artifact[key])
      }
      for (const figure of artifact.figures ?? []) {
        texts.push(figure.label, figure.value)
      }
      for (const row of artifact.rows ?? []) {
        for (const key of ['mark', 'name', 'role', 'done', 'tag']) {
          if (row[key]) texts.push(row[key])
        }
      }
      for (const section of artifact.sections ?? []) texts.push(section.label)
    }
    for (const text of texts) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0)
    }
    for (const step of steps) {
      expect(
        screen.getAllByText(`${step.day} · ${step.effort}`).length
      ).toBeGreaterThan(0)
    }
    expect(container.querySelector('[data-meter-fill]').style.width).toBe(
      '62.5%'
    )
    expect(
      container.querySelectorAll('[data-section-state="done"]')
    ).toHaveLength(2)
    expect(
      container.querySelectorAll('[data-section-state="doing"]')
    ).toHaveLength(1)
    expect(
      container.querySelectorAll('[data-section-state="todo"]')
    ).toHaveLength(1)
  })
})

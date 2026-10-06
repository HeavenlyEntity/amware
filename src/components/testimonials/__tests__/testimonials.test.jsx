import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const reduced = vi.hoisted(() => ({ current: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => reduced.current,
}))

import { BigTestimonial } from '../big-testimonial'
import { MasonryTestimonials } from '../masonry-testimonials'
import { masonryGridColsClass } from '../masonry-grid'
import { initials } from '../avatar'
import { servicesTestimonials } from '@/lib/testimonials/services-testimonials'

const live = servicesTestimonials({
  nodeEnv: 'production',
  vercelEnv: 'production',
})
const preview = servicesTestimonials({
  nodeEnv: 'production',
  vercelEnv: 'preview',
})

afterEach(() => {
  reduced.current = false
})

describe('BigTestimonial with the real testimonials', () => {
  it('features Mark in full and keeps the references out of the bento', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(
      screen.getByRole('region', { name: 'Testimonials' })
    ).toBeInTheDocument()
    expect(container.textContent).toContain(live.featured.quote)
    for (const name of [
      'Grace L.',
      'Mike Pryke',
      'Brian Meece',
      'John Boese',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText('Rebecca Sunda')).toBeNull()
    expect(screen.queryByText('Dewayne K.')).toBeNull()
  })

  it('shows initials, never photos, and no partner pill', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('MS')).toHaveAttribute('aria-hidden', 'true')
    expect(container.textContent).not.toMatch(/Orbit Inference/)
  })

  it('renders the featured quote as plain text under reduced motion', () => {
    reduced.current = true
    const { container } = render(<BigTestimonial {...live} />)
    const matches = screen.getAllByText(live.featured.quote)
    expect(matches).toHaveLength(1)
    expect(matches[0].tagName).toBe('P')
    expect(container.querySelector('.sr-only')).toBeNull()
  })
})

describe('BigTestimonial with placeholders (dev and preview)', () => {
  it("lays out the template's bento with its avatars and partner", () => {
    const { container } = render(<BigTestimonial {...preview} />)
    expect(
      screen.getByRole('link', { name: /Orbit Inference/ })
    ).toHaveAttribute('href', 'https://example.com')
    expect(container.querySelectorAll('img').length).toBe(5)
  })
})

describe('MasonryTestimonials', () => {
  it('renders nothing when the wall is empty', () => {
    const { container } = render(<MasonryTestimonials items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the employment references as references, Dewayne last', () => {
    render(<MasonryTestimonials items={live.wall} />)
    const figures = screen.getAllByRole('figure')
    expect(figures).toHaveLength(2)
    expect(figures[0]).toHaveTextContent('Rebecca Sunda')
    expect(figures[1]).toHaveTextContent('Dewayne K.')
    expect(
      screen.getByText('Former manager, IT asset management')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Former supervisor, RL Canning (Honeywell)')
    ).toBeInTheDocument()
  })

  it('lays the leftovers out without a lone card on the last row', () => {
    const { container } = render(<MasonryTestimonials items={preview.wall} />)
    expect(screen.getAllByRole('figure')).toHaveLength(4)
    expect(container.querySelector('.grid')).toHaveClass('xl:grid-cols-2')
  })
})

describe('masonryGridColsClass', () => {
  it.each([
    [1, 'grid-cols-1 sm:grid-cols-1'],
    [2, 'grid-cols-1 sm:grid-cols-2'],
    [3, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [4, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'],
    [5, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [6, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [7, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'],
    [8, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [9, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
  ])('%i cards → %s', (count, cls) => {
    expect(masonryGridColsClass(count)).toBe(cls)
  })
})

describe('initials', () => {
  it.each([
    ['Mark Schilling', 'MS'],
    ['Grace L.', 'GL'],
    ['Dewayne K.', 'DK'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

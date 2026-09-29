import { describe, expect, it, vi } from 'vitest'
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

describe('BigTestimonial with the real four', () => {
  it('features Mark in full and keeps the reference last', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(
      screen.getByRole('region', { name: 'Testimonials' })
    ).toBeInTheDocument()
    expect(container.textContent).toContain(live.featured.quote)
    const names = ['Grace L.', 'Mike Pryke', 'Dewayne K.'].map((n) =>
      screen.getByText(n)
    )
    expect(
      names[2].compareDocumentPosition(names[0]) &
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
    expect(
      screen.getByText('Former supervisor, RL Canning (Honeywell)')
    ).toBeInTheDocument()
  })

  it('shows initials, never photos, and no partner pill', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('MS')).toHaveAttribute('aria-hidden', 'true')
    expect(container.textContent).not.toMatch(/Orbit Inference/)
  })

  it('renders the featured quote as plain text under reduced motion', () => {
    reduced.current = true
    render(<BigTestimonial {...live} />)
    expect(screen.getAllByText(live.featured.quote)).toHaveLength(1)
    reduced.current = false
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
    const { container } = render(<MasonryTestimonials items={live.wall} />)
    expect(container).toBeEmptyDOMElement()
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

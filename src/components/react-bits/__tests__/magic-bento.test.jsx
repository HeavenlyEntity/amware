import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* The bento grid for the presale's "what ships" section. The fixture is the
   committed tile data; reduced motion is the site's hook, mocked here. */

const env = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))

import { MagicBento } from '@/components/react-bits/magic-bento'
import { PRESALE } from '@/content/site/standard-presale'

const items = PRESALE.ships.items
const tile = (title) =>
  screen.getByRole('heading', { level: 3, name: title }).closest('[data-tile]')

describe('MagicBento', () => {
  it('renders a tile per item with its label, title and description', () => {
    env.reduced = false
    const { container } = render(<MagicBento items={items} />)
    expect(container.querySelectorAll('[data-tile]')).toHaveLength(items.length)
    for (const item of items) {
      const card = tile(item.title)
      expect(card).toHaveTextContent(item.label)
      expect(card).toHaveTextContent(item.description)
    }
  })

  it('spans a tile across columns and rows', () => {
    env.reduced = false
    render(<MagicBento items={items} />)
    const wide = items.find((item) => item.colSpan === 2)
    const tall = items.find((item) => item.rowSpan === 2)
    const single = items.find((item) => !item.colSpan && !item.rowSpan)
    expect(tile(wide.title)).toHaveStyle({ gridColumn: 'span 2' })
    expect(tile(tall.title)).toHaveStyle({ gridRow: 'span 2' })
    expect(tile(single.title)).toHaveStyle({
      gridColumn: 'span 1',
      gridRow: 'span 1',
    })
  })

  it('renders nothing built in when a tile has no visual', () => {
    env.reduced = false
    const { container } = render(
      <MagicBento
        items={[
          { id: 'bare', label: '/bare', title: 'Bare.', description: 'Text.' },
          {
            id: 'drawn',
            label: '/drawn',
            title: 'Drawn.',
            description: 'Text.',
            visual: <span data-testid="drawn-visual" />,
          },
        ]}
      />
    )
    expect(tile('Bare.').querySelector('[data-visual]')).toBeNull()
    expect(tile('Bare.').querySelector('svg, img, canvas')).toBeNull()
    expect(tile('Drawn.').querySelector('[data-visual]')).toContainElement(
      screen.getByTestId('drawn-visual')
    )
    expect(container.querySelectorAll('[data-visual]')).toHaveLength(1)
  })

  it('does not track the pointer under reduced motion', () => {
    env.reduced = false
    const { unmount } = render(<MagicBento items={items} />)
    const moving = tile(items[0].title)
    fireEvent.pointerMove(moving, { clientX: 40, clientY: 30 })
    expect(moving.style.getPropertyValue('--mb-x')).not.toBe('')
    unmount()

    env.reduced = true
    render(<MagicBento items={items} />)
    const still = tile(items[0].title)
    fireEvent.pointerMove(still, { clientX: 40, clientY: 30 })
    expect(still.style.getPropertyValue('--mb-x')).toBe('')
    expect(still.style.getPropertyValue('--mb-y')).toBe('')
    expect(still).not.toHaveAttribute('data-active')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => false,
}))

import { OfferTabs } from '../offer-tabs'

/* The services board's grey solid pill is a look, not a different control:
   the same tabs, keys and ARIA as the homepage's accent version, which stays
   the default. */

const TABS = [
  { id: 'consulting', label: 'Consulting' },
  { id: 'technical', label: 'Build & support' },
]

function Harness({ variant }) {
  const [value, setValue] = useState('consulting')
  return (
    <OfferTabs
      id="t"
      tabs={TABS}
      value={value}
      onChange={setValue}
      label="Choose a track"
      variant={variant}
    />
  )
}

describe('OfferTabs variants', () => {
  it('keeps the accent look by default', () => {
    render(<Harness />)
    const list = screen.getByRole('tablist', { name: 'Choose a track' })
    expect(list).toHaveClass('amw-tabs')
    expect(list).not.toHaveClass('amw-tabs--solid')
  })

  it('draws the solid pill with the same keys and ARIA', () => {
    render(<Harness variant="solid" />)
    const list = screen.getByRole('tablist', { name: 'Choose a track' })
    expect(list).toHaveClass('amw-tabs', 'amw-tabs--solid')

    const first = screen.getByRole('tab', { name: 'Consulting' })
    const second = screen.getByRole('tab', { name: 'Build & support' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(first).toHaveAttribute('tabindex', '0')
    expect(second).toHaveAttribute('tabindex', '-1')
    expect(second).toHaveAttribute('aria-controls', 't-panel-technical')

    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(second).toHaveFocus()
    fireEvent.keyDown(second, { key: 'Home' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(first, { key: 'End' })
    expect(second).toHaveAttribute('aria-selected', 'true')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const reduced = vi.hoisted(() => ({ current: false }))
const globeProps = vi.hoisted(() => ({ current: null }))

vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => reduced.current,
}))
vi.mock('next/dynamic', () => ({
  default: () =>
    function GlobeStub(props) {
      globeProps.current = props
      return <div data-testid="globe" />
    },
}))

import { GlobeCard } from '../globe-card'

/* The globe is decoration that loads only near the viewport. It turns
   slowly, holds still under reduced motion, and carries no markers: the
   template pinned stock avatars to cities as if they were clients. */

describe('GlobeCard', () => {
  it('turns slowly, with no markers', async () => {
    reduced.current = false
    const { container } = render(<GlobeCard />)
    await screen.findByTestId('globe')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(globeProps.current.config.autoRotateSpeed).toBe(0.3)
    expect(globeProps.current.markers).toBeUndefined()
  })

  it('holds still under reduced motion', async () => {
    reduced.current = true
    render(<GlobeCard />)
    await screen.findByTestId('globe')
    expect(globeProps.current.config.autoRotateSpeed).toBe(0)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  AccessibilityProvider,
  MotionToggle,
} from '@/components/AccessibilityProvider'

/* The dither cursor is WebGL, which jsdom cannot run. */
vi.mock('next/dynamic', () => ({ default: () => () => null }))

/* Only whether the hero asks the ring to turn is under test here. */
vi.mock('../rotating-cards', () => ({
  default: ({ autoPlay }) => (
    <div data-testid="project-ring" data-autoplay={String(autoPlay)} />
  ),
}))

import { Hero } from '../hero'

/* The hero has no pause link of its own. The project ring stops from the
   site-wide motion toggle in the footer, and that toggle is what
   keeps WCAG 2.2.2 (Pause, Stop, Hide) met on the homepage. */

const ring = () => screen.getByTestId('project-ring')

describe('Hero', () => {
  it('has no pause control of its own', () => {
    render(
      <AccessibilityProvider>
        <Hero />
      </AccessibilityProvider>
    )
    expect(
      screen.queryByRole('button', { name: /pause project animation/i })
    ).not.toBeInTheDocument()
  })

  it('stops the project ring from the site-wide motion toggle', () => {
    render(
      <AccessibilityProvider>
        <MotionToggle />
        <Hero />
      </AccessibilityProvider>
    )
    expect(ring()).toHaveAttribute('data-autoplay', 'true')
    fireEvent.click(
      screen.getByRole('button', { name: 'Pause continuous animations' })
    )
    expect(ring()).toHaveAttribute('data-autoplay', 'false')
  })
})

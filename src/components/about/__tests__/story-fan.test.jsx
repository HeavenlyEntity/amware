import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

/* Reduced motion on: the fan snaps instead of springing, so which card is
   in front can be asserted without waiting on animation frames. The arc
   geometry itself is Motion's business, not this test's. */
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => true,
}))

import { StoryFan } from '../story-fan'

const chapters = [
  { number: '01', title: 'First', copy: 'One.' },
  { number: '02', title: 'Second', copy: 'Two, a little longer.' },
  { number: '03', title: 'Third', copy: 'Three.' },
]

const fan = () => screen.getByRole('group', { name: /story/i })
const live = () => screen.getByText(/^Chapter \d of 3/)
const heading = (name) => within(fan()).getByRole('heading', { name })

describe('StoryFan', () => {
  it('raises the first chapter with its copy on the card, and announces it', () => {
    render(<StoryFan chapters={chapters} />)
    expect(heading('First')).toBeInTheDocument()
    expect(within(fan()).getByText('One.')).toBeInTheDocument()
    expect(live()).toHaveTextContent('Chapter 1 of 3: First')
    expect(screen.getByText('01 / 03')).toBeInTheDocument()
  })

  it('hides every card but the raised one from assistive tech', () => {
    render(<StoryFan chapters={chapters} />)
    // One exposed heading: the raised card. Side cards and the sizer are
    // aria-hidden.
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(within(fan()).queryByRole('heading', { name: 'Second' })).toBeNull()
  })

  it('moves the fan forward from the button', () => {
    render(<StoryFan chapters={chapters} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next chapter' }))
    expect(heading('Second')).toBeInTheDocument()
    expect(within(fan()).getByText('Two, a little longer.')).toBeInTheDocument()
    expect(live()).toHaveTextContent('Chapter 2 of 3: Second')
    expect(screen.getByText('02 / 03')).toBeInTheDocument()
  })

  it('moves back, wrapping from the first card to the last', () => {
    render(<StoryFan chapters={chapters} />)
    fireEvent.click(screen.getByRole('button', { name: 'Previous chapter' }))
    expect(heading('Third')).toBeInTheDocument()
    expect(live()).toHaveTextContent('Chapter 3 of 3: Third')
  })

  it('answers the keyboard on the fan itself', () => {
    render(<StoryFan chapters={chapters} />)
    fireEvent.keyDown(fan(), { key: 'ArrowRight' })
    expect(heading('Second')).toBeInTheDocument()
    fireEvent.keyDown(fan(), { key: 'ArrowLeft' })
    expect(heading('First')).toBeInTheDocument()
    fireEvent.keyDown(fan(), { key: ' ' })
    expect(heading('Second')).toBeInTheDocument()
  })

  it('sizes every card from the longest chapter, out of flow and unseen', () => {
    const { container } = render(<StoryFan chapters={chapters} />)
    const sizer = container.querySelector(
      '.invisible.absolute[aria-hidden="true"]'
    )
    expect(sizer).not.toBeNull()
    expect(sizer).toHaveTextContent('Two, a little longer.')
  })
})

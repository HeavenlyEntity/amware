import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* Reduced motion on, so turns are instant and the transforms can be read
   straight off the leaves. */
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => true,
}))

import PageFlip from '../page-flip'

const pages = [0, 1, 2].map((i) => ({
  id: `leaf-${i}`,
  front: <p>front {i}</p>,
  back: <p>back {i}</p>,
}))

const face = (text) => screen.getByText(text).closest('[class*="inset-0"]')

describe('PageFlip', () => {
  it('shows only the faces on the open spread to assistive tech', () => {
    render(<PageFlip pages={pages} page={1} endPage={<p>end</p>} />)
    expect(face('back 0')).not.toHaveAttribute('inert')
    expect(face('front 1')).not.toHaveAttribute('inert')
    expect(face('front 0')).toHaveAttribute('inert')
    expect(face('back 1')).toHaveAttribute('inert')
    expect(face('end')).toHaveAttribute('inert')
  })

  it('turns leaves before the open page and leaves the rest flat', () => {
    const { container } = render(<PageFlip pages={pages} page={2} />)
    const leaves = [...container.querySelectorAll('[style*="preserve-3d"]')]
    expect(leaves.map((leaf) => leaf.style.transform)).toEqual([
      'rotateY(-180deg)',
      'rotateY(-180deg)',
      'rotateY(0deg)',
    ])
    /* A turned leaf stacks above every flat one. */
    expect(Number(leaves[1].style.zIndex)).toBeGreaterThan(
      Number(leaves[2].style.zIndex)
    )
  })

  it('asks for the next and previous page through its hit areas', () => {
    const onPageChange = vi.fn()
    const { container } = render(
      <PageFlip pages={pages} page={1} onPageChange={onPageChange} />
    )
    const [prev, next] = container.querySelectorAll('button')
    fireEvent.click(next)
    fireEvent.click(prev)
    expect(onPageChange.mock.calls).toEqual([[2], [0]])
  })

  it('keeps its own page when uncontrolled, and stops at the last leaf', () => {
    const { container } = render(
      <PageFlip pages={pages} endPage={<p>end</p>} />
    )
    for (let i = 0; i < 3; i++)
      fireEvent.click(container.querySelector('button:last-of-type'))
    expect(face('end')).not.toHaveAttribute('inert')
    /* Only the previous-page hit area remains once the book is finished. */
    expect(container.querySelectorAll('button')).toHaveLength(1)
  })
})

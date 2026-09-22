import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextStep } from '../NextStep'

describe('NextStep', () => {
  it('offers Pro to a Lite member', () => {
    render(<NextStep tier="lite" />)
    expect(screen.getByRole('link', { name: /pro/i })).toHaveAttribute(
      'href',
      '/pricing'
    )
  })

  it('offers Team seats to a Pro buyer', () => {
    render(<NextStep tier="pro" />)
    // Not /team/i: both the heading and the body mention Team, and getByText
    // throws on more than one match.
    expect(screen.getByText(/working with a team/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /compare team/i })).toHaveAttribute(
      'href',
      '/pricing'
    )
  })

  it('offers implementation help to everyone, including Team', () => {
    render(<NextStep tier="team" />)
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute(
      'href',
      '/services'
    )
    expect(screen.queryByText(/upgrade to team/i)).toBeNull()
  })

  it('offers only implementation help when the purchase was not a kit', () => {
    render(<NextStep tier={null} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute(
      'href',
      '/services'
    )
    expect(screen.queryByText(/working with a team|built-out kit/i)).toBeNull()
  })
})

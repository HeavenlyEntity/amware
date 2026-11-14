import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HoursMeter, parseHours } from '../hours-meter'

const tone = { strong: '', soft: '' }

describe('parseHours', () => {
  it('reads a single figure and a range from the commitment text', () => {
    expect(parseHours('about 10 hrs a month')).toEqual({ low: 10, high: 10 })
    expect(parseHours('about 20 to 25 hrs a month')).toEqual({
      low: 20,
      high: 25,
    })
    expect(parseHours('about 35-40 hours a month')).toEqual({
      low: 35,
      high: 40,
    })
  })

  it('returns null unless the text names hours a month', () => {
    expect(parseHours('Near full-time')).toBeNull()
    expect(parseHours(undefined)).toBeNull()
    expect(parseHours('about 30 to 20 hrs a month')).toBeNull()
    expect(parseHours('about 10 hrs a week')).toBeNull()
    expect(parseHours('10 hrs')).toBeNull()
  })

  it('never reads a decimal as a whole number', () => {
    expect(parseHours('1.5 hrs a month')).toBeNull()
  })
})

describe('HoursMeter', () => {
  it('shows the hours as text and keeps the bar out of the accessibility tree', () => {
    const { container } = render(
      <HoursMeter commitment="about 20 to 25 hrs a month" tone={tone} />
    )
    expect(screen.getByText('20–25')).toBeInTheDocument()
    expect(container).toHaveTextContent('hrs a month')
    expect(container).not.toHaveTextContent(/week|full-time/i)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders nothing without hours', () => {
    const { container } = render(
      <HoursMeter commitment="Near full-time" tone={tone} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { BookingReward } from '../booking-reward'
import { BOOKED_EVENT } from '@/lib/booking-gifts'

/* The reward for booking: nothing until Cal.com confirms a booking, then the
   downloads that call earned. */

const book = (namespace) =>
  act(() => {
    window.dispatchEvent(
      new CustomEvent(BOOKED_EVENT, { detail: { namespace, uid: 'bk_1' } })
    )
  })

const downloads = () =>
  screen
    .queryAllByRole('link', { name: /download/i })
    .map((a) => a.getAttribute('href'))

describe('BookingReward', () => {
  it('shows nothing before a booking', () => {
    render(<BookingReward />)
    expect(downloads()).toEqual([])
  })

  it('hands over the ebook after a consulting intro call', () => {
    render(<BookingReward />)
    book('intro-call-fractional-cto')
    expect(
      screen.getByRole('heading', { name: 'Your free ebook' })
    ).toBeInTheDocument()
    expect(downloads()).toEqual([
      '/downloads/amware-turn-website-visitors-into-buyers-4e0774d13d6c.pdf',
    ])
  })

  it('hands over the checklist and the ebook after the build call', () => {
    render(<BookingReward />)
    book('build-intro-call-checklist')
    expect(downloads()).toEqual([
      '/downloads/amware-does-ai-name-your-business-d8ec7903f20f.pdf',
      '/downloads/amware-turn-website-visitors-into-buyers-4e0774d13d6c.pdf',
    ])
  })

  it('gives nothing for other bookings, and closes', () => {
    render(<BookingReward />)
    book('strategy-call-services')
    expect(downloads()).toEqual([])
    book('intro-call-services')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(downloads()).toEqual([])
  })
})

import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { GapExplorer, statusFor } from '../desk/gap-explorer'
import { deskLanding } from '@/lib/founders/desk-landing'

const { example } = deskLanding()
const { lo, hi, mid } = example.range

const slider = () =>
  screen.getByRole('slider', { name: /drag to try a different offer/i })
const pick = (name) => screen.getByRole('button', { name })

describe('GapExplorer', () => {
  it('starts at the worked example, below the band', () => {
    render(<GapExplorer example={example} />)
    expect(screen.getByText(`${example.offer}%`)).toBeInTheDocument()
    expect(
      screen.getByText(
        `${lo - example.offer}–${
          hi - example.offer
        } points below the band for this work`
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${lo - example.offer} pts short`)
    ).toBeInTheDocument()
  })

  it('says the value in words to assistive tech', () => {
    render(<GapExplorer example={example} />)
    expect(slider()).toHaveAttribute(
      'aria-valuetext',
      `${example.offer} percent offered`
    )
    expect(
      screen.getByRole('img', {
        name: `Benchmark band ${lo} to ${hi} percent; offered ${example.offer} percent.`,
      })
    ).toBeInTheDocument()
  })

  it('lands inside the band from the floor pick', () => {
    render(<GapExplorer example={example} />)
    fireEvent.click(pick(new RegExp(`^${lo}% · band floor`)))
    expect(
      screen.getByText(`Inside the ${example.classLabel} band for this work`)
    ).toBeInTheDocument()
    expect(screen.queryByText(/pts short/)).not.toBeInTheDocument()
    expect(pick(new RegExp(`^${lo}% · band floor`))).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('reads above the band as the equity holding up, with its own state', () => {
    render(<GapExplorer example={example} />)
    fireEvent.change(slider(), { target: { value: '20' } })
    const pill = screen.getByText(
      `${20 - hi} points above the band: the equity holds up`
    )
    expect(pill.closest('.amw-dk-status')).toHaveClass('amw-dk-status-above')
    expect(slider()).toHaveAttribute('aria-valuetext', '20 percent offered')
  })

  it('bursts once on entering the band, not on every step inside it', () => {
    const { container } = render(<GapExplorer example={example} />)
    expect(container.querySelector('.amw-dk-burst')).toBeNull()
    fireEvent.click(pick(new RegExp(`^${mid}% · mid-band`)))
    const first = container.querySelector('.amw-dk-burst')
    expect(first).not.toBeNull()
    fireEvent.change(slider(), { target: { value: String(mid + 0.5) } })
    expect(container.querySelector('.amw-dk-burst')).toBe(first)
  })

  it('stays silent until the reader moves it, then announces the verdict', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(<GapExplorer example={example} />)
      const live = container.querySelector('[aria-live="polite"]')
      act(() => vi.advanceTimersByTime(1000))
      expect(live).toHaveTextContent('')
      fireEvent.click(pick(new RegExp(`^${lo}% · band floor`)))
      act(() => vi.advanceTimersByTime(600))
      expect(live).toHaveTextContent(/inside the/i)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('statusFor', () => {
  const range = { lo: 8.5, hi: 15.5 }
  it('covers the three positions', () => {
    expect(statusFor(3, range, 'founding executive').tone).toBe('below')
    expect(statusFor(12, range, 'founding executive').tone).toBe('hit')
    expect(statusFor(20, range, 'founding executive').text).toBe(
      '4.5 points above the band: the equity holds up'
    )
  })
})

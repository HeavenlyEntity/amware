import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/commerce/creemCheckout', () => ({
  startCreemCheckout: vi.fn(),
}))
vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { startCreemCheckout } from '@/lib/commerce/creemCheckout'
import { whopTrack } from '@/lib/analytics/whop'
import { FoundingBuyButton } from '../standard/founding-buy-button'

const mount = (props = {}) =>
  render(
    <FoundingBuyButton
      slug="warekit-standard-pro"
      name="WareKit Standard Pro"
      price={199}
      {...props}
    >
      Reserve my seat
    </FoundingBuyButton>
  )

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /Reserve my seat/ }))

beforeEach(() => {
  vi.clearAllMocks()
  startCreemCheckout.mockResolvedValue({ error: null })
})

describe('FoundingBuyButton', () => {
  it('posts the slug and the answer', async () => {
    mount({ building: 'team-saas' })
    submit()
    await waitFor(() => expect(startCreemCheckout).toHaveBeenCalled())
    const form = startCreemCheckout.mock.calls[0][1]
    expect(form.get('slug')).toBe('warekit-standard-pro')
    expect(form.get('building')).toBe('team-saas')
  })

  it('posts no answer when none is picked', async () => {
    mount()
    submit()
    await waitFor(() => expect(startCreemCheckout).toHaveBeenCalled())
    const form = startCreemCheckout.mock.calls[0][1]
    expect(form.get('slug')).toBe('warekit-standard-pro')
    expect(form.has('building')).toBe(false)
  })

  it('reports begin_checkout once per submit', async () => {
    let release
    startCreemCheckout.mockImplementation(
      () => new Promise((resolve) => (release = resolve))
    )
    mount({ building: 'other' })
    submit()
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled())
    // A second click and a re-render while pending report nothing more.
    fireEvent.click(screen.getByRole('button'))
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(whopTrack).toHaveBeenCalledTimes(1)
    expect(whopTrack).toHaveBeenCalledWith('begin_checkout', {
      value: 199,
      currency: 'USD',
      content_type: 'product',
      content_id: 'warekit-standard-pro',
      content_name: 'WareKit Standard Pro',
    })
    release({ error: null })
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(whopTrack).toHaveBeenCalledTimes(2))
    // Settle the second submit so nothing is left pending for the next test.
    release({ error: null })
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
  })

  it('shows the server\u2019s error', async () => {
    startCreemCheckout.mockResolvedValue({
      error: { message: 'This item is not on sale yet.' },
    })
    mount()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This item is not on sale yet.'
    )
  })
})

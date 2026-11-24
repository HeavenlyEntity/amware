import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

/* Same reason as claim-free-kit.test.jsx: the action is stubbed so the
   component's states can be driven without Creem or the CMS. */
const action = vi.fn()
vi.mock('@/lib/commerce/creemCheckout', () => ({
  startCreemCheckout: (...args) => action(...args),
}))

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { whopTrack } from '@/lib/analytics/whop'
import { CreemBuyButton } from '../CreemBuyButton'

beforeEach(() => {
  vi.clearAllMocks()
  action.mockResolvedValue({ error: null })
})

describe('CreemBuyButton', () => {
  it('renders its label and posts the slug', () => {
    const { container } = render(
      <CreemBuyButton slug="guide" name="Guide" price={12}>
        Buy the guide
      </CreemBuyButton>
    )
    expect(
      screen.getByRole('button', { name: 'Buy the guide' })
    ).toBeInTheDocument()
    expect(container.querySelector('input[name="slug"]')).toHaveValue('guide')
  })

  it('reports begin_checkout on submit with the same fields BuyButton sends', () => {
    render(
      <CreemBuyButton slug="guide" name="Guide" price={12}>
        Buy now
      </CreemBuyButton>
    )
    fireEvent.submit(
      screen.getByRole('button', { name: 'Buy now' }).closest('form')
    )
    expect(whopTrack).toHaveBeenCalledWith('begin_checkout', {
      value: 12,
      currency: 'USD',
      content_type: 'product',
      content_id: 'guide',
      content_name: 'Guide',
    })
  })

  it('omits value when the price is unknown', () => {
    render(<CreemBuyButton slug="guide" name="Guide" />)
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(whopTrack.mock.calls[0][1].value).toBeUndefined()
  })

  it("shows the action's error inline", async () => {
    action.mockResolvedValue({ error: { message: 'Not on sale yet.' } })
    render(<CreemBuyButton slug="guide" name="Guide" price={12} />)
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not on sale yet.'
    )
  })

  it('spins in the knob while pending, and checks once the browser leaves', async () => {
    let finish
    action.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<CreemBuyButton slug="guide" name="Guide" price={12} />)
    fireEvent.submit(screen.getByRole('button').closest('form'))

    const button = await screen.findByRole('button', {
      name: 'Opening checkout…',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.amw-kit-spin')).not.toBeNull()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    const leaving = screen.getByRole('button', { name: 'Taking you to Creem' })
    expect(leaving.querySelector('.amw-kit-spin')).toBeNull()
    expect(leaving.querySelector('.amw-kit-pop')).not.toBeNull()

    await act(async () => finish({ error: null }))
  })
})

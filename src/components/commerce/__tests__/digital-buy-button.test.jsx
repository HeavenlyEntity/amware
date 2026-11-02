import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* Same reason as claim-free-kit.test.jsx: the action is stubbed so the
   component's states can be driven without Creem or the CMS. */
const action = vi.fn()
vi.mock('@/lib/commerce/digitalCheckout', () => ({
  startDigitalCheckout: (...args) => action(...args),
}))

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { whopTrack } from '@/lib/analytics/whop'
import { DigitalBuyButton } from '../DigitalBuyButton'

beforeEach(() => {
  vi.clearAllMocks()
  action.mockResolvedValue({ error: null })
})

describe('DigitalBuyButton', () => {
  it('renders its label and posts the slug', () => {
    const { container } = render(
      <DigitalBuyButton slug="guide" name="Guide" price={12}>
        Buy the guide
      </DigitalBuyButton>
    )
    expect(
      screen.getByRole('button', { name: 'Buy the guide' })
    ).toBeInTheDocument()
    expect(container.querySelector('input[name="slug"]')).toHaveValue('guide')
  })

  it('reports begin_checkout on submit with the same fields BuyButton sends', () => {
    render(
      <DigitalBuyButton slug="guide" name="Guide" price={12}>
        Buy now
      </DigitalBuyButton>
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
    render(<DigitalBuyButton slug="guide" name="Guide" />)
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(whopTrack.mock.calls[0][1].value).toBeUndefined()
  })

  it("shows the action's error inline", async () => {
    action.mockResolvedValue({ error: { message: 'Not on sale yet.' } })
    render(<DigitalBuyButton slug="guide" name="Guide" price={12} />)
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not on sale yet.'
    )
  })
})

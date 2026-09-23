import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let checkoutProps
vi.mock('../WhopCheckout', () => ({
  WhopCheckout: (props) => {
    checkoutProps = props
    return <div data-testid="checkout" data-plan={props.planId} />
  },
}))

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { whopTrack, WHOP_EVENT } from '@/lib/analytics/whop'
import { BuyButton } from '../BuyButton'

beforeEach(() => {
  vi.clearAllMocks()
  checkoutProps = undefined
})

describe('BuyButton', () => {
  it('renders the Whop Elements checkout for the plan, returning to onboarding', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    expect(screen.getByTestId('checkout')).toHaveAttribute(
      'data-plan',
      'plan_pro'
    )
    expect(checkoutProps.planId).toBe('plan_pro')
    expect(checkoutProps.returnPath).toBe('/checkout/onboarding')
  })

  it('reports begin_checkout with the price, and omits value when price is unknown', () => {
    const { unmount } = render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    const [event, data] = whopTrack.mock.calls[0]
    expect(event).toBe(WHOP_EVENT.beginCheckout)
    expect(data.value).toBe(499)
    expect(data.currency).toBe('USD')
    expect(data.content_type).toBe('product')
    expect(data.content_id).toBe('pro')
    expect(data.content_name).toBe('Pro')
    unmount()

    whopTrack.mockClear()
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(whopTrack.mock.calls[0][1].value).toBeUndefined()
  })

  it('says the item is not on sale rather than rendering a dead checkout', () => {
    render(<BuyButton planId={null} itemType="product" slug="pro" name="Pro" />)
    expect(screen.getByRole('status')).toHaveTextContent(/not on sale yet/i)
    expect(screen.queryByTestId('checkout')).toBeNull()
  })
})

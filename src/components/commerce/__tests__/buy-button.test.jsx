import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

let embedProps
vi.mock('@whop/checkout/react', () => ({
  WhopCheckoutEmbed: (props) => {
    embedProps = props
    return <div data-testid="embed" data-plan={props.planId} />
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
  embedProps = undefined
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.amware.dev'
})

describe('BuyButton', () => {
  it('mounts the Whop embed for the plan', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    expect(screen.getByTestId('embed')).toHaveAttribute('data-plan', 'plan_pro')
  })

  it('sends the buyer to onboarding with the receipt when payment completes', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    embedProps.onComplete('plan_pro', 'pay_123')
    expect(push).toHaveBeenCalledWith('/checkout/onboarding?payment_id=pay_123')
  })

  it('still sends the buyer to onboarding when Whop gives no receipt id', () => {
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    embedProps.onComplete('plan_pro', undefined)
    expect(push).toHaveBeenCalledWith('/checkout/onboarding')
  })

  it('returns bank-redirect payments to the same onboarding page', () => {
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(embedProps.returnUrl).toBe(
      'https://www.amware.dev/checkout/onboarding'
    )
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

  it('says the item is not on sale rather than rendering a dead embed', () => {
    render(<BuyButton planId={null} itemType="product" slug="pro" name="Pro" />)
    expect(screen.getByRole('status')).toHaveTextContent(/not on sale yet/i)
    expect(screen.queryByTestId('embed')).toBeNull()
  })
})

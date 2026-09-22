import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WHOP_ENV
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
      `${window.location.origin}/checkout/onboarding`
    )
  })

  it('mounts against the sandbox when the site runs against the sandbox, and production otherwise', () => {
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    const { unmount } = render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(embedProps.environment).toBe('sandbox')
    unmount()

    delete process.env.NEXT_PUBLIC_WHOP_ENV
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(embedProps.environment).toBe('production')
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

  /* Without it Whop may navigate the top frame after payment and pre-empt
     the router.push onComplete makes -- the same prop DepositCheckout sets. */
  it('keeps the page loaded after payment, so onComplete is what moves the buyer', () => {
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(embedProps.skipRedirect).toBe(true)
  })

  it('themes the embed the way the deposit sheet does', () => {
    render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
    )
    expect(embedProps.theme).toBe('light')
    expect(embedProps.themeOptions).toEqual({
      accentColor: '#14bbac',
      borderRadius: 8,
    })
  })

  it('mounts the embed dark on a dark page', () => {
    document.documentElement.classList.add('dark')
    try {
      render(
        <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />
      )
      expect(embedProps.theme).toBe('dark')
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })
})

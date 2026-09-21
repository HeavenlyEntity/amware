import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { BuyButton } from '../BuyButton'

describe('BuyButton', () => {
  it('mounts the Whop embed for the plan', () => {
    const { container } = render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    const mount = container.querySelector('[data-whop-checkout-plan-id]')
    expect(mount).not.toBeNull()
    expect(mount.getAttribute('data-whop-checkout-plan-id')).toBe('plan_pro')
  })

  it('says the item is not on sale rather than rendering a dead button', () => {
    render(<BuyButton planId={null} itemType="product" slug="pro" name="Pro" />)
    expect(screen.getByRole('status')).toHaveTextContent(/not on sale yet/i)
  })
})

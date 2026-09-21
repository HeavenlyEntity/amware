import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

/* next/script never fires onReady in jsdom -- there is no real script load
   for it to react to. Same mock contact-lead.test.jsx uses for the same
   reason: fire onReady as soon as the component mounts, so begin_checkout
   can be exercised without a real network load. */
vi.mock('next/script', () => ({
  default: function Script({ onReady }) {
    useEffect(() => {
      onReady()
    }, [onReady])
    return null
  },
}))

import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { BuyButton } from '../BuyButton'

beforeEach(() => {
  vi.clearAllMocks()
})

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

  it('reports begin_checkout with the item once the embed is ready', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    expect(whopTrack).toHaveBeenCalledTimes(1)
    const [event, data] = whopTrack.mock.calls[0]
    expect(event).toBe(WHOP_EVENT.beginCheckout)
    expect(data.currency).toBe('USD')
    expect(data.content_type).toBe('product')
    expect(data.content_id).toBe('pro')
    expect(data.content_name).toBe('Pro')
  })

  it('carries the price as value when one is known', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="product"
        slug="pro"
        name="Pro"
        price={499}
      />
    )
    const [, data] = whopTrack.mock.calls[0]
    expect(data.value).toBe(499)
  })

  it('omits value rather than reporting an unknown price as zero', () => {
    render(
      <BuyButton
        planId="plan_pro"
        itemType="service"
        slug="advisor"
        name="Advisor"
      />
    )
    const [, data] = whopTrack.mock.calls[0]
    expect(data.value).toBeUndefined()
  })
})

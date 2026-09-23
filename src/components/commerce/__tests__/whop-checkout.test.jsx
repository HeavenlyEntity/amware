import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let providerProps
let checkoutProps
vi.mock('@whop/elements-react', () => ({
  WhopElements: (props) => {
    providerProps = props
    return <div data-testid="provider">{props.children}</div>
  },
  Checkout: (props) => {
    checkoutProps = props
    return <div data-testid="checkout">{props.children}</div>
  },
  CheckoutElement: () => <div data-testid="element" />,
}))
vi.mock('@whop/elements', () => ({ loadWhop: vi.fn(() => ({ loaded: true })) }))

import { WhopCheckout } from '../WhopCheckout'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

beforeEach(() => {
  providerProps = undefined
  checkoutProps = undefined
  delete process.env.NEXT_PUBLIC_WHOP_ENV
})

describe('WhopCheckout', () => {
  it('mounts the plan with a UUID reference in both metadata and the return URL', () => {
    render(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    expect(checkoutProps.plan).toBe('plan_pro')
    const ref = checkoutProps.metadata.checkout_ref
    expect(ref).toMatch(UUID)
    const url = new URL(checkoutProps.returnUrl)
    expect(url.origin).toBe(window.location.origin)
    expect(url.pathname).toBe('/checkout/onboarding')
    expect(url.searchParams.get('ref')).toBe(ref)
  })

  it('carries extra return parameters alongside the reference', () => {
    render(
      <WhopCheckout
        planId="plan_dep"
        returnPath="/checkout/deposit"
        returnParams={{
          service: 'Fractional CTO',
          booking: 'https://cal.com/amware/x',
        }}
      />
    )
    const url = new URL(checkoutProps.returnUrl)
    expect(url.searchParams.get('service')).toBe('Fractional CTO')
    expect(url.searchParams.get('booking')).toBe('https://cal.com/amware/x')
    expect(url.searchParams.get('ref')).toMatch(UUID)
  })

  it('keeps one reference across re-renders, because options cannot change after mount', () => {
    const { rerender } = render(
      <WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />
    )
    const first = checkoutProps.metadata.checkout_ref
    rerender(
      <WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />
    )
    expect(checkoutProps.metadata.checkout_ref).toBe(first)
  })

  it('targets the sandbox when the site is configured for it', () => {
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    render(
      <WhopCheckout planId="plan_sand" returnPath="/checkout/onboarding" />
    )
    expect(providerProps.environment).toBe('sandbox')
  })

  it('defaults to production and the site accent', () => {
    render(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    expect(providerProps.environment).toBe('production')
    expect(providerProps.appearance.theme.accentColor).toBe('teal')
  })

  it('renders nothing without a plan', () => {
    render(<WhopCheckout planId={null} returnPath="/checkout/onboarding" />)
    expect(screen.queryByTestId('checkout')).toBeNull()
  })

  it('keeps metadata, returnUrl and appearance as the same object across a re-render', () => {
    const { rerender } = render(
      <WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />
    )
    const firstMetadata = checkoutProps.metadata
    const firstReturnUrl = checkoutProps.returnUrl
    const firstAppearance = providerProps.appearance
    rerender(
      <WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />
    )
    expect(checkoutProps.metadata).toBe(firstMetadata)
    expect(checkoutProps.returnUrl).toBe(firstReturnUrl)
    expect(providerProps.appearance).toBe(firstAppearance)
  })

  it('ignores a changed returnPath and returnParams after mount, because returnUrl is frozen', () => {
    const { rerender } = render(
      <WhopCheckout
        planId="plan_pro"
        returnPath="/checkout/onboarding"
        returnParams={{ service: 'Fractional CTO' }}
      />
    )
    const first = checkoutProps.returnUrl
    rerender(
      <WhopCheckout
        planId="plan_pro"
        returnPath="/checkout/deposit"
        returnParams={{ service: 'Something Else' }}
      />
    )
    expect(checkoutProps.returnUrl).toBe(first)
  })

  /* Carried over from the deposit sheet's tests, which pinned both when the
     sheet built the embed's options itself. */
  it('follows the page’s light or dark mode, read when the element mounts', () => {
    const { unmount } = render(
      <WhopCheckout planId="plan_dep" returnPath="/checkout/deposit" />
    )
    expect(providerProps.appearance.theme.appearance).toBe('light')
    unmount()

    document.documentElement.classList.add('dark')
    try {
      render(<WhopCheckout planId="plan_dep" returnPath="/checkout/deposit" />)
      expect(providerProps.appearance.theme.appearance).toBe('dark')
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })

  it('leaves a return parameter with no value off the URL', () => {
    render(
      <WhopCheckout
        planId="plan_dep"
        returnPath="/checkout/deposit"
        returnParams={{ service: 'Advisor', booking: null }}
      />
    )
    const url = new URL(checkoutProps.returnUrl)
    expect(url.searchParams.get('service')).toBe('Advisor')
    expect(url.searchParams.has('booking')).toBe(false)
  })
})

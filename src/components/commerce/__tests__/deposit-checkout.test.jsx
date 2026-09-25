import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* Whop Elements mounts through WhopCheckout, which has tests of its own:
   the reference it mints, the return URL it builds from these props, the
   environment and the theme. Here it is a stub that records what the sheet
   hands it.

   There is no completed-payment moment to simulate any more. Elements has
   no completion callback -- a finished checkout redirects the whole tab to
   /checkout/deposit -- so "deposit received, book the intro call" is that
   page's job now, and its tests carry it. */
let checkoutProps
vi.mock('../WhopCheckout', () => ({
  WhopCheckout: (props) => {
    checkoutProps = props
    return <div data-testid="checkout" data-plan={props.planId} />
  },
}))

import { DepositCheckout } from '../DepositCheckout'

const CAL = 'https://cal.com/amware/on-demand-outcome'

let track

beforeEach(() => {
  checkoutProps = undefined
  track = vi.fn()
  window.whop = { track }
})

afterEach(() => {
  delete window.whop
  delete process.env.NEXT_PUBLIC_WHOP_ENV
})

const open = () =>
  fireEvent.click(screen.getByRole('button', { name: /reserve your start/i }))

describe('DepositCheckout', () => {
  it('opens a sheet with the checkout for the service plan, and reports begin_checkout', () => {
    render(
      <DepositCheckout planId="plan_dep" serviceName="Advisor" amount={1500}>
        Reserve your start
      </DepositCheckout>
    )
    expect(screen.queryByTestId('checkout')).toBeNull()
    open()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('checkout')).toHaveAttribute(
      'data-plan',
      'plan_dep'
    )
    expect(checkoutProps.planId).toBe('plan_dep')
    expect(screen.getByText(/\$1,500 deposit for Advisor/)).toBeInTheDocument()
    expect(track).toHaveBeenCalledWith('begin_checkout', {
      value: 1500,
      currency: 'USD',
      content_type: 'deposit',
      content_id: 'plan_dep',
      content_name: 'Advisor',
    })
  })

  it('never reports purchase itself: Whop processed the sale and reports it', () => {
    render(
      <DepositCheckout planId="plan_dep" serviceName="Advisor" amount={1500}>
        Reserve your start
      </DepositCheckout>
    )
    open()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    open()
    /* Opening is the only thing the sheet reports, once per opening. */
    expect(track.mock.calls.map(([event]) => event)).toEqual([
      'begin_checkout',
      'begin_checkout',
    ])
    /* And there is no completion to report from: the checkout is handed
       nothing to call back, because Elements redirects instead. */
    expect(checkoutProps).not.toHaveProperty('onComplete')
  })

  it('returns to /checkout/deposit with the service and its booking link', () => {
    render(
      <DepositCheckout
        planId="plan_dep"
        serviceName="Advisor"
        amount={1500}
        bookingUrl={CAL}
      >
        Reserve your start
      </DepositCheckout>
    )
    open()
    expect(checkoutProps.returnPath).toBe('/checkout/deposit')
    expect(checkoutProps.returnParams).toEqual({
      service: 'Advisor',
      booking: CAL,
    })
  })

  it('hands the checkout no booking link when the service has none', () => {
    render(
      <DepositCheckout
        planId="plan_dep"
        serviceName="Advisor"
        amount={1500}
        bookingUrl={null}
      >
        Reserve your start
      </DepositCheckout>
    )
    open()
    expect(checkoutProps.returnPath).toBe('/checkout/deposit')
    expect(checkoutProps.returnParams.service).toBe('Advisor')
    expect(checkoutProps.returnParams.booking).toBeFalsy()
  })

  it('shows no sandbox warning when the site runs against production', () => {
    render(
      <DepositCheckout planId="plan_dep" serviceName="Advisor">
        Reserve your start
      </DepositCheckout>
    )
    open()
    expect(screen.getByTestId('checkout')).toBeInTheDocument()
    expect(screen.queryByText(/sandbox/i)).toBeNull()
  })

  it('says so when the site runs against the sandbox', () => {
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    render(
      <DepositCheckout planId="plan_sand" serviceName="Advisor">
        Reserve your start
      </DepositCheckout>
    )
    open()
    expect(screen.getByTestId('checkout')).toHaveAttribute(
      'data-plan',
      'plan_sand'
    )
    expect(screen.getByText(/sandbox: test cards only/i)).toBeInTheDocument()
  })
})

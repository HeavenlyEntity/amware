import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'

/* The only thing PendingRefresh does is ask the router for the same page
   again, one attempt later. The router is recorded so that URL can be read
   back. */
let replace
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/checkout/onboarding',
}))

import * as clientModule from '../PendingRefresh'
import { PendingRefresh } from '../PendingRefresh'

const REF = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const CAL = 'https://cal.com/amware/on-demand-outcome'

beforeEach(() => {
  replace = vi.fn()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/* One refresh interval later: the URL asked for, parsed. */
const retried = () => {
  act(() => {
    vi.advanceTimersByTime(5000)
  })
  expect(replace).toHaveBeenCalledTimes(1)
  return new URL(replace.mock.calls[0][0], 'https://amware.dev')
}

describe('PendingRefresh', () => {
  /* The onboarding page's retries, exactly as they were: the identifier
     that found (or will find) the row, and the next attempt. */
  it('retries with only the ref and the next attempt, preferring the ref', () => {
    render(<PendingRefresh checkoutRef={REF} paymentId="pay_1" attempt={0} />)

    const url = retried()
    expect(url.pathname).toBe('/checkout/onboarding')
    expect([...url.searchParams]).toEqual([
      ['ref', REF],
      ['attempt', '1'],
    ])
  })

  it('retries with only the payment id and the next attempt when there is no ref', () => {
    render(<PendingRefresh paymentId="pay_1" attempt={4} />)

    expect([...retried().searchParams]).toEqual([
      ['payment_id', 'pay_1'],
      ['attempt', '5'],
    ])
  })

  /* The deposit page needs its service name and booking link back on every
     retry, or the intro call could not be offered once the deposit lands. */
  it('carries the params the page asks it to keep, and leaves out empty ones', () => {
    render(
      <PendingRefresh
        checkoutRef={REF}
        attempt={2}
        keepParams={{ service: 'Advisor', booking: CAL, empty: '' }}
      />
    )

    expect([...retried().searchParams]).toEqual([
      ['service', 'Advisor'],
      ['booking', CAL],
      ['ref', REF],
      ['attempt', '3'],
    ])
  })

  /* The return pages are server components. Anything they import from this
     'use client' module arrives as a client reference, so a constant here
     reads as a stub on the server: the attempt bound once did, and the
     automatic re-check never rendered. The bound lives in
     lib/commerce/pendingRefresh; this module offers the component alone. */
  it('exports only the component, so a server page cannot import a stub from it', () => {
    expect(Object.keys(clientModule)).toEqual(['PendingRefresh'])
  })
})

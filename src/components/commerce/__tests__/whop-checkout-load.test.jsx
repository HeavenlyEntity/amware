import { Component } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

/* The real @whop/elements-react provider, not a stand-in. What these tests
   pin is how the installed provider treats a failed load: without
   onLoadError it throws the error during render
   (_runtime/react/provider.js: `if (error && !onLoadError) throw error`),
   and with no error boundary under src/app, Next swaps the whole page for
   "Application error". Only the loader is faked, shaped like the WhopLoad
   loadWhop() returns: the load itself plus retry(), which starts a fresh
   one -- after which loadWhop() hands out that fresh load. */
vi.mock('@whop/elements', () => ({ loadWhop: vi.fn() }))

import { loadWhop } from '@whop/elements'
import { WhopCheckout } from '../WhopCheckout'

/* What loadWhop() returns right now. */
let current

/* The SDK still on its way. */
const inFlight = () => Object.assign(new Promise(() => {}), { retry: vi.fn() })

/* A load that failed -- a proxy, a privacy extension, a CDN incident -- as
   loadWhop() holds it. Its retry() starts `next`. Handled here so Node does
   not report the rejection before the provider attaches its own handler. */
function failedLoad(next) {
  const load = Promise.reject(
    new Error('Failed to load https://cdn.whop.com/elements/amber/elements.js')
  )
  load.catch(() => {})
  return Object.assign(load, {
    retry: vi.fn(() => {
      current = next
      return next
    }),
  })
}

/* Stands in for Next's own handling of a render error: anything that
   throws below it takes the whole page down. */
class PageBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  render() {
    return this.state.crashed ? <p>Application error</p> : this.props.children
  }
}

const Page = () => (
  <PageBoundary>
    <h1>Reserve your start</h1>
    <WhopCheckout
      planId="plan_dep"
      returnPath="/checkout/deposit"
      className="checkout-slot"
    />
    <p>Credited in full against your first month.</p>
  </PageBoundary>
)

const COULD_NOT_LOAD = 'The checkout could not load.'

let logged

beforeEach(() => {
  loadWhop.mockReset()
  loadWhop.mockImplementation(() => current)
  logged = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  logged.mockRestore()
})

describe('WhopCheckout when Whop’s script cannot load', () => {
  it('keeps the page, and says so in the checkout’s own space', async () => {
    current = failedLoad(inFlight())
    const { container } = render(<Page />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(COULD_NOT_LOAD)
    expect(container.querySelector('.checkout-slot')).toContainElement(alert)
    // Nothing outside the checkout's container goes with it.
    expect(screen.queryByText('Application error')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Reserve your start' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Credited in full against your first month.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('logs the load error rather than swallowing it', async () => {
    current = failedLoad(inFlight())
    render(<Page />)

    await screen.findByRole('alert')
    expect(logged).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        message: expect.stringContaining('cdn.whop.com'),
      })
    )
  })

  it('starts a fresh load through the provider’s retry() on Try again', async () => {
    const fresh = inFlight()
    const failed = failedLoad(fresh)
    current = failed
    render(<Page />)

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(failed.retry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(COULD_NOT_LOAD)).toBeNull()
    // The fresh load is under way, so the checkout's placeholder is back.
    expect(
      screen.getByRole('status', { name: 'Loading checkout' })
    ).toBeInTheDocument()
  })

  it('says so again if the fresh load fails too', async () => {
    const second = failedLoad(inFlight())
    const first = failedLoad(second)
    current = first
    render(<Page />)

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText(COULD_NOT_LOAD)).toBeInTheDocument()
    expect(first.retry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Application error')).toBeNull()
  })

  /* loadWhop() holds a failed load until retry() replaces it, then hands
     out the fresh one. A copy cached in this module would keep handing
     every later checkout the failure for the life of the tab. */
  it('gives a checkout opened after a retry the fresh load, not the old failure', async () => {
    const fresh = inFlight()
    current = failedLoad(fresh)
    const first = render(<Page />)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    first.unmount()

    render(<Page />)
    // Give a pinned failure the chance to surface before asserting it did not.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

    expect(screen.queryByText(COULD_NOT_LOAD)).toBeNull()
    expect(
      screen.getByRole('status', { name: 'Loading checkout' })
    ).toBeInTheDocument()
  })
})

describe('WhopCheckout while Whop’s script loads', () => {
  it('holds the checkout’s space with a placeholder until the frame paints', () => {
    current = inFlight()
    const { container } = render(<Page />)

    const placeholder = screen.getByRole('status', { name: 'Loading checkout' })
    expect(container.querySelector('.checkout-slot')).toContainElement(
      placeholder
    )
  })
})

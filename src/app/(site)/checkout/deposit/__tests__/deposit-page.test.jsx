import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

/* The page is an async server component: it is called with its search
   params and the element it resolves to is rendered. The database is the
   only thing mocked -- what is asserted is what a client sees after paying
   a deposit, and what a stranger holding the URL would see, because this
   page has no signature. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))

/* A confirmed deposit books the intro call through the Cal.com popup; the
   embed script has no business loading in jsdom. */
vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

/* PendingRefresh asks again through router.replace. Recorded here so a
   retry's URL can be read back. */
let replace
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/checkout/deposit',
}))

/* The RSC boundary Vitest does not have. On the server, a page receives
   every export of a 'use client' module as a client reference: the
   component still renders, but anything read as a value -- a constant, a
   helper -- is a stub, never the value. Recreated here for PendingRefresh,
   so a page that read a value from it fails these tests the way it fails
   in the real app. */
vi.mock('@/components/commerce/PendingRefresh', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((name) => [
      name,
      name === 'PendingRefresh'
        ? actual.PendingRefresh
        : () => {
            throw new Error(`${name} is a client reference on the server`)
          },
    ])
  )
})

import { getPayloadClient } from '@/lib/getPayloadClient'
import DepositReturn from '../page'

/* What WhopCheckout mints and puts on the return URL as ?ref=. */
const REF = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const CAL = 'https://cal.com/amware/on-demand-outcome'

/* What the webhook records for a deposit. The page may read whether it
   exists and its status, nothing more; the rest is here so the tests can
   prove none of it reaches the page. */
const deposit = (over = {}) => ({
  id: 41,
  email: 'client@example.com',
  amount: 150000,
  currency: 'usd',
  status: 'paid',
  whopCheckoutRef: REF,
  ...over,
})

const FAILED = /did not go through|nothing was charged/i

let find
let track

beforeEach(() => {
  vi.clearAllMocks()
  find = vi.fn()
  getPayloadClient.mockResolvedValue({ find })
  replace = vi.fn()
  track = vi.fn()
  window.whop = { track }
})

afterEach(() => {
  vi.useRealTimers()
  delete window.whop
})

const page = (params = {}) =>
  DepositReturn({ searchParams: Promise.resolve(params) })

const renderPage = async (params) => render(await page(params))

/* Advances past one refresh interval and returns the URL PendingRefresh
   asked the router for, parsed. */
const retryUrl = () => {
  act(() => {
    vi.advanceTimersByTime(5000)
  })
  expect(replace).toHaveBeenCalledTimes(1)
  return new URL(replace.mock.calls[0][0], 'https://amware.dev')
}

describe('Deposit return page: Whop said the payment failed', () => {
  /* Only an explicit ?status=error shows the failure copy -- and it is read
     before any lookup, because whatever a ref would find, "you do not need
     to pay again" would be a lie after it. */
  it('says the payment did not go through, and offers another try, before any lookup', async () => {
    const { container } = await renderPage({
      status: 'error',
      ref: REF,
      service: 'Advisor',
      booking: CAL,
    })

    expect(
      screen.getByRole('heading', { name: /did not go through/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/nothing was charged/i)
    expect(container.textContent).not.toMatch(/do not need to pay again/i)
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/services'
    )
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    expect(find).not.toHaveBeenCalled()
  })
})

describe('Deposit return page: a paid deposit found by its ref', () => {
  it('confirms the deposit and flows it into the same Cal.com popup as "Book an intro call"', async () => {
    find.mockResolvedValue({ docs: [deposit()] })
    await renderPage({ ref: REF, service: 'Advisor', booking: CAL })

    expect(
      screen.getByRole('heading', { name: /your start is reserved/i })
    ).toBeInTheDocument()
    /* The intro call is the element-click embed the Cal script looks for,
       not a link that sends the client away. */
    const book = screen.getByRole('button', { name: /book the intro call/i })
    expect(book).toHaveAttribute('data-cal-link', 'amware/on-demand-outcome')
    expect(book).toHaveAttribute('data-cal-namespace', 'on-demand-outcome')
    expect(
      screen.getByRole('link', { name: /back to engagements/i })
    ).toHaveAttribute('href', '/services')
  })

  it('confirms a deposit with no Cal.com link by saying what happens next', async () => {
    find.mockResolvedValue({ docs: [deposit()] })
    const { container } = await renderPage({ ref: REF, service: 'Advisor' })

    expect(
      screen.getByRole('heading', { name: /your start is reserved/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/in touch within one business day/i)
    expect(
      screen.getByRole('link', { name: /back to engagements/i })
    ).toHaveAttribute('href', '/services')
    expect(
      screen.queryByRole('button', { name: /book the intro call/i })
    ).toBeNull()
  })

  /* The booking param is untrusted query input: calLinkFromUrl is the only
     way it can become a popup, and nothing else from the query string is
     ever rendered as a link. */
  it.each([
    ['a Calendly link', 'https://calendly.com/amware/intro', 'calendly.com'],
    [
      'a Cal.com lookalike host',
      'https://cal.com.evil.example/amware/on-demand-outcome',
      'evil.example',
    ],
    ['a javascript: URL', 'javascript:alert(1)', 'javascript:'],
  ])(
    'never turns %s from the URL into a link or a popup',
    async (_, booking, marker) => {
      find.mockResolvedValue({ docs: [deposit()] })
      const { container } = await renderPage({
        ref: REF,
        service: 'Advisor',
        booking,
      })

      expect(
        screen.getByRole('heading', { name: /your start is reserved/i })
      ).toBeInTheDocument()
      expect(container.innerHTML).not.toContain(marker)
      expect(
        screen.queryByRole('button', { name: /book the intro call/i })
      ).toBeNull()
      expect(
        screen.getByRole('link', { name: /back to engagements/i })
      ).toHaveAttribute('href', '/services')
    }
  )

  it('reads only whether the deposit exists and its status, never the email or the amount', async () => {
    find.mockResolvedValue({ docs: [deposit()] })
    const { container } = await renderPage({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
    })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        where: { whopCheckoutRef: { equals: REF } },
        select: { status: true },
        depth: 0,
        limit: 1,
      })
    )
    const text = container.textContent
    expect(text).not.toContain('client@example.com')
    expect(text).not.toMatch(/1,?500/)
    expect(text).not.toContain('150000')
  })

  it('validates the ref and lower-cases it before querying', async () => {
    find.mockResolvedValue({ docs: [deposit()] })
    await renderPage({ ref: REF.toUpperCase() })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopCheckoutRef: { equals: REF } },
      })
    )
  })

  /* Whop processed the sale and reports it to the ad platforms itself; its
     pixel rejects a duplicate. Confirming the deposit is not a reason for
     this site to report one. */
  it('never reports purchase itself for a confirmed deposit', async () => {
    find.mockResolvedValue({ docs: [deposit()] })
    await renderPage({ ref: REF, service: 'Advisor', booking: CAL })

    expect(track.mock.calls.map(([event]) => event)).not.toContain('purchase')
  })
})

describe('Deposit return page: a ref with no purchase yet', () => {
  /* The webhook is server-to-server and the redirect regularly beats it,
     so this is the ordinary first few seconds after paying. */
  it('says it is confirming the deposit, that there is no need to pay again, and checks again', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
    })

    expect(
      screen.getByRole('heading', { name: /confirming your deposit/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/do not need to pay again/i)
    expect(container.textContent).toMatch(/checks again automatically/i)
    expect(container.textContent).not.toMatch(FAILED)
  })

  it('keeps the service and the Cal.com link on the automatic retry, so the popup survives the wait', async () => {
    find.mockResolvedValue({ docs: [] })
    const element = await page({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
      attempt: '2',
    })
    vi.useFakeTimers()
    render(element)

    const url = retryUrl()
    expect(url.pathname).toBe('/checkout/deposit')
    expect(url.searchParams.get('ref')).toBe(REF)
    expect(url.searchParams.get('attempt')).toBe('3')
    expect(url.searchParams.get('service')).toBe('Advisor')
    expect(url.searchParams.get('booking')).toBe(CAL)
  })

  it('does not carry a booking link that is not Cal.com into the retry', async () => {
    find.mockResolvedValue({ docs: [] })
    const element = await page({
      ref: REF,
      service: 'Advisor',
      booking: 'https://cal.com.evil.example/amware/on-demand-outcome',
    })
    vi.useFakeTimers()
    render(element)

    const url = retryUrl()
    expect(url.searchParams.get('ref')).toBe(REF)
    expect(url.searchParams.get('booking')).toBeNull()
  })

  it('stops checking once the attempts run out, and offers a refresh that keeps the booking', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
      attempt: '6',
    })

    expect(container.textContent).not.toMatch(/checks again automatically/i)
    expect(container.textContent).toMatch(/do not need to pay again/i)
    const refresh = new URL(
      screen
        .getByRole('link', { name: /refresh the page/i })
        .getAttribute('href'),
      'https://amware.dev'
    )
    expect(refresh.pathname).toBe('/checkout/deposit')
    expect(refresh.searchParams.get('ref')).toBe(REF)
    expect(refresh.searchParams.get('service')).toBe('Advisor')
    expect(refresh.searchParams.get('booking')).toBe(CAL)
    expect(refresh.searchParams.get('attempt')).toBeNull()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })
})

describe('Deposit return page: nothing to confirm', () => {
  /* A refunded deposit still resolves by its ref, so the page itself has
     to refuse to call it reserved. It can never turn paid by waiting, so it
     does not wait. */
  it('points at the email when the purchase is no longer paid', async () => {
    find.mockResolvedValue({ docs: [deposit({ status: 'refunded' })] })
    const { container } = await renderPage({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
    })

    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()
    const text = container.textContent
    expect(text).not.toMatch(/reserved/i)
    expect(text).not.toMatch(FAILED)
    expect(text).not.toMatch(/checks again automatically/i)
    expect(
      screen.queryByRole('button', { name: /book the intro call/i })
    ).toBeNull()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  /* Arriving here proves nothing either way. The old embed's ?status=success
     is not proof of payment, and its absence is not proof of failure -- a
     client who has just paid $1,500 must never read that it failed. */
  it.each([
    ['a bare visit', {}],
    [
      'the old embed’s ?status=success',
      { status: 'success', service: 'Advisor', booking: CAL },
    ],
    ['a ref that is not a UUID', { ref: 'not-a-uuid', booking: CAL }],
  ])(
    'shows the neutral email state, never the failure message, for %s',
    async (_, params) => {
      const { container } = await renderPage(params)

      expect(
        screen.getByRole('heading', { name: /check your email/i })
      ).toBeInTheDocument()
      const text = container.textContent
      expect(text).not.toMatch(FAILED)
      expect(text).not.toMatch(/reserved/i)
      expect(text).not.toMatch(/checks again automatically/i)
      expect(text).not.toContain('not-a-uuid')
      expect(
        screen.getByRole('link', { name: /get in touch/i })
      ).toHaveAttribute('href', '/contact')
      // Without a valid ref the lookup can never succeed, so none is made.
      expect(find).not.toHaveBeenCalled()
    }
  )

  /* A public page degrades, never throws. Until the whop_checkout_ref
     column exists in the database, this is the path every Elements deposit
     takes -- so it must be the neutral state, not the failure message. */
  it('shows the neutral email state, never the failure message, when the lookup fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    find.mockRejectedValue(
      new Error('column "whop_checkout_ref" does not exist')
    )
    const { container } = await renderPage({
      ref: REF,
      service: 'Advisor',
      booking: CAL,
    })

    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()
    const text = container.textContent
    expect(text).not.toMatch(FAILED)
    expect(text).not.toMatch(/reserved/i)
    expect(text).not.toMatch(/checks again automatically/i)
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})

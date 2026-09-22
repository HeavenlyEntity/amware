import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* The page is an async server component: it is called with its search
   params and the element it resolves to is rendered. The database is the
   only thing mocked -- what is asserted is what a stranger holding a
   payment id would see, because this page has no signature. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import OnboardingPage from '../page'

/* Forty characters, opening with seven that the old mask used to show. */
const KEY = 'WHOPKEY' + 'x'.repeat(29) + 'WXYZ'

const proKit = {
  id: 7,
  name: 'WareKit Next NetSuite (Pro)',
  slug: 'warekit-next-netsuite-pro',
  type: 'boilerplate',
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  seats: 1,
}

const guide = {
  id: 12,
  name: 'Quick key rotation guide',
  slug: 'switch-clone-quick-key-rotation-guide',
  type: 'digital',
}

const row = (over = {}) => ({
  id: 99,
  email: 'buyer@example.com',
  amount: 49900,
  currency: 'usd',
  status: 'paid',
  fulfillmentStatus: 'sent',
  githubUsername: 'octocat',
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  licenseKey: KEY,
  item: { relationTo: 'products', value: proKit },
  ...over,
})

let find

beforeEach(() => {
  vi.clearAllMocks()
  find = vi.fn()
  getPayloadClient.mockResolvedValue({ find })
})

const renderPage = async (params = {}) =>
  render(await OnboardingPage({ searchParams: Promise.resolve(params) }))

describe('Onboarding page', () => {
  it('shows only the last four characters of the licence key', async () => {
    find.mockResolvedValue({ docs: [row()] })
    const { container } = await renderPage({ payment_id: 'pay_1' })

    expect(screen.getByText('••••WXYZ')).toBeInTheDocument()
    expect(container.textContent).not.toContain('WHOPKEY')
    expect(container.innerHTML).not.toContain(KEY)
  })

  it('never shows the buyer’s email or the amount they paid', async () => {
    find.mockResolvedValue({ docs: [row()] })
    const { container } = await renderPage({ payment_id: 'pay_1' })

    expect(container.textContent).not.toContain('buyer@example.com')
    expect(container.textContent).not.toMatch(/\$?499(\.00)?\b/)
    expect(container.textContent).not.toContain('49900')
  })

  it('does not offer Team to someone who bought a guide', async () => {
    find.mockResolvedValue({
      docs: [
        row({
          item: { relationTo: 'products', value: guide },
          githubRepo: null,
          githubUsername: null,
          licenseKey: null,
          fulfillmentStatus: 'pending',
        }),
      ],
    })
    await renderPage({ payment_id: 'pay_1' })

    expect(screen.queryByText(/working with a team/i)).toBeNull()
    expect(screen.queryByRole('link', { name: /compare team/i })).toBeNull()
    expect(
      screen.getByRole('link', { name: /book an intro call/i })
    ).toHaveAttribute('href', '/services')
  })

  /* A revoked licence is marked refunded. Its payment id still resolves to
     the row, so the page itself has to refuse to describe it. */
  it('shows nothing about a purchase that is no longer paid', async () => {
    find.mockResolvedValue({ docs: [row({ status: 'refunded' })] })
    const { container } = await renderPage({ payment_id: 'pay_1' })
    const text = container.textContent

    expect(text).not.toContain('amwaredotdev/warekit-next-netsuite')
    expect(text).not.toContain('WXYZ')
    expect(text).not.toContain('octocat')
    expect(text).not.toContain('WareKit Next NetSuite (Pro)')
    expect(text).not.toMatch(/git clone/i)
    // It can never turn into a paid purchase by waiting, so it does not.
    expect(text).not.toMatch(/checks again automatically/i)
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  /* Whop appends ?status=success|error when a bank redirect or wallet comes
     back. After a failure, "you do not need to pay again" would be a lie. */
  it('says a failed payment did not go through, and offers another try', async () => {
    const { container } = await renderPage({ status: 'error' })

    expect(
      screen.getByRole('heading', { name: /did not go through/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/nothing was charged/i)
    expect(container.textContent).not.toMatch(/do not need to pay again/i)
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/pricing'
    )
    expect(find).not.toHaveBeenCalled()
  })

  it('says a failed payment did not go through even when a payment id came back', async () => {
    const { container } = await renderPage({
      status: 'error',
      payment_id: 'pay_1',
    })
    expect(container.textContent).toMatch(/did not go through/i)
    expect(container.textContent).not.toMatch(/do not need to pay again/i)
  })

  it('points at the email straight away when there is no payment id to look up', async () => {
    const { container } = await renderPage({})

    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()
    // Without an id the lookup can never succeed, so it never retries.
    expect(container.textContent).not.toMatch(/checks again automatically/i)
    expect(find).not.toHaveBeenCalled()
  })

  it('keeps checking, a bounded number of times, while the webhook is on its way', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({ payment_id: 'pay_1' })

    expect(container.textContent).toMatch(/checks again automatically/i)
    expect(container.textContent).toMatch(/do not need to pay again/i)
  })

  it('stops checking and offers a manual refresh once the attempts run out', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({
      payment_id: 'pay_1',
      attempt: '6',
    })

    expect(container.textContent).not.toMatch(/checks again automatically/i)
    expect(
      screen.getByRole('link', { name: /refresh the page/i })
    ).toHaveAttribute('href', '/checkout/onboarding?payment_id=pay_1')
  })
})

describe('Onboarding page search params', () => {
  it('looks up the first payment id when the param is repeated', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ payment_id: ['pay_1', 'pay_2'] })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopPaymentId: { equals: 'pay_1' } },
      })
    )
    expect(
      screen.getByRole('heading', { name: /WareKit Next NetSuite \(Pro\)/ })
    ).toBeInTheDocument()
  })

  it('reads a repeated status the same way', async () => {
    const { container } = await renderPage({ status: ['error', 'success'] })
    expect(container.textContent).toMatch(/did not go through/i)
  })
})

describe('Onboarding page for a purchase that is not a kit', () => {
  /* A paid row owed by hand: the webhook records it pending, with no repo,
     account or key. */
  const owedByHand = (item) =>
    row({
      item,
      githubRepo: null,
      githubUsername: null,
      licenseKey: null,
      fulfillmentStatus: 'pending',
    })

  it('confirms the purchase plainly, with no kit copy', async () => {
    find.mockResolvedValue({
      docs: [owedByHand({ relationTo: 'products', value: guide })],
    })
    const { container } = await renderPage({ payment_id: 'pay_1' })
    const text = container.textContent

    expect(
      screen.getByRole('heading', { name: /your purchase is confirmed/i })
    ).toBeInTheDocument()
    expect(text).toMatch(/delivery details/i)
    expect(text).toContain('Quick key rotation guide')
    expect(text).not.toMatch(/is yours/i)
    expect(text).not.toMatch(/git clone/i)
    expect(text).not.toMatch(/repository/i)
    expect(text).not.toMatch(/licence key/i)
    // Nothing of ours was emailed for it, so the page must not say so.
    expect(text).not.toMatch(/in your purchase email/i)
  })

  it('names a course by its title', async () => {
    find.mockResolvedValue({
      docs: [
        owedByHand({
          relationTo: 'courses',
          value: {
            id: 31,
            title: 'NetSuite for developers',
            slug: 'netsuite-for-developers',
          },
        }),
      ],
    })
    const { container } = await renderPage({ payment_id: 'pay_1' })

    expect(container.textContent).toContain('NetSuite for developers')
    expect(container.textContent).not.toMatch(/git clone/i)
  })
})

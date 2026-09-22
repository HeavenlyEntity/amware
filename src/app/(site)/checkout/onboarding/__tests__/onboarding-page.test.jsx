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
})

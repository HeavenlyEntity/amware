import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* The page is an async server component: it is called with its search
   params and the element it resolves to is rendered. The database is the
   only thing mocked -- what is asserted is what a stranger holding a
   payment id would see, because this page has no signature. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))

/* The RSC boundary Vitest does not have. On the server, a page receives
   every export of a 'use client' module as a client reference: the
   component still renders, but anything read as a value -- a constant, a
   helper -- is a stub, never the value. Recreated here for PendingRefresh,
   so a page that read a value from it fails these tests the way it fails
   in the real app. */
const pendingRefreshProps = vi.hoisted(() => [])

vi.mock('@/components/commerce/PendingRefresh', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((name) => [
      name,
      name === 'PendingRefresh'
        ? (props) => {
            pendingRefreshProps.push(props)
            return actual.PendingRefresh(props)
          }
        : () => {
            throw new Error(`${name} is a client reference on the server`)
          },
    ])
  )
})

import { getPayloadClient } from '@/lib/getPayloadClient'
import { onboardingPath } from '@/lib/commerce/onboardingLink'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
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
  pendingRefreshProps.length = 0
  find = vi.fn()
  getPayloadClient.mockResolvedValue({ find })
})

const renderPage = async (params = {}) =>
  render(await OnboardingPage({ searchParams: Promise.resolve(params) }))

describe('Onboarding page', () => {
  it('shows only the last four characters of the license key', async () => {
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

  /* A revoked license is marked refunded. Its payment id still resolves to
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

  /* Only the old embed ever appended ?status=error, on the way back from a
     failed bank redirect or wallet; Whop Elements appends no outcome. With
     no valid ref there is nothing to look up first, so the URL decides --
     and after a failure, "you do not need to pay again" would be a lie. */
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
    expect(text).not.toMatch(/licen[sc]e key/i)
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

describe('Onboarding page reference lookup', () => {
  /* WhopCheckout mints this and puts it on the return URL as ?ref=; the
     receipt email's setup link, from before Elements existed, still uses
     ?payment_id=. Both must keep finding the purchase. */
  const REF = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'

  it('looks up the purchase by ref when one is present', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ ref: REF })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopCheckoutRef: { equals: REF } },
      })
    )
    expect(
      screen.getByRole('heading', { name: /WareKit Next NetSuite \(Pro\)/ })
    ).toBeInTheDocument()
  })

  it('validates the ref and lower-cases it before querying', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ ref: REF.toUpperCase() })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopCheckoutRef: { equals: REF } },
      })
    )
  })

  it('falls back to payment_id when there is no ref', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ payment_id: 'pay_1' })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopPaymentId: { equals: 'pay_1' } },
      })
    )
  })

  it('prefers ref over payment_id when both are on the URL', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ ref: REF, payment_id: 'pay_1' })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopCheckoutRef: { equals: REF } },
      })
    )
  })

  it('treats an invalid ref as absent, and never sends it to the database', async () => {
    const { container } = await renderPage({ ref: 'not-a-uuid' })

    expect(find).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('not-a-uuid')
  })

  it('falls back to payment_id when the ref on the URL is invalid', async () => {
    find.mockResolvedValue({ docs: [row()] })
    await renderPage({ ref: 'not-a-uuid', payment_id: 'pay_1' })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whopPaymentId: { equals: 'pay_1' } },
      })
    )
  })

  it('treats a ref with no row yet as the ordinary confirming state', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({ ref: REF })

    expect(
      screen.getByRole('heading', { name: /confirming your payment/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/checks again automatically/i)
    expect(container.textContent).toMatch(/do not need to pay again/i)
  })

  /* With a valid ref the page looks first: a paid row wins over anything on
     the URL, because a buyer who paid must never read "did not go through…
     Try again". ?status=error decides only once the ref has no paid row. */
  it('shows the purchase when the ref has a paid row, even with ?status=error', async () => {
    find.mockResolvedValue({ docs: [row()] })
    const { container } = await renderPage({ status: 'error', ref: REF })

    expect(
      screen.getByRole('heading', { name: /WareKit Next NetSuite \(Pro\)/ })
    ).toBeInTheDocument()
    expect(container.textContent).not.toMatch(
      /did not go through|nothing was charged/i
    )
  })

  it.each([
    ['no row', () => []],
    ['a row that is no longer paid', () => [row({ status: 'refunded' })]],
  ])(
    'says a failed payment did not go through when the ref has %s',
    async (_, docs) => {
      find.mockResolvedValue({ docs: docs() })
      const { container } = await renderPage({ status: 'error', ref: REF })

      expect(
        screen.getByRole('heading', { name: /did not go through/i })
      ).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/do not need to pay again/i)
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { whopCheckoutRef: { equals: REF } },
        })
      )
    }
  )

  /* A failed lookup cannot rule out a paid row, so the URL does not get to
     say the payment failed. */
  it('never shows the failure message for ?status=error when the lookup fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    find.mockRejectedValue(new Error('connection refused'))
    const { container } = await renderPage({ status: 'error', ref: REF })

    expect(container.textContent).not.toMatch(
      /did not go through|nothing was charged/i
    )
    logged.mockRestore()
  })

  /* Trusting ?status=success while the webhook is late is the tempting
     shortcut. Anyone can write it, so only a paid row may describe a
     purchase. */
  it('keeps confirming for ?status=success with a valid ref and no row, never describing a purchase', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({ status: 'success', ref: REF })

    expect(
      screen.getByRole('heading', { name: /confirming your payment/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/checks again automatically/i)
    expect(container.textContent).not.toMatch(
      /is yours|purchase is confirmed|payment received/i
    )
  })

  it('offers a ref-keyed manual refresh once the attempts run out', async () => {
    find.mockResolvedValue({ docs: [] })
    await renderPage({ ref: REF, attempt: '6' })

    expect(
      screen.getByRole('link', { name: /refresh the page/i })
    ).toHaveAttribute('href', `/checkout/onboarding?ref=${REF}`)
  })
})

/* Under Whop Elements a declined or abandoned off-site step -- 3DS, a bank
   page -- returns the buyer to this same URL with no failure signal, and no
   row ever arrives. So no row yet is either a purchase the webhook has not
   recorded or a payment that never happened, and every sentence in this
   state has to be true for both. */
describe('Onboarding page while no row has arrived, which could be either outcome', () => {
  const REF = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  const IF_PAID =
    'If your payment went through, you do not need to pay again — it can take a minute to show here.'
  const IF_NOT_FINISHED =
    'If your bank or card step did not finish, nothing was taken.'

  it('while it checks again, says not to pay again only if the payment went through', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({ ref: REF })
    const text = container.textContent

    expect(text).toMatch(/checks again automatically/i)
    expect(text).toContain(IF_PAID)
    // That conditional sentence is the only reassurance on the page.
    expect(text.match(/do not need to pay again/gi)).toHaveLength(1)
    expect(text).not.toMatch(/safe either way|payment is safe/i)
    expect(text).not.toMatch(/on its way/i)
    // A payment that never happened has no receipt to point at.
    expect(text).not.toMatch(/email|receipt/i)
    // The webhook may just be late: nothing nudges a second payment yet.
    expect(screen.queryByRole('link', { name: /try again/i })).toBeNull()
  })

  it('once the checks run out, says plainly an unfinished bank or card step took nothing, and offers another try', async () => {
    find.mockResolvedValue({ docs: [] })
    const { container } = await renderPage({ ref: REF, attempt: '6' })
    const text = container.textContent

    expect(text).not.toMatch(/checks again automatically/i)
    expect(text).toContain(IF_NOT_FINISHED)
    expect(text).toContain(IF_PAID)
    expect(text.match(/do not need to pay again/gi)).toHaveLength(1)
    expect(text).not.toMatch(/safe either way|payment is safe/i)
    expect(text).not.toMatch(/on its way/i)
    expect(text).not.toMatch(/email|receipt/i)
    expect(text).not.toMatch(/did not go through|nothing was charged/i)
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/pricing'
    )
    expect(
      screen.getByRole('link', { name: /refresh the page/i })
    ).toHaveAttribute('href', `/checkout/onboarding?ref=${REF}`)
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  /* A failed lookup is the one state where the page could not check at all:
     the buyer may have paid, or their bank step may have failed. So it says
     what is true either way, points at no receipt that may not exist, and --
     unlike the exhausted checks -- offers no second purchase, because a paid
     buyer must not be nudged into paying twice. */
  it('when the lookup itself fails, reassures only conditionally and never nudges a second payment', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    find.mockRejectedValue(new Error('connection refused'))
    const { container } = await renderPage({ ref: REF })
    const text = container.textContent

    expect(text).toContain(IF_PAID)
    expect(text).toContain(IF_NOT_FINISHED)
    expect(text.match(/do not need to pay again/gi)).toHaveLength(1)
    expect(text).not.toMatch(/safe either way|payment is safe/i)
    expect(text).not.toMatch(/email|receipt/i)
    expect(screen.queryByRole('link', { name: /try again/i })).toBeNull()
    expect(
      screen.getByRole('link', { name: /refresh the page/i })
    ).toHaveAttribute('href', `/checkout/onboarding?ref=${REF}`)
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    logged.mockRestore()
  })
})

describe('Onboarding page for a Team license', () => {
  it('mentions the other seats, from the product’s own seat count', async () => {
    find.mockResolvedValue({
      docs: [
        row({
          item: {
            relationTo: 'products',
            value: {
              ...proKit,
              name: 'WareKit Next NetSuite (Team)',
              slug: 'warekit-next-netsuite-team',
              seats: 5,
            },
          },
        }),
      ],
    })
    await renderPage({ payment_id: 'pay_1' })

    expect(
      screen.getByText(
        'Your license covers 5 developers — add the rest from the link in your receipt email.'
      )
    ).toBeInTheDocument()
  })

  it('does not mention seats for a single-seat kit', async () => {
    find.mockResolvedValue({ docs: [row()] })
    const { container } = await renderPage({ payment_id: 'pay_1' })
    expect(container.textContent).not.toMatch(/licen[sc]e covers/i)
  })
})

/* The Creem route. A kit buyer arrives on the signed link the checkout minted,
   with whatever Creem appended beside it. The page proves the signature before
   it looks anything up, and asks the one question Creem's checkout could not. */
describe('Onboarding page for a Creem kit buyer', () => {
  const REQUEST_ID = '6f1c1d7e-2b1a-4c57-9a52-0f1f5d1a1111'
  const teamKit = {
    ...proKit,
    name: 'WareKit Next NetSuite (Team)',
    slug: 'warekit-next-netsuite-team',
    stack: 'next-netsuite',
    tier: 'team',
    seats: 5,
    netsuiteAccounts: 3,
  }
  const license = { id: 5, stack: 'next-netsuite', tier: 'team' }

  const link = () => {
    const params = new URL(onboardingPath(REQUEST_ID), 'https://x.test')
      .searchParams
    return { r: params.get('r'), s: params.get('s') }
  }

  /* A paid Creem kit row that has not been asked for its account yet. */
  const creemRow = (over = {}) =>
    row({
      id: 99,
      creemRequestId: REQUEST_ID,
      createdAt: new Date().toISOString(),
      githubUsername: null,
      githubRepo: null,
      licenseKey: null,
      fulfillmentStatus: 'pending_invite',
      license: 5,
      grantsTier: 'team',
      item: { relationTo: 'products', value: teamKit },
      ...over,
    })

  let track
  let purchases
  let findByID

  /* The database as the page uses it: the purchase by request id, the license
     and its product through licenseFromClaims, the key through currentKey, and
     the Lite claim that pre-fills the username. */
  const database = ({ lite = null, key = null, licenseDoc = license } = {}) => {
    find = vi.fn(({ collection, where }) => {
      if (collection === 'products') return Promise.resolve({ docs: [teamKit] })
      if (where?.creemRequestId) return Promise.resolve({ docs: purchases })
      const text = JSON.stringify(where)
      if (text.includes('grantsTier')) {
        return Promise.resolve({
          docs: lite ? [{ githubUsername: lite, grantsTier: 'lite' }] : [],
        })
      }
      if (text.includes('licenseKey')) {
        return Promise.resolve({
          docs: key
            ? [{ licenseKey: key, status: 'paid', createdAt: '2026-10-01' }]
            : [],
        })
      }
      return Promise.resolve({ docs: [] })
    })
    findByID = vi.fn(({ collection }) =>
      collection === 'purchases'
        ? Promise.resolve(purchases[0])
        : licenseDoc
        ? Promise.resolve(licenseDoc)
        : Promise.reject(new Error('gone'))
    )
    getPayloadClient.mockResolvedValue({ find, findByID })
  }

  beforeEach(() => {
    process.env.ACCESS_LINK_SECRET = 'test-secret-for-onboarding'
    track = vi.fn()
    window.whop = { track }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    purchases = [creemRow()]
    database()
  })

  afterEach(() => {
    delete window.whop
    vi.unstubAllGlobals()
  })

  it('asks a signed Creem buyer for a GitHub account', async () => {
    const { container } = await renderPage({
      ...link(),
      // Creem's own additions to the success_url are ignored.
      checkout_id: 'ch_1',
      order_id: 'ord_1',
      signature: 'creem-own',
    })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        where: { creemRequestId: { equals: REQUEST_ID } },
      })
    )
    expect(screen.getByLabelText(/github username/i)).toHaveValue('')
    expect(container.querySelector('input[name="r"]')).toHaveValue(REQUEST_ID)
    expect(container.querySelector('input[name="s"]')).toHaveValue(link().s)
    expect(
      screen.getByRole('button', { name: /send my invitation/i })
    ).toBeInTheDocument()
    // Nothing is claimed delivered, and no clone command is shown yet.
    expect(container.textContent).not.toMatch(/git clone/i)
  })

  it('shows "Confirming your payment" for a signed link with no row yet', async () => {
    purchases = []
    const { container } = await renderPage(link())

    expect(
      screen.getByRole('heading', { name: /confirming your payment/i })
    ).toBeInTheDocument()
    expect(container.textContent).toMatch(/do not need to pay again/i)
    expect(screen.queryByLabelText(/github username/i)).toBeNull()
    // The retry keeps the signed link, or it would land on the manual state.
    expect(pendingRefreshProps.at(-1)).toMatchObject({
      keepParams: link(),
      attempt: 0,
    })
  })

  it('offers a refresh of the signed link once the checks run out', async () => {
    purchases = []
    await renderPage({ ...link(), attempt: '6' })

    const href = screen
      .getByRole('link', { name: /refresh the page/i })
      .getAttribute('href')
    expect(href).toBe(
      `/checkout/onboarding?r=${encodeURIComponent(
        link().r
      )}&s=${encodeURIComponent(link().s)}`
    )
  })

  it('shows the stepper on the GitHub step, and the kit’s next steps', async () => {
    const { container } = await renderPage(link())

    expect(
      screen.getByRole('list', { name: /setup progress/i })
    ).toBeInTheDocument()
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent(
      'GitHub account'
    )
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'From invite to running app.' })
    ).toBeInTheDocument()
    for (const step of ['Accept the invite', 'Clone and run', 'Add your key']) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument()
    }
    expect(screen.getByText('pnpm install')).toBeInTheDocument()
  })

  it('moves the stepper on once the account is on file', async () => {
    purchases = [
      creemRow({
        githubUsername: 'octocat',
        githubRepo: 'amwaredotdev/warekit-next-netsuite',
        fulfillmentStatus: 'sent',
      }),
    ]
    const { container } = await renderPage(link())

    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent(
      'License key'
    )
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
    // The delivered steps already walk through the same three things.
    expect(
      screen.queryByRole('heading', { name: 'From invite to running app.' })
    ).toBeNull()
  })

  it('leaves out the next steps for a kit with no story', async () => {
    const reactKit = {
      ...teamKit,
      name: 'WareKit React NetSuite (Team)',
      slug: 'warekit-react-netsuite-team',
      stack: 'react-netsuite',
    }
    purchases = [
      creemRow({ item: { relationTo: 'products', value: reactKit } }),
    ]
    await renderPage(link())

    expect(
      screen.getByRole('list', { name: /setup progress/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'From invite to running app.' })
    ).toBeNull()
  })

  it('shows no stepper on a state that cannot describe a purchase', async () => {
    purchases = []
    await renderPage(link())
    expect(screen.queryByRole('list', { name: /setup progress/i })).toBeNull()
  })

  it('rejects an unsigned r', async () => {
    for (const params of [
      { r: REQUEST_ID },
      { r: REQUEST_ID, s: 'forged' },
      // A real signature for some other request id.
      { r: 'some-other-id', s: link().s },
      // A good Whop param beside a bad r never rescues it.
      { r: REQUEST_ID, s: 'forged', payment_id: 'pay_1' },
    ]) {
      find.mockClear()
      const { container, unmount } = await renderPage(params)
      expect(
        screen.getByRole('heading', { name: /check your email/i })
      ).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/github username/i)
      expect(find).not.toHaveBeenCalled()
      unmount()
    }
    expect(track).not.toHaveBeenCalled()
  })

  it('pre-fills the username from a Lite claim on the same license', async () => {
    database({ lite: 'octocat-lite' })
    await renderPage(link())

    expect(screen.getByLabelText(/github username/i)).toHaveValue(
      'octocat-lite'
    )
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        sort: '-createdAt',
        where: {
          and: expect.arrayContaining([
            { license: { equals: 5 } },
            { grantsTier: { equals: 'lite' } },
          ]),
        },
      })
    )
  })

  it('leaves the field empty when the license has no Lite claim', async () => {
    database({ lite: null })
    await renderPage(link())
    expect(screen.getByLabelText(/github username/i)).toHaveValue('')
  })

  /* The pixel stays off a signed link, so a kit sale reports nothing here,
     before or after delivery. See privatePaths.js. */
  it('reports no purchase on a signed link', async () => {
    purchases = [creemRow({ amount: 99900, currency: 'usd' })]
    const first = await renderPage(link())
    first.unmount()
    purchases = [
      creemRow({
        amount: 99900,
        fulfillmentStatus: 'sent',
        githubUsername: 'octocat',
      }),
    ]
    await renderPage(link())

    expect(track).not.toHaveBeenCalled()
  })

  it('reports nothing before the payment has arrived or for a refunded row', async () => {
    purchases = []
    const first = await renderPage(link())
    first.unmount()
    purchases = [creemRow({ status: 'refunded' })]
    await renderPage(link())

    expect(track).not.toHaveBeenCalled()
  })

  it('does not report a Whop purchase, which Whop records itself', async () => {
    find = vi.fn().mockResolvedValue({ docs: [row()] })
    getPayloadClient.mockResolvedValue({ find })
    await renderPage({ payment_id: 'pay_1' })
    expect(track).not.toHaveBeenCalled()
  })

  it('offers the license page after delivery', async () => {
    database({ key: 'KEY' + 'k'.repeat(20) + 'WXYZ' })
    purchases = [
      creemRow({
        fulfillmentStatus: 'sent',
        githubUsername: 'octocat',
        githubRepo: 'amwaredotdev/warekit-next-netsuite',
      }),
    ]
    await renderPage(link())

    expect(screen.queryByLabelText(/github username/i)).toBeNull()
    const open = screen.getByRole('link', { name: /open your license page/i })
    const href = open.getAttribute('href')
    expect(href).toMatch(/^\/access\/seats\/[^/]+$/)
    expect(
      screen.getByRole('heading', { name: 'Add your key to .env' })
    ).toBeInTheDocument()

    // The link opens this buyer's own license.
    const claims = verifyAccessToken(href.split('/').pop())
    expect(claims).toMatchObject({
      purchaseId: 99,
      licenseId: 5,
      itemType: 'product',
      itemId: 7,
    })
    // The key shown is the license's current one, masked.
    expect(screen.getByText('••••WXYZ')).toBeInTheDocument()
  })

  it('counts developers from the license, not the purchased product alone', async () => {
    database({ licenseDoc: { ...license, seatOverride: 8 } })
    purchases = [
      creemRow({ fulfillmentStatus: 'sent', githubUsername: 'octocat' }),
    ]
    await renderPage(link())
    expect(screen.getByText(/covers 8 developers/)).toBeInTheDocument()
  })

  describe('when the first attach failed and the purchase has no license', () => {
    beforeEach(() => {
      purchases = [creemRow({ license: null })]
      database({ licenseDoc: null })
    })

    it('still asks for the account, from the product alone', async () => {
      await renderPage(link())
      expect(screen.getByLabelText(/github username/i)).toHaveValue('')
    })

    it('still ends on a license page link and the product’s developer count', async () => {
      purchases = [
        creemRow({
          license: null,
          fulfillmentStatus: 'sent',
          githubUsername: 'octocat',
        }),
      ]
      await renderPage(link())

      expect(screen.getByText(/covers 5 developers/)).toBeInTheDocument()
      const href = screen
        .getByRole('link', { name: /open your license page/i })
        .getAttribute('href')
      const claims = verifyAccessToken(href.split('/').pop())
      expect(claims.purchaseId).toBe(99)
      expect(claims.licenseId).toBeUndefined()
    })
  })

  it('still renders when the license lookup itself fails', async () => {
    findByID.mockRejectedValue(new Error('db'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderPage(link())
    error.mockRestore()

    expect(screen.getByLabelText(/github username/i)).toBeInTheDocument()
  })

  it('leaves out the license page step when no token can be signed', async () => {
    process.env.ACCESS_LINK_SECRET = 'test-secret-for-onboarding'
    purchases = [
      creemRow({ fulfillmentStatus: 'sent', githubUsername: 'octocat' }),
    ]
    // A purchased item with no id cannot name what the link opens.
    purchases[0].item.value = { ...teamKit, id: undefined }
    await renderPage(link())
    expect(screen.queryByText('Add your key to .env')).toBeNull()
  })

  it('does not ask a question the action would refuse, for a row owed by hand', async () => {
    purchases = [creemRow({ fulfillmentStatus: 'failed' })]
    const { container } = await renderPage(link())

    expect(screen.queryByLabelText(/github username/i)).toBeNull()
    expect(container.textContent).toMatch(/payment is safe/i)
    expect(container.textContent).toMatch(/do not need to pay again/i)
  })

  it('shows nothing about a signed link whose purchase was refunded', async () => {
    purchases = [creemRow({ status: 'refunded' })]
    const { container } = await renderPage(link())

    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('WareKit Next NetSuite')
  })

  it('does not ask a signed buyer of a guide for anything', async () => {
    purchases = [creemRow({ item: { relationTo: 'products', value: guide } })]
    await renderPage(link())

    expect(screen.queryByLabelText(/github username/i)).toBeNull()
    expect(
      screen.getByRole('heading', { name: /your purchase is confirmed/i })
    ).toBeInTheDocument()
  })

  describe('the license link', () => {
    const DAY = 24 * 60 * 60 * 1000
    const answered = (over = {}) =>
      creemRow({
        fulfillmentStatus: 'sent',
        githubUsername: 'octocat',
        githubInviteUrl: 'https://github.com/invite/1',
        ...over,
      })

    it('is not minted, or sent to the browser, while the row is unanswered', async () => {
      const { container } = await renderPage(link())

      expect(screen.getByLabelText(/github username/i)).toBeInTheDocument()
      expect(container.innerHTML).not.toContain('/access/seats/')
      expect(container.innerHTML).not.toContain('/access/resend')
    })

    it('is minted once the row is answered and the purchase is young', async () => {
      purchases = [
        answered({ createdAt: new Date(Date.now() - 29 * DAY).toISOString() }),
      ]
      await renderPage(link())

      expect(
        screen.getByRole('link', { name: /open your license page/i })
      ).toHaveAttribute('href', expect.stringMatching(/^\/access\/seats\//))
    })

    it('is replaced by the resend route once the purchase is older than 30 days', async () => {
      purchases = [
        answered({ createdAt: new Date(Date.now() - 31 * DAY).toISOString() }),
      ]
      const { container } = await renderPage(link())

      expect(
        screen.getByRole('link', { name: /email me a new license link/i })
      ).toHaveAttribute('href', '/access/resend')
      expect(container.innerHTML).not.toContain('/access/seats/')
    })

    it('is not minted for a purchase with no creation date', async () => {
      purchases = [answered({ createdAt: undefined })]
      const { container } = await renderPage(link())
      expect(container.innerHTML).not.toContain('/access/seats/')
    })
  })

  describe('a license with no seat left', () => {
    const fullMembers = ['a', 'b', 'c', 'd', 'e'].map((n) => ({
      githubUsername: n,
    }))

    it('shows no form it would refuse, and points at the receipt email', async () => {
      database({ licenseDoc: { ...license, seatMembers: fullMembers } })
      const { container } = await renderPage(link())

      expect(screen.queryByLabelText(/github username/i)).toBeNull()
      expect(
        screen.queryByRole('button', { name: /send my invitation/i })
      ).toBeNull()
      expect(container.textContent).toMatch(
        /covers 5 developers and all of them are in use/i
      )
      expect(container.textContent).toMatch(
        /license link in your receipt email/i
      )
    })

    it('still shows the form while a seat is free', async () => {
      database({
        licenseDoc: { ...license, seatMembers: fullMembers.slice(0, 4) },
      })
      await renderPage(link())
      expect(screen.getByLabelText(/github username/i)).toBeInTheDocument()
    })

    it('still offers a retry to an account that already holds a seat', async () => {
      database({
        licenseDoc: {
          ...license,
          seatMembers: [
            ...fullMembers.slice(0, 4),
            { githubUsername: 'OctoCat' },
          ],
        },
      })
      purchases = [creemRow({ githubUsername: 'octocat' })]
      await renderPage(link())
      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument()
    })

    it('does not offer a retry to an account that would be one past the limit', async () => {
      database({ licenseDoc: { ...license, seatMembers: fullMembers } })
      purchases = [creemRow({ githubUsername: 'octocat' })]
      await renderPage(link())
      expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
    })
  })

  describe('after an invitation that failed', () => {
    it('offers Try again with the account fixed, and no field to change it', async () => {
      purchases = [creemRow({ githubUsername: 'octocat' })]
      const { container } = await renderPage(link())

      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/github username/i)).toBeNull()
      expect(
        container.querySelector('input[name="githubUsername"]')
      ).toHaveValue('octocat')
      expect(container.textContent).toMatch(/by hand within one business day/i)
    })

    it('does not offer it once an invitation link exists', async () => {
      purchases = [
        creemRow({
          githubUsername: 'octocat',
          githubInviteUrl: 'https://github.com/invite/1',
        }),
      ]
      await renderPage(link())
      expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
    })
  })
})

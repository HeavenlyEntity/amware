import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* The page is an async server component: it is called with its params and
   the element it resolves to is rendered. Only the database is mocked. What
   is asserted is what a holder of a signed link sees, including the links
   that lead nowhere, because a buyer must never meet a thrown error. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { createAccessToken } from '@/lib/commerce/accessToken'
import LicensePage, { metadata } from '../page'

const KEY = 'WAREKIT-ABCD-EFGH-IJKL-1234'

const teamKit = {
  id: 7,
  name: 'WareKit Next NetSuite (Team)',
  seats: 5,
  netsuiteAccounts: 3,
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
}

let db

/* A tiny stand-in for the three reads the page makes. */
function mockDb({ license, purchase, product = teamKit, key = KEY } = {}) {
  db = {
    findByID: vi.fn(async ({ collection, id }) => {
      const row = collection === 'licenses' ? license : purchase
      if (!row || row.id !== id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return row
    }),
    find: vi.fn(async ({ collection }) =>
      collection === 'products'
        ? { docs: product ? [product] : [] }
        : {
            docs: key
              ? [{ licenseKey: key, status: 'paid', createdAt: '2026-10-01' }]
              : [],
          }
    ),
  }
  getPayloadClient.mockResolvedValue(db)
}

const license = (over = {}) => ({
  id: 9,
  tier: 'team',
  stack: 'next-netsuite',
  seatMembers: [{ githubUsername: 'owner' }],
  accounts: [],
  ...over,
})

const token = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 7,
    ...claims,
  }).token

const renderPage = async (tok) =>
  render(await LicensePage({ params: Promise.resolve({ token: tok }) }))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACCESS_LINK_SECRET = 'license-page-secret'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('License page', () => {
  it('is titled "Your license" and stays out of search', () => {
    expect(metadata.title).toBe('Your license')
    expect(metadata.robots).toEqual({ index: false })
  })

  it('shows the whole license for a purchase that has one', async () => {
    mockDb({ license: license(), purchase: { id: 42, license: 9 } })
    const { container } = await renderPage(token())

    expect(
      screen.getByRole('heading', { level: 1, name: /Team\)$/ })
    ).toBeInTheDocument()
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
    expect(screen.getByText('0 / 3 NetSuite accounts')).toBeInTheDocument()
    expect(screen.getByText('••••1234')).toBeInTheDocument()
    // The full key is not in the markup until the buyer reveals it.
    expect(container.innerHTML).not.toContain(KEY)
  })

  it('works from a token that names only a license', async () => {
    mockDb({ license: license(), purchase: null })
    await renderPage(token({ purchaseId: null, licenseId: 9 }))
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
  })

  it('reads limits from the license tier, not the token item', async () => {
    mockDb({
      license: license({ tier: 'pro' }),
      purchase: { id: 42, license: 9 },
      product: { ...teamKit, seats: 1, netsuiteAccounts: 1 },
    })
    // The token's itemId can be an older tier's row; the page ignores it.
    await renderPage(token({ itemId: 3 }))
    expect(screen.getByText('1 / 1 developers')).toBeInTheDocument()
    const productQuery = db.find.mock.calls.find(
      ([q]) => q.collection === 'products'
    )[0]
    expect(JSON.stringify(productQuery.where)).toContain('"pro"')
  })

  it('sends a tampered link to the invalid page', async () => {
    mockDb({ license: license(), purchase: { id: 42, license: 9 } })
    await renderPage('not.a.token')
    expect(
      screen.getByRole('heading', { name: /invalid or expired/i })
    ).toBeInTheDocument()
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('answers an old token whose purchase has no license with a get-in-touch, not a throw', async () => {
    mockDb({ license: null, purchase: { id: 42, license: null } })
    await renderPage(token())
    expect(
      screen.getByRole('heading', { name: /could not find this license/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('says the license was refunded', async () => {
    mockDb({
      license: license({ tier: null }),
      purchase: { id: 42, license: 9 },
      product: null,
    })
    await renderPage(token())
    expect(screen.getByText(/this license was refunded/i)).toBeInTheDocument()
  })

  it('does not show a made-up limit when the kit row is missing', async () => {
    mockDb({
      license: license(),
      purchase: { id: 42, license: 9 },
      product: null,
    })
    await renderPage(token())
    expect(screen.queryByText(/developers$/)).toBeNull()
    expect(
      screen.getByRole('heading', { name: /could not read this license/i })
    ).toBeInTheDocument()
  })

  it('shows a refreshable message when the database fails, and does not throw', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection refused'))
    await renderPage(token())
    expect(
      screen.getByRole('heading', { name: /could not be loaded/i })
    ).toBeInTheDocument()
    expect(screen.queryByText(/connection refused/)).toBeNull()
  })

  it.each(['purchases', 'licenses'])(
    'shows the refresh state, not "could not find", when the %s read fails',
    async (failing) => {
      mockDb({ license: license(), purchase: { id: 42, license: 9 } })
      const ok = db.findByID.getMockImplementation()
      db.findByID.mockImplementation(async (args) => {
        if (args.collection === failing) {
          throw Object.assign(new Error('connection terminated'), {
            status: 500,
          })
        }
        return ok(args)
      })
      await renderPage(token())
      expect(
        screen.getByRole('heading', { name: /could not be loaded/i })
      ).toBeInTheDocument()
      expect(screen.queryByText(/could not find this license/i)).toBeNull()
    }
  )

  it('tells a license with no key to get in touch', async () => {
    mockDb({
      license: license(),
      purchase: { id: 42, license: 9 },
      key: null,
    })
    await renderPage(token())
    expect(screen.getByText(/get in touch for your key/i)).toBeInTheDocument()
  })
})

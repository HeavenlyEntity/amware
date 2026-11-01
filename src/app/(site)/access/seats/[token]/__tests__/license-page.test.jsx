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

/* Pro and Team rows for the upgrade price: $999 less $499. */
const proKit = {
  id: 6,
  name: 'WareKit Next NetSuite (Pro)',
  tier: 'pro',
  stack: 'next-netsuite',
  status: 'published',
  price: 499,
  seats: 1,
  netsuiteAccounts: 1,
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
}
const teamRow = {
  ...teamKit,
  tier: 'team',
  stack: 'next-netsuite',
  status: 'published',
  price: 999,
}

let db

/* A tiny stand-in for the three reads the page makes. `products` is the whole
   kit table, answered by the tier a query asks for, for the pages that read a
   second row to price an upgrade. */
function mockDb({
  license,
  purchase,
  product = teamKit,
  products,
  key = KEY,
} = {}) {
  db = {
    findByID: vi.fn(async ({ collection, id }) => {
      const row = collection === 'licenses' ? license : purchase
      if (!row || row.id !== id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return row
    }),
    find: vi.fn(async ({ collection, where }) =>
      collection === 'products'
        ? products
          ? {
              docs: products.filter((row) =>
                where.and.every((clause) => {
                  const [field, test] = Object.entries(clause)[0]
                  return row[field] === test.equals
                })
              ),
            }
          : { docs: product ? [product] : [] }
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

const renderPage = async (tok, searchParams) =>
  render(
    await LicensePage({
      params: Promise.resolve({ token: tok }),
      ...(searchParams ? { searchParams: Promise.resolve(searchParams) } : {}),
    })
  )

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

  describe('upgrading', () => {
    const proPage = (over = {}) =>
      mockDb({
        license: license({ tier: 'pro', ...over.license }),
        purchase: { id: 42, license: 9 },
        products: over.products ?? [proKit, teamRow],
      })

    it('offers Team at the difference between the two rows', async () => {
      proPage()
      await renderPage(token())
      expect(
        screen.getByRole('button', { name: 'Move to Team · $500.00' })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Your code, repo and key stay the same. You get 5 developers and 3 NetSuite accounts.'
        )
      ).toBeInTheDocument()
    })

    it('follows a price change in the data', async () => {
      proPage({ products: [proKit, { ...teamRow, price: 1099.5 }] })
      await renderPage(token())
      expect(
        screen.getByRole('button', { name: 'Move to Team · $600.50' })
      ).toBeInTheDocument()
    })

    it("looks the Team row up on the license's own stack", async () => {
      proPage()
      await renderPage(token())
      const teamQuery = db.find.mock.calls
        .map(([q]) => q)
        .find(
          (q) =>
            q.collection === 'products' &&
            JSON.stringify(q.where).includes('"team"')
        )
      expect(JSON.stringify(teamQuery.where)).toContain('next-netsuite')
    })

    it.each([
      ['no Team row', { products: [proKit] }],
      ['no Team price', { products: [proKit, { ...teamRow, price: null }] }],
      ['no Pro price', { products: [{ ...proKit, price: null }, teamRow] }],
      [
        'a Team row that costs less',
        { products: [proKit, { ...teamRow, price: 100 }] },
      ],
    ])('shows no button and still loads with %s', async (_n, over) => {
      proPage(over)
      await renderPage(token())
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      expect(screen.getByText('1 / 1 developers')).toBeInTheDocument()
    })

    it('shows no button, and still loads, when the Team row cannot be read', async () => {
      proPage()
      const ok = db.find.getMockImplementation()
      db.find.mockImplementation(async (q) => {
        if (JSON.stringify(q.where ?? {}).includes('"team"')) {
          throw new Error('connection terminated')
        }
        return ok(q)
      })
      await renderPage(token())
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      expect(
        screen.getByRole('heading', { level: 1, name: /Pro\)$/ })
      ).toBeInTheDocument()
      expect(console.error).toHaveBeenCalled()
    })

    it('offers no upgrade to a Team or Lite license', async () => {
      for (const tier of ['team', 'lite']) {
        mockDb({
          license: license({ tier }),
          purchase: { id: 42, license: 9 },
          products: [{ ...proKit, tier }, teamRow],
        })
        await renderPage(token())
        expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
        document.body.innerHTML = ''
      }
    })

    it('says it is confirming, with no button, on return from Creem', async () => {
      proPage()
      await renderPage(token(), { upgraded: 'team' })
      expect(
        screen.getByText(
          "Confirming your upgrade. You don't need to pay again."
        )
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      expect(screen.getByText('Pro license')).toBeInTheDocument()
    })

    it('offers a refresh and contact once the page has checked enough', async () => {
      proPage()
      await renderPage(token(), { upgraded: 'team', attempt: '6' })
      expect(
        screen.getByText(
          "Confirming your upgrade. You don't need to pay again."
        )
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      expect(
        screen.getByRole('link', { name: 'Refresh the page' })
      ).toBeInTheDocument()
    })

    it('says "You\'re on Team." once the license is Team', async () => {
      mockDb({
        license: license({ tier: 'team' }),
        purchase: { id: 42, license: 9 },
        products: [{ ...proKit, tier: 'team' }, teamRow],
      })
      await renderPage(token(), { upgraded: 'team' })
      expect(screen.getByText("You're on Team.")).toBeInTheDocument()
    })

    it('treats the URL as wording only', async () => {
      // upgraded=team does not make a Pro license a Team license, and a
      // junk attempt or upgraded value is ignored rather than thrown on.
      proPage()
      await renderPage(token(), {
        upgraded: ['gold', 'team'],
        attempt: ['nope'],
      })
      expect(screen.queryByText(/you're on/i)).toBeNull()
      expect(screen.getByText('1 / 1 developers')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Move to Team · $500.00' })
      ).toBeInTheDocument()
    })

    it('shows the upgrade, not a refund, when the page is opened with no query', async () => {
      proPage()
      await renderPage(token(), {})
      expect(
        screen.getByRole('button', { name: /move to team/i })
      ).toBeInTheDocument()
    })
  })
})

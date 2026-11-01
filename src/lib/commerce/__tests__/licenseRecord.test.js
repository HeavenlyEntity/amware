import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  attachPurchase,
  currentKey,
  expectedProductIds,
  licenseFromClaims,
  licenseIdFrom,
  recomputeTier,
  syncTierAfterChange,
  teamProductFor,
} from '../licenseRecord'

/* A fake Payload client over canned rows. `find` answers by collection, so a
   test states what the database holds and reads back what was written. */
function fakePayload({
  licenses = [],
  purchases = [],
  products = [],
  matches = [],
} = {}) {
  const tables = { licenses, purchases, products }
  return {
    /* The search over licenses answers with `matches`: the licenses that
       share the buyer's email, stack and environment. The rest of the table
       is only reachable by id. */
    find: vi.fn(async ({ collection }) => ({
      docs: collection === 'licenses' ? matches : tables[collection],
    })),
    findByID: vi.fn(async ({ collection, id }) => {
      const row = tables[collection].find((r) => r.id === id)
      if (!row) throw Object.assign(new Error('Not Found'), { status: 404 })
      return row
    }),
    create: vi.fn(async ({ collection, data }) => ({ id: 500, ...data })),
    update: vi.fn(async ({ data }) => data),
  }
}

const updatesTo = (payload, collection) =>
  payload.update.mock.calls
    .map(([arg]) => arg)
    .filter((arg) => arg.collection === collection)

const sale = {
  purchase: { id: 7 },
  email: 'Buyer@Example.com ',
  stack: 'next-netsuite',
  environment: 'production',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('licenseIdFrom', () => {
  it('reads a string id out of checkout metadata', () => {
    expect(licenseIdFrom('42')).toBe(42)
    expect(licenseIdFrom(42)).toBe(42)
  })

  it('treats anything else as absent', () => {
    for (const bad of [
      '',
      '0',
      '-3',
      '4.5',
      '12abc',
      'abc',
      1.5,
      0,
      null,
      undefined,
      {},
    ]) {
      expect(licenseIdFrom(bad)).toBeNull()
    }
  })
})

describe('attachPurchase', () => {
  it('creates a license for a first purchase', async () => {
    const payload = fakePayload({
      purchases: [{ id: 7, status: 'paid', grantsTier: 'pro' }],
      licenses: [{ id: 500, tier: null }],
    })

    const license = await attachPurchase(payload, {
      ...sale,
      grantsTier: 'pro',
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'licenses',
        data: {
          ownerEmail: 'buyer@example.com',
          stack: 'next-netsuite',
          creemEnvironment: 'production',
        },
      })
    )
    expect(updatesTo(payload, 'purchases')[0]).toMatchObject({
      id: 7,
      data: { license: 500, grantsTier: 'pro' },
    })
    expect(updatesTo(payload, 'licenses')[0]).toMatchObject({
      id: 500,
      data: { tier: 'pro' },
    })
    expect(license).toMatchObject({ id: 500, tier: 'pro' })
  })

  it('looks for a license by lowercased email, stack and environment', async () => {
    const payload = fakePayload({ purchases: [], licenses: [{ id: 500 }] })

    await attachPurchase(payload, {
      ...sale,
      grantsTier: 'pro',
      environment: 'sandbox',
    })

    const query = payload.find.mock.calls.find(
      ([arg]) => arg.collection === 'licenses'
    )[0]
    expect(query.where.and).toEqual([
      { ownerEmail: { equals: 'buyer@example.com' } },
      { stack: { equals: 'next-netsuite' } },
      { creemEnvironment: { equals: 'sandbox' } },
    ])
  })

  it('joins a Lite license by lowercased email and raises the tier', async () => {
    const payload = fakePayload({
      licenses: [{ id: 31, tier: 'lite' }],
      matches: [{ id: 31, tier: 'lite' }],
      purchases: [
        { id: 3, status: 'paid', grantsTier: 'lite', license: 31 },
        { id: 7, status: 'paid', grantsTier: 'pro', license: 31 },
      ],
    })

    const license = await attachPurchase(payload, {
      ...sale,
      grantsTier: 'pro',
    })

    expect(payload.create).not.toHaveBeenCalled()
    expect(updatesTo(payload, 'purchases')[0].data).toEqual({
      license: 31,
      grantsTier: 'pro',
    })
    expect(updatesTo(payload, 'licenses')[0]).toMatchObject({
      id: 31,
      data: { tier: 'pro' },
    })
    expect(license).toMatchObject({ id: 31, tier: 'pro' })
  })

  it('starts a second license for a second purchase at the same tier', async () => {
    const payload = fakePayload({
      licenses: [
        { id: 31, tier: 'pro' },
        { id: 500, tier: null },
      ],
      matches: [{ id: 31, tier: 'pro' }],
      purchases: [],
    })

    const license = await attachPurchase(payload, {
      ...sale,
      grantsTier: 'pro',
    })

    expect(payload.create).toHaveBeenCalledTimes(1)
    expect(license.id).toBe(500)
  })

  it('flags a full-price Team sale joining a Pro license', async () => {
    const payload = fakePayload({
      licenses: [{ id: 31, tier: 'pro' }],
      matches: [{ id: 31, tier: 'pro' }],
      purchases: [],
    })

    await attachPurchase(payload, { ...sale, grantsTier: 'team' })

    expect(updatesTo(payload, 'licenses')).toContainEqual(
      expect.objectContaining({ id: 31, data: { needsReview: true } })
    )
  })

  it('does not flag Pro joining a Lite license', async () => {
    const payload = fakePayload({
      licenses: [{ id: 31, tier: 'lite' }],
      matches: [{ id: 31, tier: 'lite' }],
      purchases: [],
    })

    await attachPurchase(payload, { ...sale, grantsTier: 'pro' })

    expect(
      updatesTo(payload, 'licenses').some((u) => 'needsReview' in u.data)
    ).toBe(false)
  })

  it('does not flag an upgrade that named its license', async () => {
    const payload = fakePayload({
      licenses: [{ id: 31, tier: 'pro', stack: 'next-netsuite' }],
      purchases: [{ id: 7, status: 'paid', grantsTier: 'team', license: 31 }],
    })

    await attachPurchase(payload, {
      ...sale,
      grantsTier: 'team',
      licenseId: 31,
    })

    // It joined the named license without searching by email at all.
    expect(
      payload.find.mock.calls.some(([arg]) => arg.collection === 'licenses')
    ).toBe(false)
    expect(updatesTo(payload, 'purchases')[0].data.license).toBe(31)
    expect(
      updatesTo(payload, 'licenses').some((u) => 'needsReview' in u.data)
    ).toBe(false)
  })

  describe('a named license', () => {
    const named = (over) => ({
      id: 31,
      tier: 'pro',
      stack: 'next-netsuite',
      ...over,
    })

    it('refuses a sandbox payment naming a production license', async () => {
      const payload = fakePayload({ licenses: [named()] })

      await expect(
        attachPurchase(payload, {
          ...sale,
          grantsTier: 'team',
          licenseId: 31,
          environment: 'sandbox',
        })
      ).rejects.toThrow(/not attached/)
      expect(payload.update).not.toHaveBeenCalled()
      expect(payload.create).not.toHaveBeenCalled()
    })

    it('refuses a production payment naming a sandbox license', async () => {
      const payload = fakePayload({
        licenses: [named({ creemEnvironment: 'sandbox' })],
      })
      await expect(
        attachPurchase(payload, { ...sale, grantsTier: 'team', licenseId: 31 })
      ).rejects.toThrow(/not attached/)
      expect(payload.update).not.toHaveBeenCalled()
    })

    it('refuses a license on another stack', async () => {
      const payload = fakePayload({
        licenses: [named({ stack: 'react-netsuite' })],
      })
      await expect(
        attachPurchase(payload, { ...sale, grantsTier: 'team', licenseId: 31 })
      ).rejects.toThrow(/not attached/)
      expect(payload.update).not.toHaveBeenCalled()
    })

    it('refuses a license that does not exist', async () => {
      const payload = fakePayload({ licenses: [] })
      await expect(
        attachPurchase(payload, { ...sale, grantsTier: 'team', licenseId: 31 })
      ).rejects.toThrow()
      expect(payload.update).not.toHaveBeenCalled()
    })

    it('does not compare the buyer’s email with the owner’s', async () => {
      const payload = fakePayload({
        licenses: [named({ ownerEmail: 'owner@example.com' })],
        purchases: [{ id: 7, status: 'paid', grantsTier: 'team', license: 31 }],
      })
      // `sale.email` is someone else's card paying for the owner's upgrade.
      await expect(
        attachPurchase(payload, { ...sale, grantsTier: 'team', licenseId: 31 })
      ).resolves.toMatchObject({ id: 31 })
    })
  })

  it('ignores a license id that is not a positive integer', async () => {
    const payload = fakePayload({ licenses: [{ id: 500 }], purchases: [] })

    await attachPurchase(payload, {
      ...sale,
      grantsTier: 'pro',
      licenseId: 'abc',
    })

    expect(payload.create).toHaveBeenCalledTimes(1)
  })
})

describe('recomputeTier', () => {
  it('derives tier from paid purchases only', async () => {
    const payload = fakePayload({
      licenses: [{ id: 9, tier: 'team' }],
      purchases: [
        { id: 1, status: 'paid', grantsTier: 'pro' },
        { id: 2, status: 'refunded', grantsTier: 'team' },
      ],
    })

    await expect(recomputeTier(payload, 9)).resolves.toEqual({
      tier: 'pro',
      changed: true,
    })
    expect(updatesTo(payload, 'licenses')[0].data.tier).toBe('pro')
  })

  it('sets tierChangedAt only when the tier changes', async () => {
    const payload = fakePayload({
      licenses: [{ id: 9, tier: 'pro' }],
      purchases: [{ id: 1, status: 'paid', grantsTier: 'pro' }],
    })

    await expect(recomputeTier(payload, 9)).resolves.toEqual({
      tier: 'pro',
      changed: false,
    })
    expect(payload.update).not.toHaveBeenCalled()

    const upgraded = fakePayload({
      licenses: [{ id: 9, tier: 'pro' }],
      purchases: [
        { id: 1, status: 'paid', grantsTier: 'pro' },
        { id: 2, status: 'paid', grantsTier: 'team' },
      ],
    })
    await recomputeTier(upgraded, 9)
    const data = updatesTo(upgraded, 'licenses')[0].data
    expect(data.tier).toBe('team')
    expect(Number.isNaN(Date.parse(data.tierChangedAt))).toBe(false)
  })

  it('returns tier null when no paid purchase remains', async () => {
    const payload = fakePayload({
      licenses: [{ id: 9, tier: 'pro' }],
      purchases: [{ id: 1, status: 'refunded', grantsTier: 'pro' }],
    })

    await expect(recomputeTier(payload, 9)).resolves.toEqual({
      tier: null,
      changed: true,
    })
    expect(updatesTo(payload, 'licenses')[0].data.tier).toBeNull()
  })

  it('leaves a rowless license with no tier unchanged', async () => {
    const payload = fakePayload({ licenses: [{ id: 9 }], purchases: [] })
    await expect(recomputeTier(payload, 9)).resolves.toEqual({
      tier: null,
      changed: false,
    })
  })
})

describe('currentKey', () => {
  it('finds the key on the newest paid purchase', async () => {
    const payload = fakePayload({
      purchases: [
        { id: 1, status: 'paid', licenseKey: 'OLD', createdAt: '2026-01-01' },
        { id: 2, status: 'paid', licenseKey: 'NEW', createdAt: '2026-03-01' },
      ],
    })
    await expect(currentKey(payload, 9)).resolves.toBe('NEW')
  })

  it('skips an upgrade row, which has no key, and a refunded one', async () => {
    const payload = fakePayload({
      purchases: [
        { id: 1, status: 'paid', licenseKey: 'KEPT', createdAt: '2026-01-01' },
        { id: 2, status: 'paid', createdAt: '2026-03-01' },
        {
          id: 3,
          status: 'refunded',
          licenseKey: 'GONE',
          createdAt: '2026-04-01',
        },
      ],
    })
    await expect(currentKey(payload, 9)).resolves.toBe('KEPT')
  })

  it('returns null when no paid purchase has a key', async () => {
    const payload = fakePayload({
      purchases: [{ id: 2, status: 'paid', createdAt: '2026-03-01' }],
    })
    await expect(currentKey(payload, 9)).resolves.toBeNull()
  })
})

describe('licenseFromClaims', () => {
  const rows = {
    licenses: [{ id: 4, stack: 'next-netsuite', tier: 'team' }],
    purchases: [{ id: 8, license: 4 }],
    products: [{ id: 60, stack: 'next-netsuite', tier: 'team', seats: 5 }],
  }

  it('resolves through the purchase', async () => {
    const result = await licenseFromClaims(fakePayload(rows), { purchaseId: 8 })
    expect(result.license.id).toBe(4)
    expect(result.purchase.id).toBe(8)
    expect(result.product.id).toBe(60)
  })

  it('resolves from a license id with no purchase', async () => {
    const result = await licenseFromClaims(fakePayload(rows), {
      licenseId: 4,
      purchaseId: null,
    })
    expect(result.license.id).toBe(4)
    expect(result.purchase).toBeNull()
  })

  it('gives Enterprise no product', async () => {
    const payload = fakePayload({
      ...rows,
      licenses: [{ id: 4, stack: 'next-netsuite', tier: 'enterprise' }],
    })
    const result = await licenseFromClaims(payload, { licenseId: 4 })
    expect(result.product).toBeNull()
  })

  it('returns null when nothing resolves, without throwing', async () => {
    await expect(
      licenseFromClaims(fakePayload(rows), { purchaseId: 999 })
    ).resolves.toBeNull()
    // A purchase from before licenses existed has no license to find.
    await expect(
      licenseFromClaims(
        fakePayload({ ...rows, purchases: [{ id: 8, license: null }] }),
        { purchaseId: 8 }
      )
    ).resolves.toBeNull()
  })
})

describe('licenseFromClaims: a failure is not a missing license', () => {
  const rows = {
    licenses: [{ id: 4, stack: 'next-netsuite', tier: 'team' }],
    purchases: [{ id: 8, license: 4 }],
    products: [{ id: 60, stack: 'next-netsuite', tier: 'team', seats: 5 }],
  }
  const down = Object.assign(new Error('connection terminated'), {
    status: 500,
  })

  it('rethrows when the purchase read fails', async () => {
    const payload = fakePayload(rows)
    payload.findByID.mockRejectedValueOnce(down)
    await expect(licenseFromClaims(payload, { purchaseId: 8 })).rejects.toBe(
      down
    )
  })

  it('rethrows when the license read fails', async () => {
    const payload = fakePayload(rows)
    payload.findByID.mockImplementation(async ({ collection }) => {
      if (collection === 'licenses') throw down
      return rows.purchases[0]
    })
    await expect(licenseFromClaims(payload, { purchaseId: 8 })).rejects.toBe(
      down
    )
  })

  it('rethrows an error with no status at all, as it cannot be proven missing', async () => {
    const payload = fakePayload(rows)
    payload.findByID.mockRejectedValueOnce(new Error('boom'))
    await expect(licenseFromClaims(payload, { purchaseId: 8 })).rejects.toThrow(
      'boom'
    )
  })

  it('rethrows when the kit row lookup fails', async () => {
    const payload = fakePayload(rows)
    payload.find.mockRejectedValueOnce(down)
    await expect(licenseFromClaims(payload, { purchaseId: 8 })).rejects.toBe(
      down
    )
  })

  it('still answers null for a 404', async () => {
    const payload = fakePayload(rows)
    await expect(
      licenseFromClaims(payload, { purchaseId: 999 })
    ).resolves.toBeNull()
  })
})

describe('expectedProductIds', () => {
  const item = {
    creemProductId: 'prod_live',
    creemSandboxProductId: 'prod_test',
    creemUpgradeProductId: 'up_live',
    creemUpgradeSandboxProductId: 'up_test',
  }

  it('expects the live product in production and the test one in the sandbox', () => {
    expect(expectedProductIds({ item, env: 'production' })).toEqual([
      'prod_live',
    ])
    expect(expectedProductIds({ item, env: 'sandbox' })).toEqual(['prod_test'])
  })

  it('expects the upgrade product only for an upgrade', () => {
    expect(
      expectedProductIds({ item, upgrade: 'team', env: 'production' })
    ).toEqual(['up_live'])
    expect(
      expectedProductIds({ item, upgrade: 'team', env: 'sandbox' })
    ).toEqual(['up_test'])
    expect(expectedProductIds({ item, env: 'production' })).not.toContain(
      'up_live'
    )
  })

  it('does not accept the full-price product for an upgrade', () => {
    expect(
      expectedProductIds({ item, upgrade: 'team', env: 'production' })
    ).not.toContain('prod_live')
  })

  it('expects a license quote, but only in the license’s own environment', () => {
    const quoted = { quoteCreemProductId: 'prod_quote' }
    expect(
      expectedProductIds({ item, license: quoted, env: 'production' })
    ).toEqual(['prod_live', 'prod_quote'])
    expect(
      expectedProductIds({
        item,
        license: quoted,
        upgrade: 'enterprise',
        env: 'production',
      })
    ).toEqual(['prod_quote'])
    expect(
      expectedProductIds({
        item,
        license: { ...quoted, creemEnvironment: 'sandbox' },
        upgrade: 'enterprise',
        env: 'production',
      })
    ).toEqual([])
  })

  it('expects nothing for an Enterprise upgrade on a license with no quote', () => {
    expect(
      expectedProductIds({
        item,
        license: {},
        upgrade: 'enterprise',
        env: 'production',
      })
    ).toEqual([])
  })

  it('is empty for a missing item', () => {
    expect(expectedProductIds({ item: null, env: 'production' })).toEqual([])
  })
})

describe('teamProductFor', () => {
  it('asks for the published Team row of the stack', async () => {
    const payload = fakePayload({
      products: [{ id: 60, stack: 'next-netsuite', tier: 'team' }],
    })
    await expect(teamProductFor(payload, 'next-netsuite')).resolves.toEqual({
      id: 60,
      stack: 'next-netsuite',
      tier: 'team',
    })
    const query = payload.find.mock.calls[0][0]
    expect(query.collection).toBe('products')
    expect(query.where.and).toEqual([
      { stack: { equals: 'next-netsuite' } },
      { tier: { equals: 'team' } },
      { status: { equals: 'published' } },
    ])
  })

  it('is null when the stack has no Team row, or no stack is named', async () => {
    const payload = fakePayload({ products: [] })
    await expect(teamProductFor(payload, 'next-netsuite')).resolves.toBeNull()
    await expect(teamProductFor(payload, null)).resolves.toBeNull()
    expect(payload.find).toHaveBeenCalledTimes(1)
  })

  it('throws when the database cannot be read', async () => {
    const payload = { find: vi.fn().mockRejectedValue(new Error('down')) }
    await expect(teamProductFor(payload, 'next-netsuite')).rejects.toThrow(
      'down'
    )
  })
})

describe('recomputeTier with a request', () => {
  it('passes the request to every query so it joins the transaction', async () => {
    const payload = fakePayload({
      licenses: [{ id: 5, tier: 'pro' }],
      purchases: [{ id: 1, license: 5, status: 'paid', grantsTier: 'team' }],
    })
    const req = { transactionID: 'tx_1' }

    await recomputeTier(payload, 5, { req })

    for (const call of [
      ...payload.find.mock.calls,
      ...payload.findByID.mock.calls,
      ...payload.update.mock.calls,
    ]) {
      expect(call[0].req).toBe(req)
    }
    expect(payload.update).toHaveBeenCalledTimes(1)
  })

  it('adds no request when none is given', async () => {
    const payload = fakePayload({ licenses: [{ id: 5, tier: null }] })

    await recomputeTier(payload, 5)

    expect(payload.find.mock.calls[0][0]).not.toHaveProperty('req')
  })
})

describe('syncTierAfterChange', () => {
  const run = (args, payload = fakePayload({ licenses: [{ id: 5 }] })) => {
    const req = { payload }
    return {
      req,
      payload,
      done: syncTierAfterChange({ operation: 'update', req, ...args }),
    }
  }

  it('recomputes the tier when status changes, inside the same request', async () => {
    const paid = { id: 1, license: 5, status: 'paid', grantsTier: 'pro' }
    const { payload, req, done } = run({
      doc: { ...paid, status: 'refunded' },
      previousDoc: paid,
    })

    await done

    expect(payload.find).toHaveBeenCalledTimes(1)
    expect(payload.find.mock.calls[0][0].req).toBe(req)
  })

  it('recomputes when the tier a row grants changes', async () => {
    const before = { id: 1, license: 5, status: 'paid', grantsTier: 'pro' }
    const { payload, done } = run({
      doc: { ...before, grantsTier: 'team' },
      previousDoc: before,
    })
    await done
    expect(payload.find).toHaveBeenCalled()
  })

  it('reads a license that arrives populated', async () => {
    const before = { id: 1, license: 5, status: 'paid' }
    const { payload, done } = run({
      doc: { ...before, license: { id: 5 }, status: 'refunded' },
      previousDoc: before,
    })
    await done
    expect(payload.findByID.mock.calls[0][0].id).toBe(5)
  })

  it('does nothing for an unrelated edit', async () => {
    const row = { id: 1, license: 5, status: 'paid', grantsTier: 'pro' }
    const { payload, done } = run({
      doc: { ...row, githubInviteUrl: 'x' },
      previousDoc: row,
    })
    await done
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('does nothing for a row with no license', async () => {
    const { payload, done } = run({
      doc: { id: 1, status: 'refunded' },
      previousDoc: { id: 1, status: 'paid' },
    })
    await done
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('writes only to licenses, so it cannot trigger itself', async () => {
    const payload = fakePayload({
      licenses: [{ id: 5, tier: 'pro' }],
      purchases: [],
    })
    const row = { id: 1, license: 5, status: 'paid', grantsTier: 'pro' }
    await run(
      { doc: { ...row, status: 'refunded' }, previousDoc: row },
      payload
    ).done
    expect(updatesTo(payload, 'purchases')).toEqual([])
    expect(updatesTo(payload, 'licenses')).toHaveLength(1)
  })

  it('recomputes the license a row moves to and the one it left', async () => {
    const payload = fakePayload({
      licenses: [
        { id: 5, tier: 'team' },
        { id: 6, tier: null },
      ],
    })
    const before = { id: 1, license: 5, status: 'paid', grantsTier: 'team' }
    await run({ doc: { ...before, license: 6 }, previousDoc: before }, payload)
      .done

    const read = payload.findByID.mock.calls.map(([arg]) => arg.id)
    expect(read.sort()).toEqual([5, 6])
  })

  it('recomputes the old license when the relation is cleared', async () => {
    const payload = fakePayload({ licenses: [{ id: 5, tier: 'team' }] })
    const before = { id: 1, license: { id: 5 }, status: 'paid' }
    await run(
      { doc: { ...before, license: null }, previousDoc: before },
      payload
    ).done

    expect(payload.findByID.mock.calls.map(([arg]) => arg.id)).toEqual([5])
  })

  it('does not recompute for an unchanged populated relation', async () => {
    const payload = fakePayload({ licenses: [{ id: 5 }] })
    const row = { id: 1, license: 5, status: 'paid' }
    await run(
      { doc: { ...row, license: { id: 5 } }, previousDoc: row },
      payload
    ).done
    expect(payload.find).not.toHaveBeenCalled()
  })

  describe('when the recompute fails', () => {
    const row = { id: 1, license: 5, status: 'paid' }
    const doc = { ...row, status: 'refunded' }
    const fail = () => {
      const payload = fakePayload({ licenses: [{ id: 5 }] })
      payload.find.mockRejectedValue(new Error('db down'))
      return payload
    }

    it('rethrows once the query has killed the transaction', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = fail()
      // A failed query given `req` makes Payload delete the id.
      const req = { payload, transactionID: 'tx_1' }
      payload.find.mockImplementation(async () => {
        delete req.transactionID
        throw new Error('db down')
      })

      await expect(
        syncTierAfterChange({ doc, previousDoc: row, operation: 'update', req })
      ).rejects.toThrow('db down')
      error.mockRestore()
    })

    it('swallows and logs while the transaction is still alive', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const req = { payload: fail(), transactionID: 'tx_1' }

      await expect(
        syncTierAfterChange({ doc, previousDoc: row, operation: 'update', req })
      ).resolves.toBe(doc)
      expect(req.transactionID).toBe('tx_1')
      expect(error).toHaveBeenCalled()
      error.mockRestore()
    })
  })
})

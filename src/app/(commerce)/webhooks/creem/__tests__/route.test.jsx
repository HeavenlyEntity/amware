import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/creem', () => ({
  verifyCreemSignature: vi.fn(() => true),
}))
vi.mock('@/lib/commerce/licenseRevoke', () => ({
  revokeLicenseAccess: vi.fn(),
}))
vi.mock('@/lib/commerce/accessToken', () => ({
  tryCreateAccessToken: vi.fn(() => ({ ok: true, token: 'tok', jti: 'jti' })),
}))
vi.mock('@/lib/commerce/onboardingLink', () => ({ onboardingPath: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
/* Only the write is faked. The pure rules (which product ids are expected,
   what a license id looks like) stay real, because they are what is under
   test here. */
vi.mock('@/lib/commerce/licenseRecord', async (importOriginal) => ({
  ...(await importOriginal()),
  attachPurchase: vi.fn(),
}))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendAccessLinkEmail: vi.fn(),
  sendBoilerplateConfirmationEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyCreemSignature } from '@/lib/commerce/creem'
import { revokeLicenseAccess } from '@/lib/commerce/licenseRevoke'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import {
  sendAccessLinkEmail,
  sendBoilerplateConfirmationEmail,
} from '@/lib/commerce/fulfillment'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase } from '@/lib/commerce/licenseRecord'
import { POST } from '../route'

const completed = ({
  itemType,
  itemId = 12,
  productId = 'prod_guide',
  metadata = {},
  orderId = 'ord_1',
}) =>
  new Request('https://example.com/webhooks/creem', {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'checkout.completed',
      object: {
        id: 'chk_1',
        order: { id: orderId, amount: 1200, currency: 'USD' },
        customer: { email: 'buyer@example.com' },
        product: { id: productId },
        metadata: { itemType, itemId: String(itemId), ...metadata },
        request_id: 'req_1',
      },
    }),
  })

const withItem = (item, { license = null, existing = [] } = {}) => {
  const payload = {
    find: vi.fn().mockResolvedValue({ docs: existing }),
    findByID: vi.fn(async ({ collection }) => {
      if (collection !== 'licenses') return item
      if (!license) throw new Error('Not Found')
      return license
    }),
    create: vi.fn().mockResolvedValue({ id: 99 }),
    update: vi.fn().mockResolvedValue({}),
  }
  getPayloadClient.mockResolvedValue(payload)
  return payload
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  inviteToRepo.mockResolvedValue({
    ok: true,
    url: 'https://github.com/o/r/invitations',
    state: 'invited',
  })
  attachPurchase.mockResolvedValue({ id: 77, tier: 'pro' })
})

describe('Creem checkout.completed', () => {
  const guide = {
    id: 12,
    type: 'digital',
    name: 'Key Rotation',
    creemProductId: 'prod_guide',
  }

  it('records a digital sale and leaves delivery to Creem', async () => {
    const payload = withItem(guide)

    const res = await POST(completed({ itemType: 'product' }))

    expect(res.status).toBe(200)
    expect(payload.create).toHaveBeenCalledTimes(1)
    expect(payload.create.mock.calls[0][0].data).toMatchObject({
      email: 'buyer@example.com',
      creemOrderId: 'ord_1',
      status: 'paid',
      fulfillmentStatus: 'not_required',
    })
    expect(tryCreateAccessToken).not.toHaveBeenCalled()
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('flags a digital sale whose paid product does not match', async () => {
    const payload = withItem(guide)

    await POST(completed({ itemType: 'product', productId: 'prod_other' }))

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { fulfillmentStatus: 'failed' } })
    )
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
  })

  it('still emails an access link for a course', async () => {
    const payload = withItem({ id: 12, title: 'Secure the Stack' })

    await POST(completed({ itemType: 'course', productId: undefined }))

    expect(payload.create.mock.calls[0][0].data.fulfillmentStatus).toBe(
      'pending'
    )
    expect(sendAccessLinkEmail).toHaveBeenCalledWith({
      to: 'buyer@example.com',
      itemName: 'Secure the Stack',
      token: 'tok',
    })
  })
})

describe('Creem checkout.completed for a kit', () => {
  const pro = {
    id: 20,
    type: 'boilerplate',
    name: 'WareKit Next NetSuite (Pro)',
    tier: 'pro',
    stack: 'next-netsuite',
    githubRepo: 'amwaredotdev/warekit-next-netsuite',
    creemProductId: 'prod_pro',
    creemSandboxProductId: 'prod_pro_sb',
  }
  const team = {
    ...pro,
    id: 21,
    name: 'WareKit Next NetSuite (Team)',
    tier: 'team',
    creemProductId: 'prod_team',
    creemSandboxProductId: 'prod_team_sb',
    creemUpgradeProductId: 'prod_upgrade',
    creemUpgradeSandboxProductId: 'prod_upgrade_sb',
  }
  const kit = (over = {}) => ({
    itemType: 'product',
    itemId: 20,
    productId: 'prod_pro',
    ...over,
  })
  const ownerLicense = {
    id: 41,
    stack: 'next-netsuite',
    tier: 'pro',
    creemEnvironment: 'production',
  }

  const failedUpdate = (payload) =>
    payload.update.mock.calls.some(
      ([arg]) => arg.data?.fulfillmentStatus === 'failed'
    )

  it('attaches a kit sale to a license and emails the license page', async () => {
    const payload = withItem(pro)

    const res = await POST(completed(kit()))

    expect(res.status).toBe(200)
    expect(attachPurchase).toHaveBeenCalledTimes(1)
    expect(attachPurchase).toHaveBeenCalledWith(payload, {
      purchase: { id: 99 },
      email: 'buyer@example.com',
      stack: 'next-netsuite',
      grantsTier: 'pro',
      licenseId: undefined,
      environment: 'production',
    })
    // A single-developer kit gets the link too, and it names the license.
    expect(tryCreateAccessToken).toHaveBeenCalledWith({
      purchaseId: 99,
      licenseId: 77,
      itemType: 'product',
      itemId: 20,
    })
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        seatsUrl: 'https://example.com/access/seats/tok',
      })
    )
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        data: expect.objectContaining({ accessTokenJti: 'jti' }),
      })
    )
  })

  it('stores nothing on the purchase’s old seat list', async () => {
    const payload = withItem(pro, {
      license: { id: 77, seatMembers: [{ githubUsername: 'someone' }] },
    })
    await POST(completed(kit({ metadata: { githubUsername: 'octocat' } })))

    const writes = payload.update.mock.calls.map(([arg]) => arg)
    expect(
      writes.filter(
        (w) => w.collection === 'purchases' && 'seatMembers' in w.data
      )
    ).toEqual([])
    // The seat goes to the license instead.
    expect(writes).toContainEqual(
      expect.objectContaining({
        collection: 'licenses',
        id: 77,
        data: {
          // Appended after whoever was already there.
          seatMembers: [
            { githubUsername: 'someone' },
            expect.objectContaining({ githubUsername: 'octocat' }),
          ],
        },
      })
    )
  })

  it('still records a sale whose license cannot be attached', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    attachPurchase.mockRejectedValue(new Error('db down'))
    const payload = withItem(pro)

    const res = await POST(
      completed(kit({ metadata: { githubUsername: 'octocat' } }))
    )

    expect(res.status).toBe(200)
    expect(payload.create).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(
      'License attach failed for order',
      'ord_1',
      expect.any(Error)
    )
    // Fulfilment carries on: the buyer is still invited and emailed.
    expect(inviteToRepo).toHaveBeenCalled()
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalled()
    expect(failedUpdate(payload)).toBe(false)
    error.mockRestore()
  })

  it('skips the license, and says so, for a kit with no tier or stack', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const payload = withItem({ ...pro, tier: undefined, stack: undefined })

    const res = await POST(completed(kit()))

    expect(res.status).toBe(200)
    expect(attachPurchase).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    expect(payload.create).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('treats a license id that is not a positive integer as absent', async () => {
    withItem(pro)
    await POST(completed(kit({ metadata: { licenseId: 'abc' } })))
    expect(attachPurchase.mock.calls[0][1].licenseId).toBeUndefined()
  })

  it('passes a license id from metadata through as a number', async () => {
    withItem(pro, { license: ownerLicense })
    await POST(completed(kit({ metadata: { licenseId: '41' } })))
    expect(attachPurchase.mock.calls[0][1].licenseId).toBe(41)
  })

  describe('upgrades', () => {
    const upgrade = (over = {}) =>
      kit({
        itemId: 21,
        productId: 'prod_upgrade',
        metadata: { licenseId: '41', upgrade: 'team' },
        ...over,
      })

    it('accepts the upgrade product when metadata says upgrade', async () => {
      const payload = withItem(team, { license: ownerLicense })

      const res = await POST(completed(upgrade()))

      expect(res.status).toBe(200)
      expect(payload.create.mock.calls[0][0].data.fulfillmentStatus).toBe(
        'not_required'
      )
      expect(failedUpdate(payload)).toBe(false)
      expect(attachPurchase).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          grantsTier: 'team',
          licenseId: 41,
          stack: 'next-netsuite',
        })
      )
      // Same repo: no invite, no email, no seat link.
      expect(inviteToRepo).not.toHaveBeenCalled()
      expect(sendBoilerplateConfirmationEmail).not.toHaveBeenCalled()
      expect(tryCreateAccessToken).not.toHaveBeenCalled()
    })

    it('flags a mismatched product even on an upgrade', async () => {
      // The full-price Team product, with upgrade metadata.
      const payload = withItem(team, { license: ownerLicense })

      await POST(completed(upgrade({ productId: 'prod_team' })))

      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
    })

    it('does not accept the upgrade product for a plain purchase', async () => {
      const payload = withItem(team)

      await POST(completed(kit({ itemId: 21, productId: 'prod_upgrade' })))

      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
    })

    it('leaves an upgrade for a person when its license cannot be found', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = withItem(team, { license: null })

      const res = await POST(completed(upgrade()))

      expect(res.status).toBe(200)
      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('still returns 200 when attaching an upgrade fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      attachPurchase.mockRejectedValue(new Error('db down'))
      const payload = withItem(team, { license: ownerLicense })

      const res = await POST(completed(upgrade()))

      expect(res.status).toBe(200)
      expect(payload.create).toHaveBeenCalledTimes(1)
      expect(error).toHaveBeenCalled()
      // 'not_required' would read as nothing owed, and a redelivery stops at
      // the duplicate check, so the row has to say the sale needs a person.
      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'purchases',
          id: 99,
          data: { fulfillmentStatus: 'failed' },
        })
      )
      error.mockRestore()
    })

    it('fails a sandbox payment that names a production license', async () => {
      process.env.CREEM_ENV = 'sandbox'
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = withItem(team, { license: ownerLicense })

      const res = await POST(
        completed(upgrade({ productId: 'prod_upgrade_sb' }))
      )

      expect(res.status).toBe(200)
      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('fails an upgrade that names a license on another stack', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = withItem(team, {
        license: { ...ownerLicense, stack: 'react-netsuite' },
      })

      const res = await POST(completed(upgrade()))

      expect(res.status).toBe(200)
      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('fails a plain purchase that names a mismatched license', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = withItem(pro, {
        license: { ...ownerLicense, creemEnvironment: 'sandbox' },
      })

      await POST(completed(kit({ metadata: { licenseId: '41' } })))

      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
      expect(inviteToRepo).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('does nothing on a redelivered upgrade', async () => {
      const payload = withItem(team, {
        license: ownerLicense,
        existing: [{ id: 5, creemOrderId: 'ord_1' }],
      })

      const res = await POST(completed(upgrade()))

      expect(await res.text()).toBe('ok (duplicate)')
      expect(payload.create).not.toHaveBeenCalled()
      expect(attachPurchase).not.toHaveBeenCalled()
    })
  })

  describe('Enterprise quotes', () => {
    const quoted = { ...ownerLicense, quoteCreemProductId: 'prod_quote' }
    const quote = (over = {}) =>
      kit({
        itemId: 21,
        productId: 'prod_quote',
        metadata: { licenseId: '41', upgrade: 'enterprise' },
        ...over,
      })

    it('accepts an Enterprise quote product and grants enterprise', async () => {
      const payload = withItem(team, { license: quoted })

      const res = await POST(completed(quote()))

      expect(res.status).toBe(200)
      expect(failedUpdate(payload)).toBe(false)
      expect(attachPurchase).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ grantsTier: 'enterprise', licenseId: 41 })
      )
    })

    it('recognises a quote by its product even without upgrade metadata', async () => {
      withItem(team, { license: quoted })

      await POST(completed(quote({ metadata: { licenseId: '41' } })))

      expect(attachPurchase.mock.calls[0][1].grantsTier).toBe('enterprise')
    })

    it('sends no second invite to a license that already holds a paid tier', async () => {
      const payload = withItem(team, { license: quoted })

      await POST(completed(quote()))

      expect(payload.create.mock.calls[0][0].data.fulfillmentStatus).toBe(
        'not_required'
      )
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('treats a quote on a license with no paid tier as a first purchase', async () => {
      const payload = withItem(team, {
        license: { ...quoted, tier: null },
      })

      await POST(
        completed(
          quote({ metadata: { licenseId: '41', githubUsername: 'octocat' } })
        )
      )

      expect(payload.create.mock.calls[0][0].data.fulfillmentStatus).toBe(
        'pending_invite'
      )
      expect(inviteToRepo).toHaveBeenCalled()
      expect(attachPurchase.mock.calls[0][1].grantsTier).toBe('enterprise')
    })

    it('flags a quote bought for a license with no quote product', async () => {
      const payload = withItem(team, { license: ownerLicense })

      await POST(completed(quote()))

      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
    })

    it('flags a quote product that belongs to another license', async () => {
      const payload = withItem(team, { license: quoted })

      await POST(completed(quote({ productId: 'prod_someone_elses' })))

      expect(failedUpdate(payload)).toBe(true)
    })
  })

  describe('the Creem environment', () => {
    it('stores the Creem environment on the purchase', async () => {
      const payload = withItem(pro)
      await POST(completed(kit()))
      expect(payload.create.mock.calls[0][0].data.creemEnvironment).toBe(
        'production'
      )
    })

    it('stores it on a digital sale too', async () => {
      const payload = withItem({
        id: 12,
        type: 'digital',
        name: 'Key Rotation',
        creemProductId: 'prod_guide',
      })
      await POST(completed({ itemType: 'product' }))
      expect(payload.create.mock.calls[0][0].data.creemEnvironment).toBe(
        'production'
      )
    })

    it('accepts a sandbox sale in the sandbox, and records it as one', async () => {
      process.env.CREEM_ENV = 'sandbox'
      const payload = withItem(pro)

      await POST(completed(kit({ productId: 'prod_pro_sb' })))

      expect(failedUpdate(payload)).toBe(false)
      expect(payload.create.mock.calls[0][0].data.creemEnvironment).toBe(
        'sandbox'
      )
      expect(attachPurchase.mock.calls[0][1].environment).toBe('sandbox')
    })

    it('accepts a sandbox digital sale in the sandbox', async () => {
      process.env.CREEM_ENV = 'sandbox'
      const payload = withItem({
        id: 12,
        type: 'digital',
        name: 'Key Rotation',
        creemProductId: 'prod_guide',
        creemSandboxProductId: 'prod_guide_sb',
      })

      await POST(completed({ itemType: 'product', productId: 'prod_guide_sb' }))

      expect(failedUpdate(payload)).toBe(false)
    })

    it('does not accept a sandbox product in production', async () => {
      const payload = withItem(pro)

      await POST(completed(kit({ productId: 'prod_pro_sb' })))

      expect(failedUpdate(payload)).toBe(true)
      expect(attachPurchase).not.toHaveBeenCalled()
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('does not accept a live product in the sandbox', async () => {
      process.env.CREEM_ENV = 'sandbox'
      const payload = withItem(pro)

      await POST(completed(kit({ productId: 'prod_pro' })))

      expect(failedUpdate(payload)).toBe(true)
    })

    it('accepts the sandbox upgrade product in the sandbox', async () => {
      process.env.CREEM_ENV = 'sandbox'
      const payload = withItem(team, {
        license: { ...ownerLicense, creemEnvironment: 'sandbox' },
      })

      await POST(
        completed(
          kit({
            itemId: 21,
            productId: 'prod_upgrade_sb',
            metadata: { licenseId: '41', upgrade: 'team' },
          })
        )
      )

      expect(failedUpdate(payload)).toBe(false)
      expect(attachPurchase).toHaveBeenCalled()
    })
  })
})

describe('Creem subscription.paid', () => {
  it('stores the Creem environment on a renewal', async () => {
    process.env.CREEM_ENV = 'sandbox'
    const payload = withItem({ id: 5, title: 'Retainer' })

    const res = await POST(
      new Request('https://example.com/webhooks/creem', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'subscription.paid',
          object: {
            id: 'sub_1',
            last_transaction_id: 'tran_2',
            customer: { email: 'client@example.com' },
            product: { id: 'prod_retainer', price: 5000, currency: 'USD' },
            metadata: { itemType: 'service', itemId: '5' },
          },
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(payload.create.mock.calls[0][0].data).toMatchObject({
      creemTransactionId: 'tran_2',
      creemEnvironment: 'sandbox',
    })
  })
})

/* ------------------------------------------------------------------------
 * Refunds and disputes. These run against a small in-memory database, not
 * canned answers: the tier is recomputed by the real `recomputeTier` from the
 * rows, so what is asserted is the state a refund leaves behind.
 * ---------------------------------------------------------------------- */

const idOf = (value) => (value && typeof value === 'object' ? value.id : value)

const matches = (row, where) => {
  if (!where) return true
  if (where.and) return where.and.every((clause) => matches(row, clause))
  return Object.entries(where).every(([field, cond]) => {
    const value = idOf(row[field])
    if ('equals' in cond) return value === cond.equals
    if ('in' in cond) return cond.in.includes(value)
    return true
  })
}

function database({ purchases = [], licenses = [], products = [] }) {
  const tables = { purchases, licenses, products }
  const payload = {
    find: vi.fn(async ({ collection, where, limit }) => ({
      docs: tables[collection]
        .filter((row) => matches(row, where))
        .slice(0, limit ?? Infinity),
    })),
    findByID: vi.fn(async ({ collection, id }) => {
      const row = tables[collection].find((r) => r.id === id)
      if (!row) throw Object.assign(new Error('Not Found'), { status: 404 })
      // A copy, as a real read is: a later write must not rewrite it.
      return { ...row }
    }),
    update: vi.fn(async ({ collection, id, data }) => {
      const row = tables[collection].find((r) => r.id === id)
      Object.assign(row, data)
      return row
    }),
    create: vi.fn(),
  }
  getPayloadClient.mockResolvedValue(payload)
  return { payload, tables }
}

const webhook = (eventType, object) =>
  new Request('https://example.com/webhooks/creem', {
    method: 'POST',
    body: JSON.stringify({ eventType, object }),
  })

/* The status fields are deliberately wrong, as Creem sends them: `paid` on
   a full refund, and on a partial one `refunded` with a refunded amount.
   Neither may be believed. */
const refund = ({ orderId = 'ord_pro', amount = 49900, paid = 49900 } = {}) =>
  webhook('refund.created', {
    id: 'ref_1',
    object: 'refund',
    status: 'succeeded',
    refund_amount: amount,
    transaction: {
      id: 'tran_1',
      amount_paid: paid,
      status: amount >= paid ? 'paid' : 'refunded',
      refunded_amount: amount >= paid ? null : paid,
      order: orderId,
    },
    order: { id: orderId, status: amount >= paid ? 'paid' : 'refunded' },
  })

const kitPurchase = (over) => ({
  id: 1,
  status: 'paid',
  license: 41,
  grantsTier: 'pro',
  creemOrderId: 'ord_pro',
  ...over,
})
const proKit = { id: 30, stack: 'next-netsuite', tier: 'pro', seats: 1 }
const members = (...names) =>
  names.map((githubUsername) => ({ githubUsername }))
const needsReview = (tables) => tables.licenses[0].needsReview === true

/* The rulings on a payment that does not move a license up. The real
   `attachPurchase` runs here against the in-memory rows, because whether the
   row lands, what the tier becomes and whether a person is told are one
   behaviour. */
describe('Creem checkout.completed: an upgrade that raises nothing', () => {
  // A string, as checkout metadata carries it: this database compares strictly.
  const teamKit = {
    id: '21',
    type: 'boilerplate',
    name: 'WareKit Next NetSuite (Team)',
    tier: 'team',
    stack: 'next-netsuite',
    creemProductId: 'prod_team',
    creemUpgradeProductId: 'prod_upgrade',
  }
  const upgradeRow = (over) =>
    kitPurchase({ id: 2, grantsTier: 'team', creemOrderId: 'ord_up', ...over })

  const paying = async (rows) => {
    const actual = await vi.importActual('@/lib/commerce/licenseRecord')
    attachPurchase.mockImplementation(actual.attachPurchase)
    const db = database({ products: [teamKit], ...rows })
    db.payload.create.mockImplementation(async ({ collection, data }) => {
      const row = { id: 500, ...data }
      db.tables[collection].push(row)
      return row
    })
    return db
  }
  const upgrade = (metadata = {}) =>
    completed({
      itemType: 'product',
      itemId: 21,
      productId: 'prod_upgrade',
      orderId: 'ord_second',
      metadata: { licenseId: '41', upgrade: 'team', ...metadata },
    })
  const quote = () =>
    completed({
      itemType: 'product',
      itemId: 21,
      productId: 'prod_quote',
      orderId: 'ord_second',
      metadata: { licenseId: '41', upgrade: 'enterprise' },
    })
  const newRow = (tables) =>
    tables.purchases.find((row) => row.creemOrderId === 'ord_second')
  const licenseOf = (over) => ({
    id: 41,
    stack: 'next-netsuite',
    creemEnvironment: 'production',
    ...over,
  })

  it('keeps a second Team payment, attaches it and asks a person to look', async () => {
    const { tables } = await paying({
      purchases: [kitPurchase(), upgradeRow()],
      licenses: [licenseOf({ tier: 'team' })],
    })

    const res = await POST(upgrade())

    expect(res.status).toBe(200)
    expect(newRow(tables)).toMatchObject({
      license: 41,
      grantsTier: 'team',
      status: 'paid',
      fulfillmentStatus: 'not_required',
    })
    expect(tables.licenses[0].tier).toBe('team')
    expect(needsReview(tables)).toBe(true)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('flags a Team payment on an Enterprise license and keeps Enterprise', async () => {
    const { tables } = await paying({
      purchases: [kitPurchase({ grantsTier: 'enterprise' })],
      licenses: [licenseOf({ tier: 'enterprise' })],
    })

    await POST(upgrade())

    expect(newRow(tables).license).toBe(41)
    expect(tables.licenses[0].tier).toBe('enterprise')
    expect(needsReview(tables)).toBe(true)
  })

  it('flags a second quote payment on an Enterprise license', async () => {
    const { tables } = await paying({
      purchases: [kitPurchase({ grantsTier: 'enterprise' })],
      licenses: [
        licenseOf({ tier: 'enterprise', quoteCreemProductId: 'prod_quote' }),
      ],
    })

    await POST(quote())

    expect(newRow(tables)).toMatchObject({
      license: 41,
      grantsTier: 'enterprise',
    })
    expect(needsReview(tables)).toBe(true)
  })

  it('does not flag the first upgrade from Pro', async () => {
    const { tables } = await paying({
      purchases: [kitPurchase()],
      licenses: [licenseOf({ tier: 'pro' })],
    })

    await POST(upgrade())

    expect(tables.licenses[0].tier).toBe('team')
    expect(needsReview(tables)).toBe(false)
  })

  it('does not flag a quote that moves Team to Enterprise', async () => {
    const { tables } = await paying({
      purchases: [kitPurchase({ grantsTier: 'team' })],
      licenses: [
        licenseOf({ tier: 'team', quoteCreemProductId: 'prod_quote' }),
      ],
    })

    await POST(quote())

    expect(tables.licenses[0].tier).toBe('enterprise')
    expect(needsReview(tables)).toBe(false)
  })

  it('grants nothing to a stale upgrade paid on a refunded license', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { tables } = await paying({
      purchases: [kitPurchase({ status: 'refunded' })],
      licenses: [licenseOf({ tier: null })],
    })

    const res = await POST(upgrade())

    expect(res.status).toBe(200)
    expect(newRow(tables)).toMatchObject({
      status: 'paid',
      fulfillmentStatus: 'failed',
    })
    expect(newRow(tables).license).toBeUndefined()
    expect(newRow(tables).grantsTier).toBeUndefined()
    expect(tables.licenses[0].tier).toBeNull()
    expect(needsReview(tables)).toBe(true)
    expect(attachPurchase).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('grants nothing to an upgrade paid on a Lite license', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { tables } = await paying({
      purchases: [kitPurchase({ grantsTier: 'lite' })],
      licenses: [licenseOf({ tier: 'lite' })],
    })

    const res = await POST(upgrade())

    expect(res.status).toBe(200)
    expect(newRow(tables).fulfillmentStatus).toBe('failed')
    expect(tables.licenses[0].tier).toBe('lite')
    expect(needsReview(tables)).toBe(true)
    expect(attachPurchase).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('still answers 200 when the flag cannot be written', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { payload, tables } = await paying({
      purchases: [],
      licenses: [licenseOf({ tier: null })],
    })
    payload.update.mockRejectedValue(new Error('db down'))

    const res = await POST(upgrade())

    expect(res.status).toBe(200)
    expect(newRow(tables).fulfillmentStatus).toBe('failed')
    error.mockRestore()
  })

  it('still treats a quote on a brand-new license as its first sale', async () => {
    const { tables } = await paying({
      purchases: [],
      licenses: [licenseOf({ tier: null, quoteCreemProductId: 'prod_quote' })],
    })

    await POST(quote())

    expect(newRow(tables)).toMatchObject({
      license: 41,
      grantsTier: 'enterprise',
    })
    expect(newRow(tables).fulfillmentStatus).not.toBe('failed')
    expect(tables.licenses[0].tier).toBe('enterprise')
    expect(needsReview(tables)).toBe(false)
  })
})

describe('Creem refund.created', () => {
  it('marks a full refund and recomputes the tier', async () => {
    const { payload, tables } = database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })

    const res = await POST(refund())

    expect(res.status).toBe(200)
    expect(tables.purchases[0].status).toBe('refunded')
    expect(tables.licenses[0].tier).toBeNull()
    expect(tables.licenses[0].tierChangedAt).toEqual(expect.any(String))
    // Nothing paid is left, so repo access is handed to the revoker.
    expect(revokeLicenseAccess).toHaveBeenCalledTimes(1)
    expect(revokeLicenseAccess).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ id: 41, tier: null })
    )
    expect(needsReview(tables)).toBe(false)
  })

  it('falls back to Pro when the upgrade is refunded and flags seats over the limit', async () => {
    const { tables } = database({
      purchases: [
        kitPurchase(),
        kitPurchase({
          id: 2,
          grantsTier: 'team',
          creemOrderId: 'ord_upgrade',
        }),
      ],
      licenses: [
        {
          id: 41,
          stack: 'next-netsuite',
          tier: 'team',
          seatMembers: members('one', 'two', 'three'),
        },
      ],
      products: [proKit],
    })

    const res = await POST(refund({ orderId: 'ord_upgrade' }))

    expect(res.status).toBe(200)
    expect(tables.purchases[1].status).toBe('refunded')
    expect(tables.purchases[0].status).toBe('paid')
    expect(tables.licenses[0].tier).toBe('pro')
    // The seats stay; a person decides what to do about the extra two.
    expect(tables.licenses[0].seatMembers).toHaveLength(3)
    expect(needsReview(tables)).toBe(true)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
  })

  it('does not flag an upgrade refund whose seats still fit', async () => {
    const { tables } = database({
      purchases: [
        kitPurchase(),
        kitPurchase({ id: 2, grantsTier: 'team', creemOrderId: 'ord_up' }),
      ],
      licenses: [
        {
          id: 41,
          stack: 'next-netsuite',
          tier: 'team',
          seatMembers: members('one'),
        },
      ],
      products: [proKit],
    })

    await POST(refund({ orderId: 'ord_up' }))

    expect(tables.licenses[0].tier).toBe('pro')
    expect(needsReview(tables)).toBe(false)
  })

  describe('what a refunded upgrade is checked against', () => {
    const accounts = (...statuses) =>
      statuses.map((status, i) => ({ accountId: `${i + 1}`, status }))
    const proLimits = { ...proKit, seats: 1, netsuiteAccounts: 1 }
    const teamToPro = (license) =>
      database({
        purchases: [
          kitPurchase(),
          kitPurchase({ id: 2, grantsTier: 'team', creemOrderId: 'ord_up' }),
        ],
        licenses: [
          {
            id: 41,
            stack: 'next-netsuite',
            tier: 'team',
            seatMembers: members('one'),
            ...license,
          },
        ],
        products: [proLimits],
      })

    it('flags Team to Pro with 1 developer and 3 accounts', async () => {
      const { tables } = teamToPro({
        accounts: accounts('active', 'active', 'active'),
      })

      await POST(refund({ orderId: 'ord_up' }))

      expect(tables.licenses[0].tier).toBe('pro')
      expect(needsReview(tables)).toBe(true)
    })

    it('does not count an over-limit account against the new tier', async () => {
      const { tables } = teamToPro({
        accounts: accounts('active', 'over_limit', 'over_limit'),
      })

      await POST(refund({ orderId: 'ord_up' }))

      expect(needsReview(tables)).toBe(false)
    })

    it('flags an override however few are in use', async () => {
      const { tables } = teamToPro({ seatOverride: 9 })

      await POST(refund({ orderId: 'ord_up' }))

      expect(needsReview(tables)).toBe(true)
    })

    it('flags an account override without needing a kit row', async () => {
      const { payload, tables } = teamToPro({ accountOverride: 5 })

      await POST(refund({ orderId: 'ord_up' }))

      expect(needsReview(tables)).toBe(true)
      expect(
        payload.find.mock.calls.some(([arg]) => arg.collection === 'products')
      ).toBe(false)
    })

    it('flags an Enterprise refund that falls back to Team', async () => {
      const { tables } = database({
        purchases: [
          kitPurchase({ grantsTier: 'team' }),
          kitPurchase({
            id: 2,
            grantsTier: 'enterprise',
            creemOrderId: 'ord_quote',
          }),
        ],
        licenses: [
          {
            id: 41,
            stack: 'next-netsuite',
            tier: 'enterprise',
            seatOverride: 20,
            accountOverride: 10,
            seatMembers: members('one'),
          },
        ],
        products: [{ ...proLimits, tier: 'team', seats: 5 }],
      })

      await POST(refund({ orderId: 'ord_quote' }))

      expect(tables.licenses[0].tier).toBe('team')
      expect(needsReview(tables)).toBe(true)
      expect(revokeLicenseAccess).not.toHaveBeenCalled()
    })

    it('flags a tier with no kit row to read a limit from', async () => {
      const { tables } = database({
        purchases: [
          kitPurchase(),
          kitPurchase({ id: 2, grantsTier: 'team', creemOrderId: 'ord_up' }),
        ],
        licenses: [{ id: 41, stack: 'next-netsuite', tier: 'team' }],
        products: [],
      })

      await POST(refund({ orderId: 'ord_up' }))

      expect(needsReview(tables)).toBe(true)
    })
  })

  it('keeps Team and flags review when the original Pro is refunded', async () => {
    const { tables } = database({
      purchases: [
        kitPurchase(),
        kitPurchase({ id: 2, grantsTier: 'team', creemOrderId: 'ord_up' }),
      ],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'team' }],
      products: [proKit],
    })

    const res = await POST(refund({ orderId: 'ord_pro' }))

    expect(res.status).toBe(200)
    expect(tables.purchases[0].status).toBe('refunded')
    expect(tables.licenses[0].tier).toBe('team')
    expect(needsReview(tables)).toBe(true)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
  })

  it('flags a partial refund without changing the tier', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { tables } = database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })

    const res = await POST(refund({ amount: 10000 }))

    expect(res.status).toBe(200)
    // The payload said `refunded`; only the amounts decide.
    expect(tables.purchases[0].status).toBe('paid')
    expect(tables.licenses[0].tier).toBe('pro')
    expect(tables.licenses[0].tierChangedAt).toBeUndefined()
    expect(needsReview(tables)).toBe(true)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('treats a refund it cannot measure as partial', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { tables } = database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })

    await POST(
      webhook('refund.created', {
        order: { id: 'ord_pro' },
        refund_amount: 49900,
      })
    )

    expect(tables.purchases[0].status).toBe('paid')
    expect(tables.licenses[0].tier).toBe('pro')
    expect(needsReview(tables)).toBe(true)
    warn.mockRestore()
  })

  it('is a no-op for a redelivered refund', async () => {
    const { payload } = database({
      purchases: [kitPurchase({ status: 'refunded' })],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: null }],
    })

    const res = await POST(refund())

    expect(res.status).toBe(200)
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.findByID).not.toHaveBeenCalled()
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
  })

  it('only re-sets the flag for a redelivered partial refund', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { payload } = database({
      purchases: [kitPurchase()],
      licenses: [
        { id: 41, stack: 'next-netsuite', tier: 'pro', needsReview: true },
      ],
    })

    await POST(refund({ amount: 10000 }))
    await POST(refund({ amount: 10000 }))

    const writes = payload.update.mock.calls.map(([arg]) => arg)
    expect(writes).toHaveLength(2)
    for (const write of writes) {
      expect(write).toMatchObject({
        collection: 'licenses',
        data: { needsReview: true },
      })
    }
    warn.mockRestore()
  })

  it('ignores a refund for an unknown order with 200', async () => {
    const { payload } = database({ purchases: [], licenses: [] })

    const res = await POST(refund({ orderId: 'ord_nobody' }))

    expect(res.status).toBe(200)
    expect(payload.update).not.toHaveBeenCalled()
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
  })

  it('marks a digital purchase refunded and touches no license', async () => {
    const { payload, tables } = database({
      purchases: [{ id: 9, status: 'paid', creemOrderId: 'ord_guide' }],
      licenses: [],
    })

    const res = await POST(
      refund({ orderId: 'ord_guide', amount: 1200, paid: 1200 })
    )

    expect(res.status).toBe(200)
    expect(tables.purchases[0].status).toBe('refunded')
    expect(payload.findByID).not.toHaveBeenCalled()
    expect(payload.update).toHaveBeenCalledTimes(1)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
  })

  it('asks for a redelivery when the refund cannot be recorded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { payload } = database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })
    payload.update.mockRejectedValueOnce(new Error('db down'))

    const res = await POST(refund())

    expect(res.status).toBe(500)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('keeps the refund and flags the license when the tier work fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { payload, tables } = database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })
    revokeLicenseAccess.mockRejectedValueOnce(new Error('github down'))

    const res = await POST(refund())

    // A redelivery would stop at the duplicate check, so 200, not 500.
    expect(res.status).toBe(200)
    expect(tables.purchases[0].status).toBe('refunded')
    expect(needsReview(tables)).toBe(true)
    expect(payload.update).toHaveBeenCalled()
    error.mockRestore()
  })

  it('verifies the signature before reading a refund', async () => {
    const { payload } = database({ purchases: [kitPurchase()], licenses: [] })
    verifyCreemSignature.mockReturnValueOnce(false)

    const res = await POST(refund())

    expect(res.status).toBe(401)
    expect(payload.find).not.toHaveBeenCalled()
  })
})

describe('Creem dispute.created', () => {
  const dispute = (object) => webhook('dispute.created', object)
  const world = () =>
    database({
      purchases: [kitPurchase()],
      licenses: [{ id: 41, stack: 'next-netsuite', tier: 'pro' }],
    })

  it('flags a dispute without changing the tier', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { tables } = world()

    const res = await POST(dispute({ id: 'dis_1', order: { id: 'ord_pro' } }))

    expect(res.status).toBe(200)
    expect(tables.licenses[0].tier).toBe('pro')
    expect(tables.licenses[0].tierChangedAt).toBeUndefined()
    expect(tables.purchases[0].status).toBe('paid')
    expect(needsReview(tables)).toBe(true)
    expect(revokeLicenseAccess).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it.each([
    ['a bare order id', { order: 'ord_pro' }],
    ['the transaction’s order', { transaction: { order: 'ord_pro' } }],
    ['the checkout’s order', { checkout: { order: 'ord_pro' } }],
    ['a checkout order object', { checkout: { order: { id: 'ord_pro' } } }],
  ])('finds the order from %s', async (_name, object) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { tables } = world()

    await POST(dispute(object))

    expect(needsReview(tables)).toBe(true)
    warn.mockRestore()
  })

  it('logs and answers 200 when no order can be found', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { payload } = world()

    const res = await POST(dispute({ id: 'dis_2', amount: 100 }))

    expect(res.status).toBe(200)
    expect(warn).toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('answers 200 for a dispute on an unknown order', async () => {
    const { payload } = world()

    const res = await POST(dispute({ order: { id: 'ord_nobody' } }))

    expect(res.status).toBe(200)
    expect(payload.update).not.toHaveBeenCalled()
  })
})

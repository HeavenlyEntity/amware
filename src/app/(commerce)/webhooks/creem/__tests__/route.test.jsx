import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/creem', () => ({
  verifyCreemSignature: vi.fn(() => true),
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

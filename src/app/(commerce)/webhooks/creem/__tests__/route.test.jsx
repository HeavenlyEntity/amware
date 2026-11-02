import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/creem', () => ({
  verifyCreemSignature: vi.fn(() => true),
}))
vi.mock('@/lib/commerce/accessToken', () => ({
  tryCreateAccessToken: vi.fn(() => ({ ok: true, token: 'tok', jti: 'jti' })),
}))
vi.mock('@/lib/commerce/seats', () => ({ seatLimit: vi.fn(() => 1) }))
vi.mock('@/lib/commerce/onboardingLink', () => ({ onboardingPath: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendAccessLinkEmail: vi.fn(),
  sendBoilerplateConfirmationEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import { sendAccessLinkEmail } from '@/lib/commerce/fulfillment'
import { POST } from '../route'

const completed = ({ itemType, itemId = 12, productId = 'prod_guide' }) =>
  new Request('https://example.com/webhooks/creem', {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'checkout.completed',
      object: {
        id: 'chk_1',
        order: { id: 'ord_1', amount: 1200, currency: 'USD' },
        customer: { email: 'buyer@example.com' },
        product: { id: productId },
        metadata: { itemType, itemId: String(itemId) },
        request_id: 'req_1',
      },
    }),
  })

const withItem = (item) => {
  const payload = {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    findByID: vi.fn().mockResolvedValue(item),
    create: vi.fn().mockResolvedValue({ id: 99 }),
    update: vi.fn().mockResolvedValue({}),
  }
  getPayloadClient.mockResolvedValue(payload)
  return payload
}

beforeEach(() => {
  vi.clearAllMocks()
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

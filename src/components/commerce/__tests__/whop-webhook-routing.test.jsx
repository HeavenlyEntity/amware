import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Which branch a Whop sale takes, for everything that is neither a deposit
   nor a kit.

   Its own file, not more cases in whop-webhook.test.jsx: that file is the
   deposit path's regression alarm and must stand unedited, and its
   fulfilment mock predates notifyManualFulfilment. Same approach as there --
   the route is tested from here because the ui project has the `@/` alias,
   and everything past the route's own decisions is mocked. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/whop', async (importOriginal) => ({
  ...(await importOriginal()),
  verifyWhopWebhook: vi.fn(),
}))
vi.mock('@/lib/commerce/githubInvite', () => ({
  inviteToRepo: vi.fn(),
  removeFromRepo: vi.fn(),
}))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendDepositReceivedEmail: vi.fn(),
  notifyDepositReceived: vi.fn(),
  sendBoilerplateConfirmationEmail: vi.fn(),
  notifyManualFulfilment: vi.fn(),
}))
vi.mock('@/lib/commerce/accessToken', () => ({ tryCreateAccessToken: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyWhopWebhook } from '@/lib/commerce/whop'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import {
  sendDepositReceivedEmail,
  notifyDepositReceived,
  sendBoilerplateConfirmationEmail,
  notifyManualFulfilment,
} from '@/lib/commerce/fulfillment'
import { POST } from '@/app/(commerce)/webhooks/whop/route'

const service = {
  id: 2,
  slug: 'fractional-cto',
  name: 'Fractional CTO',
  whopPlanId: 'plan_dep',
}

/* A product that is not a kit: the guide migration Task 1 gives a plan. */
const guide = {
  id: 12,
  slug: 'switch-clone-quick-key-rotation-guide',
  name: 'Quick key rotation guide',
  type: 'digital',
  whopPlanId: 'plan_guide',
}

/* Courses are named by `title`, not `name`. */
const course = {
  id: 31,
  slug: 'netsuite-for-developers',
  title: 'NetSuite for developers',
  whopPlanId: 'plan_course',
}

const payment = (over = {}) => ({
  id: 'pay_1',
  status: 'paid',
  total: 12,
  currency: 'usd',
  plan: { id: 'plan_guide' },
  user: { email: 'buyer@example.com', name: 'Grace Lee' },
  ...over,
})

const request = () =>
  new Request('https://www.amware.dev/webhooks/whop', {
    method: 'POST',
    body: '{}',
    headers: { 'webhook-id': 'msg_1' },
  })

let find, create, update

/* One collection answers the plan; every other answers nothing. */
const catalogue = (collection, doc) =>
  find.mockImplementation(async (args) =>
    args.collection === collection ? { docs: [doc] } : { docs: [] }
  )

beforeEach(() => {
  vi.clearAllMocks()
  find = vi.fn()
  create = vi.fn().mockResolvedValue({ id: 99 })
  update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  sendDepositReceivedEmail.mockResolvedValue(undefined)
  notifyDepositReceived.mockResolvedValue(undefined)
  sendBoilerplateConfirmationEmail.mockResolvedValue(undefined)
  notifyManualFulfilment.mockResolvedValue(undefined)
})

describe('Whop webhook routing', () => {
  it('owes a non-kit product by hand: pending, the owner alerted, no deposit mail', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: payment(),
    })
    catalogue('products', guide)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          item: { relationTo: 'products', value: 12 },
          itemType: 'product',
          status: 'paid',
          fulfillmentStatus: 'pending',
        }),
      })
    )
    expect(notifyManualFulfilment).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      itemName: 'Quick key rotation guide',
      amount: 1200,
      currency: 'usd',
      paymentId: 'pay_1',
    })
    expect(sendDepositReceivedEmail).not.toHaveBeenCalled()
    expect(notifyDepositReceived).not.toHaveBeenCalled()
    // Whop sends the buyer its own receipt; there is nothing of ours yet.
    expect(sendBoilerplateConfirmationEmail).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('owes a course by hand the same way, named by its title', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: payment({ plan: { id: 'plan_course' }, total: 49 }),
    })
    catalogue('courses', course)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          item: { relationTo: 'courses', value: 31 },
          itemType: 'course',
          fulfillmentStatus: 'pending',
        }),
      })
    )
    expect(notifyManualFulfilment).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: 'NetSuite for developers',
        amount: 4900,
      })
    )
    expect(sendDepositReceivedEmail).not.toHaveBeenCalled()
    expect(notifyDepositReceived).not.toHaveBeenCalled()
    expect(sendBoilerplateConfirmationEmail).not.toHaveBeenCalled()
  })

  it('still answers 200 when the owner alert cannot be sent', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: payment(),
    })
    catalogue('products', guide)
    notifyManualFulfilment.mockRejectedValue(new Error('resend down'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/manual fulfilment/i),
      'pay_1',
      expect.any(Error)
    )
    log.mockRestore()
  })

  it('sends a deposit through the deposit block and never alerts it as manual', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: payment({ plan: { id: 'plan_dep' }, total: 1500 }),
    })
    catalogue('services', service)

    await POST(request())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'not_required' }),
      })
    )
    expect(sendDepositReceivedEmail).toHaveBeenCalled()
    expect(notifyDepositReceived).toHaveBeenCalled()
    expect(notifyManualFulfilment).not.toHaveBeenCalled()
  })

  it('leaves a plan nothing claims exactly as it was: failed, and not a manual sale', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_1',
      type: 'payment.succeeded',
      data: payment({ plan: { id: 'plan_unknown' } }),
    })
    find.mockResolvedValue({ docs: [] })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    await POST(request())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          item: undefined,
          fulfillmentStatus: 'failed',
        }),
      })
    )
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/no service claims/i),
      expect.objectContaining({ paymentId: 'pay_1', planId: 'plan_unknown' })
    )
    expect(notifyManualFulfilment).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

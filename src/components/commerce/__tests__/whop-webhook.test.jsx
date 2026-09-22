import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The route lives in src/app but is tested from here on purpose: the ui
   project has the `@/` alias the route imports through. Everything past
   the route's own logic is mocked: the signature check, the database, the
   mail. What is asserted is what the route decides to do. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/whop', async (importOriginal) => ({
  ...(await importOriginal()),
  verifyWhopWebhook: vi.fn(),
}))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendDepositReceivedEmail: vi.fn().mockResolvedValue(undefined),
  notifyDepositReceived: vi.fn().mockResolvedValue(undefined),
  sendBoilerplateConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/commerce/accessToken', () => ({ tryCreateAccessToken: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyWhopWebhook } from '@/lib/commerce/whop'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import {
  sendDepositReceivedEmail,
  notifyDepositReceived,
  sendBoilerplateConfirmationEmail,
} from '@/lib/commerce/fulfillment'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import { POST } from '@/app/(commerce)/webhooks/whop/route'

const service = {
  id: 2,
  slug: 'fractional-cto',
  name: 'Fractional CTO',
  whopPlanId: 'plan_dep',
  bookingUrl: 'https://cal.com/amware/on-demand-outcome',
}

const product = {
  id: 7,
  slug: 'warekit-next-netsuite-pro',
  name: 'WareKit Next NetSuite (Pro)',
  type: 'boilerplate',
  whopPlanId: 'plan_pro',
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  seats: 1,
}

const teamProduct = {
  ...product,
  id: 8,
  slug: 'warekit-next-netsuite-team',
  seats: 5,
}

const payment = (over = {}) => ({
  id: 'pay_1',
  status: 'paid',
  total: 1500,
  currency: 'usd',
  plan: { id: 'plan_dep' },
  user: { email: 'client@example.com', name: 'Grace Lee' },
  ...over,
})

const event = (data, type = 'payment.succeeded') => ({
  id: 'msg_1',
  type,
  data,
})

const request = (body = '{}') =>
  new Request('https://www.amware.dev/webhooks/whop', {
    method: 'POST',
    body,
    headers: { 'webhook-id': 'msg_1' },
  })

let find, create

beforeEach(() => {
  vi.clearAllMocks()
  find = vi.fn()
  create = vi.fn().mockResolvedValue({ id: 99 })
  getPayloadClient.mockResolvedValue({ find, create })
})

/* find() is called for purchases (dedupe) then services (by plan); return
   in that order. */
const db = ({ existing = [], services = [service] } = {}) => {
  find.mockImplementation(async ({ collection }) =>
    collection === 'purchases' ? { docs: existing } : { docs: services }
  )
}

const kitDb = () =>
  find.mockImplementation(async ({ collection }) => {
    if (collection === 'purchases') return { docs: [] }
    if (collection === 'products') return { docs: [product] }
    return { docs: [] }
  })

const teamDb = () =>
  find.mockImplementation(async ({ collection }) => {
    if (collection === 'purchases') return { docs: [] }
    if (collection === 'products') return { docs: [teamProduct] }
    return { docs: [] }
  })

const kitPayment = (over = {}) =>
  payment({
    plan: { id: 'plan_pro' },
    total: 499,
    custom_field_responses: [{ name: 'GitHub username', value: 'octocat' }],
    ...over,
  })

describe('Whop webhook', () => {
  it('rejects a request whose signature does not verify', async () => {
    verifyWhopWebhook.mockReturnValue(null)
    const res = await POST(request())
    expect(res.status).toBe(401)
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('records a deposit against the service its plan belongs to, and mails both sides', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment()))
    db()
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        data: expect.objectContaining({
          email: 'client@example.com',
          provider: 'whop',
          whopPaymentId: 'pay_1',
          item: { relationTo: 'services', value: 2 },
          itemType: 'service',
          amount: 150000,
          currency: 'usd',
          status: 'paid',
          fulfillmentStatus: 'not_required',
          whopEnvironment: 'production',
        }),
      })
    )
    expect(sendDepositReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        name: 'Grace Lee',
        serviceName: 'Fractional CTO',
        amount: 150000,
        bookingUrl: service.bookingUrl,
      })
    )
    expect(notifyDepositReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'client@example.com',
        paymentId: 'pay_1',
      })
    )
  })

  it('answers 200 and writes nothing for a payment it already has', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment()))
    db({ existing: [{ id: 5 }] })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/duplicate/)
    expect(create).not.toHaveBeenCalled()
    expect(sendDepositReceivedEmail).not.toHaveBeenCalled()
  })

  it('treats a unique-key race as the duplicate it is', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment()))
    let calls = 0
    find.mockImplementation(async ({ collection }) => {
      if (collection === 'services') return { docs: [service] }
      calls += 1
      return { docs: calls === 1 ? [] : [{ id: 5 }] }
    })
    create.mockRejectedValue(new Error('duplicate key'))
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/duplicate/)
  })

  it('still records money for a plan no service claims, marked for a human', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(payment({ plan: { id: 'plan_unknown' } }))
    )
    db({ services: [] })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          item: undefined,
          fulfillmentStatus: 'failed',
        }),
      })
    )
  })

  it('ignores every other event and unpaid payments without touching the database', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment(), 'payment.failed'))
    expect((await POST(request())).status).toBe(200)
    verifyWhopWebhook.mockReturnValue(event(payment({ status: 'open' })))
    db()
    expect((await POST(request())).status).toBe(200)
    expect(create).not.toHaveBeenCalled()
  })

  it('stamps a payment received by a sandbox-configured server as sandbox', async () => {
    process.env.WHOP_ENV = 'sandbox'
    verifyWhopWebhook.mockReturnValue(event(payment()))
    db()
    await POST(request())
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whopEnvironment: 'sandbox' }),
      })
    )
    delete process.env.WHOP_ENV
  })

  it('never lets a mail failure turn into a retry storm', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment()))
    db()
    sendDepositReceivedEmail.mockRejectedValue(new Error('resend down'))
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('records a kit purchase against the product its plan belongs to', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(payment({ plan: { id: 'plan_pro' }, total: 499 }))
    )
    find.mockImplementation(async ({ collection }) => {
      if (collection === 'purchases') return { docs: [] }
      if (collection === 'services') return { docs: [] }
      if (collection === 'products') return { docs: [product] }
      return { docs: [] }
    })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        data: expect.objectContaining({
          item: { relationTo: 'products', value: 7 },
          itemType: 'product',
          amount: 49900,
        }),
      })
    )
  })

  it('invites the buyer and marks the order sent', async () => {
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    kitDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/invite/1',
      id: 1,
    })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(inviteToRepo).toHaveBeenCalledWith({
      repo: 'amwaredotdev/warekit-next-netsuite',
      username: 'octocat',
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        data: expect.objectContaining({
          githubRepo: 'amwaredotdev/warekit-next-netsuite',
          githubInviteUrl: 'https://github.com/invite/1',
          fulfillmentStatus: 'sent',
        }),
      })
    )
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        githubUsername: 'octocat',
      })
    )
  })

  it('records the sale and queues a manual invite when GitHub refuses', async () => {
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    kitDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'rate-limited' })

    const res = await POST(request())

    expect(res.status).toBe(200) // the sale is good; GitHub is not our buyer's problem
    expect(create).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'pending_invite' }),
      })
    )
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ inviteUrl: null })
    )
  })

  it('does not attempt an invite when the buyer gave no username', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(kitPayment({ custom_field_responses: [] }))
    )
    kitDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'pending_invite' }),
      })
    )
  })

  it('signs a seat link for a Team licence and puts it in the email', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.amware.dev'
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    teamDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })
    tryCreateAccessToken.mockReturnValue({
      ok: true,
      token: 'tok_team',
      jti: 'jti_team',
    })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(tryCreateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: 99,
        itemType: 'product',
        itemId: 8,
      })
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessTokenJti: 'jti_team' }),
      })
    )
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        seats: 5,
        seatsUrl: 'https://www.amware.dev/access/seats/tok_team',
      })
    )
  })

  it('mints no seat link for a single-seat licence', async () => {
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    kitDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })

    await POST(request())

    expect(tryCreateAccessToken).not.toHaveBeenCalled()
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ seatsUrl: null })
    )
  })

  it('still delivers seat one when the seat link cannot be signed', async () => {
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    teamDb()
    const update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })
    tryCreateAccessToken.mockReturnValue({
      ok: false,
      reason: 'not-configured',
    })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'sent' }),
      })
    )
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ seatsUrl: null })
    )
  })
})

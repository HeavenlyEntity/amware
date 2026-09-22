import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* The route lives in src/app but is tested from here on purpose: the ui
   project has the `@/` alias the route imports through. Everything past
   the route's own logic is mocked: the signature check, the database, the
   mail. What is asserted is what the route decides to do. */
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
  sendDepositReceivedEmail: vi.fn().mockResolvedValue(undefined),
  notifyDepositReceived: vi.fn().mockResolvedValue(undefined),
  sendBoilerplateConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/commerce/accessToken', () => ({ tryCreateAccessToken: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyWhopWebhook } from '@/lib/commerce/whop'
import { inviteToRepo, removeFromRepo } from '@/lib/commerce/githubInvite'
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

const deactivated = (status) => ({
  id: 'msg_2',
  type: 'membership.deactivated',
  data: { id: 'mem_1', status, plan_id: 'plan_pro' },
})

const soldKit = {
  id: 99,
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  seatMembers: [{ githubUsername: 'octocat' }, { githubUsername: 'hubot' }],
}

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

  afterEach(() => {
    delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
  })

  it('ignores a completed one-time membership, which keeps access', async () => {
    verifyWhopWebhook.mockReturnValue(deactivated('completed'))
    find.mockResolvedValue({ docs: [soldKit] })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(removeFromRepo).not.toHaveBeenCalled()
  })

  it('logs, but does not remove, when the flag is off', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '0'
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    find.mockResolvedValue({ docs: [soldKit] })
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/would revoke/i),
      expect.objectContaining({
        membershipId: 'mem_1',
        usernames: ['octocat', 'hubot'],
      })
    )
  })

  it('removes every seat member when the flag is on and the membership was cancelled', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    find.mockResolvedValue({ docs: [soldKit] })
    removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(removeFromRepo).toHaveBeenCalledTimes(2)
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: 'amwaredotdev/warekit-next-netsuite',
      username: 'hubot',
    })
  })

  it('answers 200 for a membership it has no purchase for', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('expired'))
    find.mockResolvedValue({ docs: [] })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(removeFromRepo).not.toHaveBeenCalled()
  })
})

/* Added in the final fix wave. Everything above this line is the deposit
   path's regression alarm and stands unedited; these cases are additions
   only, with their own setup, and set every mock they rely on (the file's
   beforeEach clears calls, not implementations). */

describe('Whop webhook: a revocation that acts', () => {
  let update

  beforeEach(() => {
    update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
    vi.restoreAllMocks()
  })

  it('marks the purchase refunded after removing access, so its seat link and resend stop working', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    find.mockResolvedValue({ docs: [soldKit] })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        id: 99,
        data: { status: 'refunded' },
      })
    )
    // After the removals, never before: the row is the record of what ended.
    expect(update.mock.invocationCallOrder[0]).toBeGreaterThan(
      Math.max(...removeFromRepo.mock.invocationCallOrder)
    )
  })

  it('still marks it refunded when GitHub refuses a removal, because the licence has ended either way', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('expired'))
    find.mockResolvedValue({ docs: [soldKit] })
    removeFromRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await POST(request())

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, data: { status: 'refunded' } })
    )
  })

  it('mutates nothing in log-only mode', async () => {
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    find.mockResolvedValue({ docs: [soldKit] })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})

describe('Whop webhook: access another paid purchase still covers', () => {
  const REPO = 'amwaredotdev/warekit-next-netsuite'
  let update

  /* Answers each purchases query the way the database would: the
     membership lookup finds the row being revoked, and the coverage lookup
     finds every paid row on the repo -- the revoked row included, since it
     is still paid when the check runs. */
  const purchasesDb = (revoked, others) =>
    find.mockImplementation(async ({ where }) =>
      where?.whopMembershipId
        ? { docs: [revoked] }
        : { docs: [revoked, ...others] }
    )

  beforeEach(() => {
    update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
    vi.restoreAllMocks()
  })

  it('removes nobody when another paid purchase on the repo covers the same account', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    purchasesDb(
      {
        id: 99,
        status: 'paid',
        githubRepo: REPO,
        githubUsername: 'octocat',
        seatMembers: [{ githubUsername: 'octocat' }],
      },
      // A duplicate purchase, the login typed with different capitals.
      [{ id: 100, status: 'paid', githubRepo: REPO, githubUsername: 'OctoCat' }]
    )
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledWith(
      'Revocation skipped: still covered by another purchase',
      expect.objectContaining({
        username: 'octocat',
        purchaseId: 99,
        coveredBy: 100,
      })
    )
    /* Candidates by repo and status; the usernames are compared in code,
       because Postgres `equals` is case-sensitive and GitHub is not. */
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        where: {
          githubRepo: { equals: REPO },
          status: { equals: 'paid' },
        },
        pagination: false,
      })
    )
  })

  it('still removes a seat that only the ending licence covered', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
    purchasesDb(
      {
        id: 99,
        status: 'paid',
        githubRepo: REPO,
        seatMembers: [
          { githubUsername: 'octocat' },
          { githubUsername: 'hubot' },
        ],
      },
      // hubot is also a seat on a live Team licence; octocat is not.
      [
        {
          id: 101,
          status: 'paid',
          githubRepo: REPO,
          githubUsername: 'mona',
          seatMembers: [
            { githubUsername: 'mona' },
            { githubUsername: 'HUBOT' },
          ],
        },
      ]
    )
    vi.spyOn(console, 'info').mockImplementation(() => {})

    await POST(request())

    expect(removeFromRepo).toHaveBeenCalledTimes(1)
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'octocat',
    })
  })

  it('names only the accounts that would really go when it is only logging', async () => {
    verifyWhopWebhook.mockReturnValue(deactivated('expired'))
    purchasesDb(
      {
        id: 99,
        status: 'paid',
        githubRepo: REPO,
        seatMembers: [
          { githubUsername: 'octocat' },
          { githubUsername: 'hubot' },
        ],
      },
      [{ id: 101, status: 'paid', githubRepo: REPO, githubUsername: 'hubot' }]
    )
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await POST(request())

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/would revoke/i),
      expect.objectContaining({ usernames: ['octocat'] })
    )
    expect(info).toHaveBeenCalledWith(
      'Revocation skipped: still covered by another purchase',
      expect.objectContaining({ username: 'hubot', coveredBy: 101 })
    )
  })
})

describe('Whop webhook: seeing every deactivation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a deactivation before deciding it keeps access', async () => {
    verifyWhopWebhook.mockReturnValue(deactivated('completed'))
    find.mockResolvedValue({ docs: [soldKit] })
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    await POST(request())

    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/membership deactivated/i),
      { membershipId: 'mem_1', status: 'completed', plan_id: 'plan_pro' }
    )
    expect(removeFromRepo).not.toHaveBeenCalled()
  })

  it('logs one it cannot read, so a payload shape mismatch is visible', async () => {
    verifyWhopWebhook.mockReturnValue({
      id: 'msg_3',
      type: 'membership.deactivated',
      data: { membership: { id: 'mem_nested' } },
    })
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/membership deactivated/i),
      { membershipId: undefined, status: undefined, plan_id: undefined }
    )
    expect(getPayloadClient).not.toHaveBeenCalled()
  })
})

describe('Whop webhook: the membership a sale created', () => {
  let update

  beforeEach(() => {
    update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })
    sendBoilerplateConfirmationEmail.mockResolvedValue(undefined)
  })

  /* @whop/sdk@1.1.4's Payment carries a flat membership_id; revocation
     finds a purchase by this id, so missing it means never revoking. */
  it('records the flat membership_id the Payment type carries', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(kitPayment({ membership_id: 'mem_flat' }))
    )
    kitDb()

    await POST(request())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whopMembershipId: 'mem_flat' }),
      })
    )
  })

  it('still records a nested membership id', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(kitPayment({ membership: { id: 'mem_nested' } }))
    )
    kitDb()

    await POST(request())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whopMembershipId: 'mem_nested' }),
      })
    )
  })
})

describe('Whop webhook: the way back to the setup page', () => {
  let update, site

  beforeEach(() => {
    site = process.env.NEXT_PUBLIC_SITE_URL
    update = vi.fn().mockResolvedValue({})
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })
    sendBoilerplateConfirmationEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = site
  })

  it('sends the kit email the setup link and the full licence key', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.amware.dev/'
    verifyWhopWebhook.mockReturnValue(
      event(
        kitPayment({
          membership: { id: 'mem_1', license_key: 'WHOPKEY-4F2A-99C1-WXYZ' },
        })
      )
    )
    kitDb()

    await POST(request())

    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        setupUrl: 'https://www.amware.dev/checkout/onboarding?payment_id=pay_1',
        licenseKey: 'WHOPKEY-4F2A-99C1-WXYZ',
        // The setup link is its own line, never the onboardingUrl rewrite.
        onboardingUrl: null,
      })
    )
  })

  it('leaves the setup link out rather than send a relative one', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    kitDb()

    await POST(request())

    const args = sendBoilerplateConfirmationEmail.mock.calls[0][0]
    expect(args.setupUrl).toBeUndefined()
    expect(args.licenseKey).toBeUndefined()
  })
})

describe('Whop webhook: failures it must not hide', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* The one case a retry helps: the write failed and no row exists. */
  it('answers 500 when the purchase cannot be written and no duplicate exists', async () => {
    verifyWhopWebhook.mockReturnValue(event(payment()))
    db()
    create.mockRejectedValue(new Error('connection reset'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(500)
    // Checked for the race first: the dedupe, then the recheck after the throw.
    expect(
      find.mock.calls.filter(([args]) => args.collection === 'purchases')
    ).toHaveLength(2)
    expect(log).toHaveBeenCalledWith(
      'Whop purchase create failed',
      'pay_1',
      expect.any(Error)
    )
  })

  it('keeps the error when recording the kit invitation fails', async () => {
    verifyWhopWebhook.mockReturnValue(event(kitPayment()))
    kitDb()
    const failure = new Error('deadlock detected')
    const update = vi.fn().mockRejectedValue(failure)
    getPayloadClient.mockResolvedValue({ find, create, update })
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'https://github.com/i/1',
      id: 1,
    })
    sendBoilerplateConfirmationEmail.mockResolvedValue(undefined)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(log).toHaveBeenCalledWith(
      'Purchase invite update failed for payment',
      'pay_1',
      failure
    )
  })
})

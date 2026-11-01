import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* completeOnboarding is a 'use server' action, so every export of its module
   is a public endpoint. These tests drive it the way a form post does, with
   only the database, GitHub and the mailer replaced.

   The username claim is replaced by a stateful fake of the one conditional
   UPDATE the real helper runs (see purchaseClaim.test.js): the first caller on
   an empty row wins, every later one gets false. That is what lets a replay
   be tested without a database. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
vi.mock('@/lib/commerce/licenseRecord', () => ({ attachPurchase: vi.fn() }))
vi.mock('@/lib/commerce/purchaseClaim', () => ({
  claimGithubUsername: vi.fn(),
}))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendBoilerplateConfirmationEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase } from '@/lib/commerce/licenseRecord'
import { claimGithubUsername } from '@/lib/commerce/purchaseClaim'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
import { onboardingPath } from '@/lib/commerce/onboardingLink'
import { completeOnboarding } from '@/lib/commerce/onboarding'

const REQUEST_ID = '6f1c1d7e-2b1a-4c57-9a52-0f1f5d1a1111'

const kit = {
  id: 7,
  name: 'WareKit Next NetSuite (Team)',
  slug: 'warekit-next-netsuite-team',
  type: 'boilerplate',
  stack: 'next-netsuite',
  tier: 'team',
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
}

let row
let licenseDoc
let update
let findByID
let find

const signed = () => {
  const params = new URL(onboardingPath(REQUEST_ID), 'https://x.test')
    .searchParams
  return { r: params.get('r'), s: params.get('s') }
}

const form = (fields = {}) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries({
    ...signed(),
    githubUsername: 'octocat',
    ...fields,
  })) {
    if (v != null) fd.set(k, v)
  }
  return fd
}

const submit = (fields) =>
  completeOnboarding({ error: null, ok: null }, form(fields))

const updatesTo = (collection) =>
  update.mock.calls
    .map(([arg]) => arg)
    .filter((a) => a.collection === collection)

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACCESS_LINK_SECRET = 'test-secret-for-onboarding'

  row = {
    id: 99,
    email: 'buyer@example.com',
    status: 'paid',
    fulfillmentStatus: 'pending_invite',
    githubUsername: null,
    license: 5,
    creemRequestId: REQUEST_ID,
    item: { relationTo: 'products', value: kit },
  }
  licenseDoc = { id: 5, stack: 'next-netsuite', tier: 'team', seatMembers: [] }

  find = vi.fn().mockResolvedValue({ docs: [row] })
  findByID = vi
    .fn()
    .mockImplementation(({ collection }) =>
      collection === 'licenses' ? Promise.resolve(licenseDoc) : Promise.reject()
    )
  update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, findByID, update })

  claimGithubUsername.mockImplementation(async (_payload, _id, name) => {
    if (row.githubUsername) return false
    row.githubUsername = name
    return true
  })
  inviteToRepo.mockResolvedValue({
    ok: true,
    url: 'https://github.com/invite/1',
    state: 'invited',
  })
  attachPurchase.mockResolvedValue({ id: 5 })
  sendBoilerplateConfirmationEmail.mockResolvedValue(undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('completeOnboarding', () => {
  it('claims the account, invites it, and records the seat on the license', async () => {
    const state = await submit()

    expect(state.error).toBeNull()
    expect(state.ok).toMatchObject({
      username: 'octocat',
      repo: 'amwaredotdev/warekit-next-netsuite',
      inviteUrl: 'https://github.com/invite/1',
      manual: false,
    })
    expect(claimGithubUsername).toHaveBeenCalledWith(
      expect.anything(),
      99,
      'octocat'
    )
    expect(inviteToRepo).toHaveBeenCalledTimes(1)

    const [licenseWrite] = updatesTo('licenses')
    expect(licenseWrite.id).toBe(5)
    expect(licenseWrite.data.seatMembers).toEqual([
      expect.objectContaining({
        githubUsername: 'octocat',
        inviteUrl: 'https://github.com/invite/1',
      }),
    ])

    // Nothing new is written to the legacy field on the purchase.
    const [purchaseWrite] = updatesTo('purchases')
    expect(purchaseWrite.data.seatMembers).toBeUndefined()
    expect(purchaseWrite.data).toMatchObject({
      githubRepo: 'amwaredotdev/warekit-next-netsuite',
      githubInviteUrl: 'https://github.com/invite/1',
      fulfillmentStatus: 'sent',
    })
  })

  it('claims before it invites', async () => {
    const order = []
    claimGithubUsername.mockImplementation(async (_p, _id, name) => {
      order.push('claim')
      row.githubUsername = name
      return true
    })
    inviteToRepo.mockImplementation(async () => {
      order.push('invite')
      return { ok: true, url: null, state: 'invited' }
    })
    await submit()
    expect(order).toEqual(['claim', 'invite'])
  })

  /* The hole this closes: the signed link is a bearer link that stays valid,
     so each replay with a new name used to send another invitation, past the
     seat limit. */
  it('refuses a replay with a different username and sends no second invite', async () => {
    const first = await submit({ githubUsername: 'octocat' })
    expect(first.ok).not.toBeNull()

    const second = await submit({ githubUsername: 'someone-else' })

    expect(second.ok).toBeNull()
    expect(second.error.message).toMatch(/already set up/i)
    expect(inviteToRepo).toHaveBeenCalledTimes(1)
    expect(inviteToRepo).toHaveBeenCalledWith({
      repo: 'amwaredotdev/warekit-next-netsuite',
      username: 'octocat',
    })
    expect(row.githubUsername).toBe('octocat')
    expect(updatesTo('licenses')).toHaveLength(1)
  })

  it('refuses a replay of the same username without inviting again', async () => {
    await submit()
    const again = await submit()
    expect(again.ok).toBeNull()
    expect(inviteToRepo).toHaveBeenCalledTimes(1)
  })

  it('lets only one of two simultaneous submissions invite', async () => {
    const results = await Promise.all([
      submit({ githubUsername: 'octocat' }),
      submit({ githubUsername: 'hubot' }),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => r.error)).toHaveLength(1)
    expect(inviteToRepo).toHaveBeenCalledTimes(1)
  })

  it('refuses when the row already names an account, without trying to claim', async () => {
    row.githubUsername = 'octocat'
    row.fulfillmentStatus = 'sent'
    const state = await submit({ githubUsername: 'hubot' })

    expect(state.error.message).toMatch(/already set up/i)
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('does not use up the single claim on a GitHub account that does not exist', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404 })
    const state = await submit({ githubUsername: 'no-such-person' })

    expect(state.error.field).toBe('githubUsername')
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(row.githubUsername).toBeNull()
  })

  it('does not use up the single claim when the kit has no repository', async () => {
    row.item = { relationTo: 'products', value: { ...kit, githubRepo: null } }
    const state = await submit()
    expect(state.error.message).toMatch(/no repository/i)
    expect(claimGithubUsername).not.toHaveBeenCalled()
  })

  it('refuses a purchase that is not a kit', async () => {
    row.item = {
      relationTo: 'products',
      value: { ...kit, type: 'digital', githubRepo: 'amwaredotdev/anything' },
    }
    const state = await submit()

    expect(state.ok).toBeNull()
    expect(state.error).not.toBeNull()
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a row that is not paid', async () => {
    row.status = 'refunded'
    const state = await submit()

    expect(state.ok).toBeNull()
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a row whose fulfillment failed', async () => {
    row.fulfillmentStatus = 'failed'
    const state = await submit()

    expect(state.ok).toBeNull()
    expect(state.error.message).toMatch(/reply to your receipt/i)
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses an upgrade row, which grants no repository of its own', async () => {
    row.fulfillmentStatus = 'not_required'
    const state = await submit()

    expect(state.ok).toBeNull()
    expect(claimGithubUsername).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('says the payment has not arrived when no row carries that request id', async () => {
    find.mockResolvedValue({ docs: [] })
    const state = await submit()
    expect(state.error.message).toMatch(/has not reached me yet/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('verifies the signed link itself, whatever the page did', async () => {
    for (const fields of [{ s: 'forged' }, { s: null }, { r: 'other-id' }]) {
      const state = await submit(fields)
      expect(state.error.message).toMatch(/not valid/i)
    }
    expect(getPayloadClient).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('keeps the username and records a pending invite when GitHub fails', async () => {
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'github-down' })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await submit()
    error.mockRestore()

    expect(state.error).toBeNull()
    expect(state.ok).toMatchObject({
      username: 'octocat',
      manual: true,
      inviteUrl: null,
    })
    expect(row.githubUsername).toBe('octocat')
    const [purchaseWrite] = updatesTo('purchases')
    expect(purchaseWrite.data.fulfillmentStatus).toBe('pending_invite')
    expect(purchaseWrite.data.githubInviteUrl).toBeUndefined()
    // The buyer still holds seat one.
    expect(updatesTo('licenses')[0].data.seatMembers[0].githubUsername).toBe(
      'octocat'
    )
  })

  it('invites nobody when the claim itself cannot be made', async () => {
    claimGithubUsername.mockRejectedValue(new Error('connection refused'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await submit()
    error.mockRestore()

    expect(state.ok).toBeNull()
    expect(state.error.message).toMatch(/try again/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('does not add a second seat for an account already on the license', async () => {
    licenseDoc.seatMembers = [{ githubUsername: 'OctoCat' }]
    const state = await submit({ githubUsername: 'octocat' })

    expect(state.ok).not.toBeNull()
    expect(updatesTo('licenses')).toHaveLength(0)
  })

  it('keeps the seats already on the license when it adds the buyer', async () => {
    licenseDoc.seatMembers = [{ githubUsername: 'teammate' }]
    await submit()
    const members = updatesTo('licenses')[0].data.seatMembers
    expect(members.map((m) => m.githubUsername)).toEqual([
      'teammate',
      'octocat',
    ])
  })

  describe('when the first attach failed and the purchase has no license', () => {
    beforeEach(() => {
      row.license = null
      row.grantsTier = null
    })

    it('attaches it now and records the seat there', async () => {
      attachPurchase.mockResolvedValue({ id: 8 })
      licenseDoc = { id: 8, seatMembers: [] }
      const state = await submit()

      expect(attachPurchase).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          purchase: expect.objectContaining({ id: 99 }),
          email: 'buyer@example.com',
          stack: 'next-netsuite',
          grantsTier: 'team',
        })
      )
      expect(state.ok).not.toBeNull()
      expect(updatesTo('licenses')[0].id).toBe(8)
    })

    it('still invites and succeeds when it cannot attach, and writes no seat', async () => {
      attachPurchase.mockRejectedValue(new Error('no'))
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const state = await submit()
      error.mockRestore()

      expect(state.error).toBeNull()
      expect(state.ok.username).toBe('octocat')
      expect(inviteToRepo).toHaveBeenCalledTimes(1)
      expect(updatesTo('licenses')).toHaveLength(0)
      expect(updatesTo('purchases')[0].data.seatMembers).toBeUndefined()
    })
  })

  it('does not throw when recording the seat fails', async () => {
    update.mockImplementation(({ collection }) =>
      collection === 'licenses'
        ? Promise.reject(new Error('db'))
        : Promise.resolve({})
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await submit()
    error.mockRestore()

    expect(state.ok).not.toBeNull()
  })
})

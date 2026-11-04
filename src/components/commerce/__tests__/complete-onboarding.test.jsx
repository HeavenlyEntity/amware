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
vi.mock('@/lib/commerce/licenseRecord', () => ({
  attachPurchase: vi.fn(),
  licenseFromClaims: vi.fn(),
}))
vi.mock('@/lib/commerce/purchaseClaim', () => ({
  claimGithubUsername: vi.fn(),
}))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendBoilerplateConfirmationEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { attachPurchase, licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { claimGithubUsername } from '@/lib/commerce/purchaseClaim'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
import { onboardingPath } from '@/lib/commerce/onboardingLink'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
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
    createdAt: new Date().toISOString(),
    item: { relationTo: 'products', value: kit },
  }
  licenseDoc = { id: 5, stack: 'next-netsuite', tier: 'team', seatMembers: [] }

  find = vi.fn().mockResolvedValue({ docs: [row] })
  findByID = vi
    .fn()
    .mockImplementation(({ collection }) =>
      collection === 'licenses' ? Promise.resolve(licenseDoc) : Promise.reject()
    )
  /* The row keeps what is written to it, so a second submission meets the
     state the first one left. */
  update = vi.fn().mockImplementation(async ({ collection, data }) => {
    if (collection === 'purchases') Object.assign(row, data)
    if (collection === 'licenses') Object.assign(licenseDoc, data)
    return {}
  })
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
  /* What the action reads to check the seat limit: the license and the
     product that sets its limit (Team: five developers). */
  licenseFromClaims.mockImplementation(async (_payload, claims) =>
    claims.licenseId === licenseDoc.id
      ? { license: licenseDoc, product: { seats: 5 } }
      : null
  )
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

    /* The seat is taken first, with no link yet, and the invitation's link
       goes onto it once GitHub has answered. */
    const [reserve, link] = updatesTo('licenses')
    expect(reserve.id).toBe(5)
    expect(reserve.data.seatMembers).toEqual([
      expect.objectContaining({ githubUsername: 'octocat' }),
    ])
    expect(reserve.data.seatMembers[0].inviteUrl).toBeUndefined()
    expect(link.id).toBe(5)
    expect(link.data.seatMembers).toEqual([
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
    const licenseWrites = updatesTo('licenses').length

    const second = await submit({ githubUsername: 'someone-else' })

    expect(second.ok).toBeNull()
    expect(second.error.message).toMatch(/already set up/i)
    expect(inviteToRepo).toHaveBeenCalledTimes(1)
    expect(inviteToRepo).toHaveBeenCalledWith({
      repo: 'amwaredotdev/warekit-next-netsuite',
      username: 'octocat',
    })
    expect(row.githubUsername).toBe('octocat')
    // The replay writes nothing to the license.
    expect(updatesTo('licenses')).toHaveLength(licenseWrites)
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

  it('sends nothing, and asks for a retry, when the seat cannot be taken', async () => {
    update.mockImplementation(({ collection }) =>
      collection === 'licenses'
        ? Promise.reject(new Error('db'))
        : Promise.resolve({})
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await submit()
    error.mockRestore()

    expect(state.ok).toBeNull()
    expect(state.error?.message).toMatch(/nothing was sent/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('does not throw when only the invitation link cannot be stored', async () => {
    let licenseWrites = 0
    update.mockImplementation(async ({ collection, data }) => {
      if (collection === 'licenses') {
        licenseWrites += 1
        if (licenseWrites > 1) throw new Error('db')
        Object.assign(licenseDoc, data)
      }
      return {}
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await submit()
    error.mockRestore()

    expect(state.ok).not.toBeNull()
    expect(inviteToRepo).toHaveBeenCalledTimes(1)
  })

  it('takes the seat before it invites', async () => {
    const order = []
    update.mockImplementation(async ({ collection, data }) => {
      if (collection === 'licenses') {
        if (data.seatMembers) order.push('seat')
        Object.assign(licenseDoc, data)
      }
      if (collection === 'purchases') Object.assign(row, data)
      return {}
    })
    inviteToRepo.mockImplementation(async () => {
      order.push('invite')
      return { ok: true, url: 'https://github.com/invite/1', state: 'invited' }
    })
    await submit()
    expect(order.slice(0, 2)).toEqual(['seat', 'invite'])
  })

  it('invites nobody when the last seat went between the check and the claim', async () => {
    /* The first read finds room. By the time the seat is taken, a developer
       added from the license page has filled the license. */
    licenseDoc.seatMembers = ['a', 'b', 'c', 'd'].map((githubUsername) => ({
      githubUsername,
    }))
    licenseFromClaims.mockImplementation(async () => {
      const seen = { ...licenseDoc, seatMembers: [...licenseDoc.seatMembers] }
      licenseDoc.seatMembers.push({ githubUsername: 'e' })
      return { license: seen, product: { seats: 5 } }
    })
    const state = await submit()

    expect(state.ok).toBeNull()
    expect(state.error?.message).toMatch(
      /covers 5 developers and all 5 are in use/
    )
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(licenseDoc.seatMembers).toHaveLength(5)
  })

  describe('the license seat limit', () => {
    const fullLicense = () => {
      licenseDoc.seatMembers = [
        { githubUsername: 'a' },
        { githubUsername: 'b' },
        { githubUsername: 'c' },
        { githubUsername: 'd' },
        { githubUsername: 'e' },
      ]
    }

    it('refuses an account past the limit, and sends and claims nothing', async () => {
      fullLicense()
      const state = await submit({ githubUsername: 'newcomer' })

      expect(state.ok).toBeNull()
      expect(state.error.message).toMatch(/covers 5 developers/i)
      expect(state.error.message).toMatch(/license/i)
      expect(claimGithubUsername).not.toHaveBeenCalled()
      expect(inviteToRepo).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
      expect(row.githubUsername).toBeNull()
    })

    it('uses the limit the license carries, not the purchased product', async () => {
      licenseDoc.seatOverride = 1
      licenseDoc.seatMembers = [{ githubUsername: 'a' }]
      const state = await submit({ githubUsername: 'newcomer' })
      expect(state.error.message).toMatch(
        /covers 1 developer and all 1 is in use/i
      )
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('accepts an account that already holds a seat, without adding it twice', async () => {
      fullLicense()
      licenseDoc.seatMembers[2] = { githubUsername: 'OctoCat' }
      const state = await submit({ githubUsername: 'octocat' })

      expect(state.error).toBeNull()
      expect(inviteToRepo).toHaveBeenCalledTimes(1)
      expect(updatesTo('licenses')).toHaveLength(0)
    })

    it('refuses, rather than failing open, when the license cannot be read', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      licenseFromClaims.mockRejectedValue(
        Object.assign(new Error('connection terminated'), { status: 500 })
      )
      const state = await submit({ githubUsername: 'newcomer' })
      error.mockRestore()

      expect(state.ok).toBeNull()
      expect(state.error.message).toMatch(/nothing was sent/i)
      expect(state.error.message).toMatch(/try again/i)
      expect(claimGithubUsername).not.toHaveBeenCalled()
      expect(inviteToRepo).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
      expect(updatesTo('licenses')).toHaveLength(0)
      expect(row.githubUsername).toBeNull()
    })

    it('does not look at a limit when the purchase has no license', async () => {
      row.license = null
      attachPurchase.mockRejectedValue(new Error('no'))
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const state = await submit()
      error.mockRestore()
      expect(state.ok).not.toBeNull()
      expect(licenseFromClaims).not.toHaveBeenCalled()
    })
  })

  describe('retrying a failed invitation', () => {
    beforeEach(() => {
      row.githubUsername = 'octocat'
      row.fulfillmentStatus = 'pending_invite'
      row.githubInviteUrl = null
    })

    it('repeats the invitation for the same account, without claiming again', async () => {
      const state = await submit({ githubUsername: 'octocat' })

      expect(state.error).toBeNull()
      expect(state.ok).toMatchObject({ username: 'octocat', manual: false })
      expect(claimGithubUsername).not.toHaveBeenCalled()
      expect(inviteToRepo).toHaveBeenCalledWith({
        repo: 'amwaredotdev/warekit-next-netsuite',
        username: 'octocat',
      })
      expect(updatesTo('purchases')[0].data.fulfillmentStatus).toBe('sent')
    })

    it('matches the account without regard to case, and invites the stored spelling', async () => {
      row.githubUsername = 'OctoCat'
      await submit({ githubUsername: 'octocat' })
      expect(inviteToRepo).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'OctoCat' })
      )
    })

    it('never lets the name change on a retry', async () => {
      const state = await submit({ githubUsername: 'someone-else' })

      expect(state.ok).toBeNull()
      expect(state.error.message).toMatch(/already set up/i)
      expect(inviteToRepo).not.toHaveBeenCalled()
      expect(row.githubUsername).toBe('octocat')
    })

    it('stays pending, and keeps the account, when it fails again', async () => {
      inviteToRepo.mockResolvedValue({ ok: false, reason: 'github-down' })
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const state = await submit({ githubUsername: 'octocat' })
      error.mockRestore()

      expect(state.ok).toMatchObject({ manual: true, username: 'octocat' })
      expect(updatesTo('purchases')[0].data.fulfillmentStatus).toBe(
        'pending_invite'
      )
    })

    it('is not a retry once an invitation exists', async () => {
      row.githubInviteUrl = 'https://github.com/invite/1'
      const state = await submit({ githubUsername: 'octocat' })
      expect(state.error.message).toMatch(/already set up/i)
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('is not a retry for a row already sent', async () => {
      row.fulfillmentStatus = 'sent'
      const state = await submit({ githubUsername: 'octocat' })
      expect(state.error.message).toMatch(/already set up/i)
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('still respects the seat limit', async () => {
      licenseDoc.seatMembers = ['a', 'b', 'c', 'd', 'e'].map((n) => ({
        githubUsername: n,
      }))
      const state = await submit({ githubUsername: 'octocat' })
      expect(state.ok).toBeNull()
      expect(inviteToRepo).not.toHaveBeenCalled()
    })
  })

  describe('when the database fails', () => {
    it('does not throw if the client cannot be had, and sends nothing', async () => {
      getPayloadClient.mockRejectedValue(new Error('db down'))
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const state = await submit()
      error.mockRestore()

      expect(state.ok).toBeNull()
      expect(state.error.message).toMatch(/nothing was sent.*try again/i)
      expect(inviteToRepo).not.toHaveBeenCalled()
    })

    it('does not throw if the purchase lookup fails', async () => {
      find.mockRejectedValue(new Error('db down'))
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const state = await submit()
      error.mockRestore()

      expect(state.error.message).toMatch(/nothing was sent.*try again/i)
      expect(claimGithubUsername).not.toHaveBeenCalled()
      expect(inviteToRepo).not.toHaveBeenCalled()
    })
  })

  describe('the license link it returns', () => {
    it('is minted for a young purchase and opens this license', async () => {
      const state = await submit()
      const token = state.ok.licenseUrl.split('/').pop()

      expect(state.ok.licenseUrl).toMatch(/^\/access\/seats\//)
      expect(verifyAccessToken(token)).toMatchObject({
        purchaseId: 99,
        licenseId: 5,
        itemId: 7,
      })
    })

    it('is not minted for a purchase older than the 30 days a link lives', async () => {
      row.createdAt = new Date(
        Date.now() - 31 * 24 * 60 * 60 * 1000
      ).toISOString()
      const state = await submit()
      expect(state.ok).not.toBeNull()
      expect(state.ok.licenseUrl).toBeNull()
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Relative imports and mocks for the CMS and the mail. The token is signed and
   read for real, because which license a link opens is the point. The mock
   database answers the same `and` clauses Payload does, so a query that is
   too narrow or too wide changes what is found. */
vi.mock('../../getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('../fulfillment', () => ({
  sendAccessLinkEmail: vi.fn(),
  sendLicenseLinkEmail: vi.fn(),
}))

import { getPayloadClient } from '../../getPayloadClient'
import { sendAccessLinkEmail, sendLicenseLinkEmail } from '../fulfillment'
import { readAccessToken } from '../accessToken'
import { resendLink } from '../resendLink'

const OWNER = 'jane@acme.com'

const kitRow = (over = {}) => ({
  id: 42,
  email: OWNER,
  status: 'paid',
  fulfillmentStatus: 'sent',
  itemType: 'product',
  item: { relationTo: 'products', value: 7 },
  license: 9,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...over,
})

/* The Team upgrade: no delivery of its own, so `not_required`, but on the
   license. */
const upgradeRow = (over = {}) =>
  kitRow({
    id: 77,
    fulfillmentStatus: 'not_required',
    item: { relationTo: 'products', value: 8 },
    createdAt: '2026-10-01T00:00:00.000Z',
    ...over,
  })

const matches = (row, clause) =>
  Object.entries(clause).every(([field, test]) => {
    const value = row[field]
    if ('equals' in test) return value === test.equals
    if ('not_equals' in test) return value !== test.not_equals
    if ('exists' in test) return (value != null) === test.exists
    throw new Error(`unsupported clause ${JSON.stringify(test)}`)
  })

const world = ({
  purchases = [],
  licenses = [{ id: 9, ownerEmail: OWNER, tier: 'pro' }],
} = {}) => {
  const db = {
    find: vi.fn(async ({ collection, where, sort }) => {
      if (collection !== 'purchases') throw new Error('unexpected read')
      const docs = purchases.filter((row) =>
        (where.and ?? []).every((clause) => matches(row, clause))
      )
      if (sort === '-createdAt') {
        docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }
      return { docs }
    }),
    findByID: vi.fn(async ({ collection, id }) => {
      const row =
        collection === 'licenses' ? licenses.find((l) => l.id === id) : null
      if (!row) throw Object.assign(new Error('Not Found'), { status: 404 })
      return row
    }),
  }
  getPayloadClient.mockResolvedValue(db)
  return db
}

const submit = (email, extra = {}) => {
  const fd = new FormData()
  if (email != null) fd.set('email', email)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return resendLink({ done: false, error: null }, fd)
}

const sent = () => sendLicenseLinkEmail.mock.calls.at(-1)[0]
const tokenOf = (url) => url.split('/access/seats/')[1]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACCESS_LINK_SECRET = 'resend-secret'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  sendLicenseLinkEmail.mockResolvedValue(undefined)
  sendAccessLinkEmail.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('resend for a kit buyer', () => {
  it('resend sends a kit buyer the license page link', async () => {
    world({ purchases: [kitRow()] })
    const answer = await submit(OWNER)

    expect(answer).toEqual({ done: true, error: null })
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(sent()).toMatchObject({ to: OWNER, reason: 'link' })
    expect(sent().url).toMatch(
      /^https:\/\/example\.com\/access\/seats\/[^/?]+$/
    )
    const read = readAccessToken(tokenOf(sent().url))
    expect(read.state).toBe('valid')
    expect(read.claims).toMatchObject({
      purchaseId: 42,
      licenseId: 9,
      itemType: 'product',
      itemId: 7,
    })
  })

  it('resend talks about upgrading with intent=upgrade', async () => {
    world({ purchases: [kitRow()] })
    await submit(OWNER, { intent: 'upgrade' })
    expect(sent().reason).toBe('upgrade')
  })

  it.each(['', 'link', 'anything-else', 'UPGRADE'])(
    'treats intent %j as a plain resend',
    async (intent) => {
      world({ purchases: [kitRow()] })
      await submit(OWNER, { intent })
      expect(sent().reason).toBe('link')
    }
  )

  it('mints from the newest paid row with a license, with the license id in the token', async () => {
    world({ purchases: [kitRow(), upgradeRow()] })
    await submit(OWNER)
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(readAccessToken(tokenOf(sent().url)).claims).toMatchObject({
      purchaseId: 77,
      licenseId: 9,
    })
  })

  it('does not let a not_required upgrade row hide the license', async () => {
    // The old query skipped `not_required`, so a buyer whose newest row was
    // an upgrade could be passed over, or sent a link with no license in it.
    world({ purchases: [upgradeRow()] })
    await submit(OWNER)
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(readAccessToken(tokenOf(sent().url)).claims.licenseId).toBe(9)
  })

  it('does not count a refunded row', async () => {
    world({ purchases: [kitRow({ status: 'refunded' })] })
    await submit(OWNER)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
  })

  it('reads the license from a relationship that arrives as an object', async () => {
    world({ purchases: [kitRow({ license: { id: 9 } })] })
    await submit(OWNER)
    expect(readAccessToken(tokenOf(sent().url)).claims.licenseId).toBe(9)
  })

  it('sends only to the license owner, never to someone else who paid on it', async () => {
    // A person who paid for an upgrade with their own email is not the owner.
    world({
      purchases: [upgradeRow({ email: 'payer@elsewhere.test' })],
    })
    const answer = await submit('payer@elsewhere.test')
    expect(answer).toEqual({ done: true, error: null })
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
  })

  it('compares owner addresses without regard to case', async () => {
    world({
      purchases: [kitRow({ email: 'Jane@Acme.com' })],
      licenses: [{ id: 9, ownerEmail: 'jane@acme.com' }],
    })
    await submit('Jane@Acme.com')
    expect(sent().to).toBe('jane@acme.com')
  })

  it('sends nothing, and says nothing different, when the license is gone', async () => {
    world({ purchases: [kitRow()], licenses: [] })
    expect(await submit(OWNER)).toEqual({ done: true, error: null })
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })
})

describe('resend for a purchase with no license', () => {
  it('keeps sending the old access link for a non-kit purchase', async () => {
    world({
      purchases: [
        kitRow({
          id: 12,
          license: null,
          item: { relationTo: 'courses', value: 3 },
          itemType: 'course',
        }),
      ],
    })
    const answer = await submit(OWNER)

    expect(answer).toEqual({ done: true, error: null })
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    expect(sendAccessLinkEmail).toHaveBeenCalledTimes(1)
    const call = sendAccessLinkEmail.mock.calls[0][0]
    expect(call).toMatchObject({ to: OWNER, itemName: 'your purchase' })
    expect(readAccessToken(call.token).claims).toMatchObject({
      purchaseId: 12,
      itemType: 'course',
      itemId: 3,
    })
  })

  it('still skips a purchase that has nothing to link to', async () => {
    world({
      purchases: [
        kitRow({ license: null, fulfillmentStatus: 'not_required' }),
        kitRow({ id: 13, license: null, fulfillmentStatus: 'pending_invite' }),
      ],
    })
    await submit(OWNER)
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
  })

  it('does not fall back to the old link for a licensed purchase it would not mail', async () => {
    world({ purchases: [kitRow({ email: 'payer@elsewhere.test' })] })
    await submit('payer@elsewhere.test')
    expect(sendAccessLinkEmail).not.toHaveBeenCalled()
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })
})

describe('resend answers every email the same way', () => {
  const DONE = { done: true, error: null }

  it('resend behaves identically for an unknown email', async () => {
    world({ purchases: [kitRow()] })
    const known = await submit(OWNER)
    const mailed = sendLicenseLinkEmail.mock.calls.length
    const unknown = await submit('nobody@nowhere.test')

    expect(mailed).toBe(1)
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(unknown).toEqual(known)
    expect(unknown).toEqual(DONE)
    expect(Object.keys(unknown)).toEqual(Object.keys(known))
  })

  it('answers the same for a known address whose mail then fails', async () => {
    world({ purchases: [kitRow()] })
    sendLicenseLinkEmail.mockRejectedValue(new Error('resend is down'))
    expect(await submit(OWNER)).toEqual(DONE)
  })

  it('answers the same when the old mail fails, and when nothing can be signed', async () => {
    world({
      purchases: [kitRow({ id: 12, license: null, itemType: 'course' })],
    })
    sendAccessLinkEmail.mockRejectedValue(new Error('resend is down'))
    expect(await submit(OWNER)).toEqual(DONE)

    delete process.env.ACCESS_LINK_SECRET
    expect(await submit(OWNER)).toEqual(DONE)
    world({ purchases: [kitRow()] })
    expect(await submit(OWNER)).toEqual(DONE)
  })

  it('answers the same when the site address is missing', async () => {
    world({ purchases: [kitRow()] })
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(await submit(OWNER)).toEqual(DONE)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  it('answers the same for an address that matches only after trimming', async () => {
    world({ purchases: [kitRow()] })
    expect(await submit(`  ${OWNER}  `)).toEqual(DONE)
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
  })

  it('asks for an address when there is none, without touching the database', async () => {
    world({ purchases: [kitRow()] })
    for (const email of [undefined, '', '   ']) {
      const answer = await submit(email)
      expect(answer.done).toBe(false)
      expect(answer.error).toMatch(/email/i)
    }
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('asks for a retry, and does not throw, when the database fails', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection refused'))
    const answer = await submit(OWNER)
    expect(answer.done).toBe(false)
    expect(answer.error).toMatch(/try again/i)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  it('does not call a failing license read an unknown email', async () => {
    const db = world({ purchases: [kitRow()] })
    db.findByID.mockRejectedValue(
      Object.assign(new Error('connection terminated'), { status: 500 })
    )
    const answer = await submit(OWNER)
    expect(answer.done).toBe(false)
    expect(answer.error).toMatch(/try again/i)
  })
})

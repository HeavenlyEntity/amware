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
      if (collection === 'licenses') {
        return { docs: licenses.filter((row) => matches(row, where)) }
      }
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
    // Writes land on the stored row, so the next request reads them back.
    update: vi.fn(async ({ collection, id, data }) => {
      const row =
        collection === 'licenses' ? licenses.find((l) => l.id === id) : null
      Object.assign(row, data)
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
const mailedLicenses = () =>
  sendLicenseLinkEmail.mock.calls.map(
    ([mail]) => readAccessToken(tokenOf(mail.url)).claims.licenseId
  )

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

  it('mints from a row someone else paid, for the owner of the license', async () => {
    // The owner's address is on no purchase here: a colleague's card paid.
    world({ purchases: [upgradeRow({ email: 'payer@elsewhere.test' })] })
    await submit(OWNER)
    expect(sent().to).toBe(OWNER)
    expect(readAccessToken(tokenOf(sent().url)).claims).toMatchObject({
      purchaseId: 77,
      licenseId: 9,
    })
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

  it('finds licenses by the lowercased address', async () => {
    const db = world({
      purchases: [kitRow({ email: 'Jane@Acme.com' })],
      licenses: [{ id: 9, ownerEmail: 'jane@acme.com', tier: 'pro' }],
    })
    await submit('  Jane@Acme.COM ')

    const query = db.find.mock.calls
      .map(([arg]) => arg)
      .find((arg) => arg.collection === 'licenses')
    expect(query.where).toEqual({ ownerEmail: { equals: 'jane@acme.com' } })
    expect(query.overrideAccess).toBe(true)
    expect(sent().to).toBe('jane@acme.com')
  })

  it('asks for the newest paid row of that license', async () => {
    const db = world({ purchases: [kitRow()] })
    await submit(OWNER)

    const query = db.find.mock.calls
      .map(([arg]) => arg)
      .find((arg) => arg.where.and?.[0].license)
    expect(query).toMatchObject({
      collection: 'purchases',
      sort: '-createdAt',
      limit: 1,
    })
    expect(query.where.and).toEqual([
      { license: { equals: 9 } },
      { status: { equals: 'paid' } },
    ])
  })

  it('sends nothing, and says nothing different, when the license is gone', async () => {
    world({ purchases: [kitRow()], licenses: [] })
    expect(await submit(OWNER)).toEqual({ done: true, error: null })
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })
})

describe('resend for an owner of several licenses', () => {
  const MINUTE = 60 * 1000
  const ago = (minutes) => new Date(Date.now() - minutes * MINUTE).toISOString()
  const DONE = { done: true, error: null }
  const owned = (id, tier, over = {}) => ({
    id,
    ownerEmail: OWNER,
    tier,
    ...over,
  })
  const rows = (...ids) =>
    ids.map((id) => kitRow({ id: 100 + id, license: id }))

  it('mails every license that holds a tier, each with its own id', async () => {
    world({
      purchases: rows(1, 2, 3),
      licenses: [owned(1, 'pro'), owned(2, 'team'), owned(3, 'enterprise')],
    })

    expect(await submit(OWNER)).toEqual(DONE)

    expect(mailedLicenses().sort()).toEqual([1, 2, 3])
    expect(sendLicenseLinkEmail.mock.calls.map(([mail]) => mail.to)).toEqual([
      OWNER,
      OWNER,
      OWNER,
    ])
    expect(readAccessToken(tokenOf(sent().url)).claims.purchaseId).toBe(103)
  })

  it('skips a license with no tier, and another owner’s', async () => {
    world({
      purchases: rows(1, 2, 3),
      licenses: [
        owned(1, 'pro'),
        owned(2, null),
        owned(3, 'pro', { ownerEmail: 'someone@else.test' }),
      ],
    })

    await submit(OWNER)

    expect(mailedLicenses()).toEqual([1])
  })

  it('mails a Lite license too, on a plain resend', async () => {
    world({
      purchases: rows(1, 2),
      licenses: [owned(1, 'lite'), owned(2, 'pro')],
    })

    await submit(OWNER)

    expect(mailedLicenses().sort()).toEqual([1, 2])
  })

  it('keeps each license inside its own window', async () => {
    const db = world({
      purchases: rows(1, 2),
      licenses: [
        owned(1, 'pro', { lastLinkSentAt: ago(1) }),
        owned(2, 'pro', { lastLinkSentAt: ago(11) }),
      ],
    })

    await submit(OWNER)

    expect(mailedLicenses()).toEqual([2])
    expect(db.update).toHaveBeenCalledTimes(1)
    expect(db.update.mock.calls[0][0].id).toBe(2)
  })

  it('skips Lite with intent=upgrade when a paid license exists', async () => {
    world({
      purchases: rows(1, 2),
      licenses: [owned(1, 'lite'), owned(2, 'pro')],
    })

    await submit(OWNER, { intent: 'upgrade' })

    expect(mailedLicenses()).toEqual([2])
    expect(sent().reason).toBe('upgrade')
  })

  it('still mails Lite with intent=upgrade when it is all there is', async () => {
    world({ purchases: rows(1), licenses: [owned(1, 'lite')] })

    await submit(OWNER, { intent: 'upgrade' })

    expect(mailedLicenses()).toEqual([1])
  })

  it('carries on past a mail that fails, with the same answer', async () => {
    world({
      purchases: rows(1, 2),
      licenses: [owned(1, 'pro'), owned(2, 'pro')],
    })
    sendLicenseLinkEmail.mockRejectedValueOnce(new Error('resend is down'))

    expect(await submit(OWNER)).toEqual(DONE)

    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(2)
  })

  it('carries on past a license whose purchases cannot be read', async () => {
    const db = world({
      purchases: rows(1, 2),
      licenses: [owned(1, 'pro'), owned(2, 'pro')],
    })
    const ok = db.find.getMockImplementation()
    db.find.mockImplementation(async (query) => {
      if (query.where.and?.[0].license?.equals === 1) {
        throw new Error('connection terminated')
      }
      return ok(query)
    })

    expect(await submit(OWNER)).toEqual(DONE)

    expect(mailedLicenses()).toEqual([2])
  })

  it('answers the same for an owner of many as for an unknown address', async () => {
    world({
      purchases: rows(1, 2),
      licenses: [owned(1, 'pro'), owned(2, 'lite')],
    })
    const known = await submit(OWNER)
    const unknown = await submit('nobody@nowhere.test')

    expect(unknown).toEqual(known)
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

  it('sends both to an owner of a license who also bought a course', async () => {
    world({
      purchases: [
        kitRow(),
        kitRow({
          id: 12,
          license: null,
          item: { relationTo: 'courses', value: 3 },
          itemType: 'course',
        }),
      ],
    })

    expect(await submit(OWNER)).toEqual({ done: true, error: null })

    expect(mailedLicenses()).toEqual([9])
    expect(sendAccessLinkEmail).toHaveBeenCalledTimes(1)
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
    db.find.mockRejectedValue(
      Object.assign(new Error('connection terminated'), { status: 500 })
    )
    const answer = await submit(OWNER)
    expect(answer.done).toBe(false)
    expect(answer.error).toMatch(/try again/i)
  })
})

describe('resend and the ten-minute window', () => {
  const MINUTE = 60 * 1000
  const DONE = { done: true, error: null }
  const license = (lastLinkSentAt) => ({
    id: 9,
    ownerEmail: OWNER,
    tier: 'pro',
    ...(lastLinkSentAt ? { lastLinkSentAt } : {}),
  })
  const ago = (minutes) => new Date(Date.now() - minutes * MINUTE).toISOString()

  it('sends a second resend nothing inside ten minutes, with the same answer', async () => {
    world({ purchases: [kitRow()] })
    const first = await submit(OWNER)
    const second = await submit(OWNER)

    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
    expect(second).toEqual(DONE)
  })

  it('sends again once ten minutes have passed', async () => {
    world({ purchases: [kitRow()], licenses: [license(ago(11))] })
    expect(await submit(OWNER)).toEqual(DONE)
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
  })

  it('holds the line at nine minutes, and writes nothing', async () => {
    const db = world({ purchases: [kitRow()], licenses: [license(ago(9))] })
    expect(await submit(OWNER)).toEqual(DONE)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it('shares the window with the expired-link button, which writes lastLinkSentAt', async () => {
    // A mail from the license page's button, a minute ago.
    world({ purchases: [kitRow()], licenses: [license(ago(1))] })
    await submit(OWNER)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  it('records the send before the mail goes', async () => {
    const db = world({ purchases: [kitRow()] })
    await submit(OWNER)
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'licenses',
        id: 9,
        data: { lastLinkSentAt: expect.any(String) },
      })
    )
    expect(db.update.mock.invocationCallOrder[0]).toBeLessThan(
      sendLicenseLinkEmail.mock.invocationCallOrder[0]
    )
  })

  it('is per license: another license is not held back', async () => {
    world({
      purchases: [
        kitRow(),
        kitRow({ id: 50, email: 'other@acme.com', license: 10 }),
      ],
      licenses: [
        license(ago(1)),
        { id: 10, ownerEmail: 'other@acme.com', tier: 'pro' },
      ],
    })
    await submit(OWNER)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    await submit('other@acme.com')
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
  })

  it('gives the window back when the mail fails, so a retry is not blocked', async () => {
    world({ purchases: [kitRow()], licenses: [license(ago(30))] })
    const before = (await getPayloadClient()).findByID
    sendLicenseLinkEmail.mockRejectedValueOnce(new Error('resend is down'))
    expect(await submit(OWNER)).toEqual(DONE)
    expect(await submit(OWNER)).toEqual(DONE)
    expect(before).toBeDefined()
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(2)
  })

  it('sends nothing, and still answers the same, when it cannot record the send', async () => {
    const db = world({ purchases: [kitRow()] })
    db.update.mockRejectedValue(new Error('write failed'))
    expect(await submit(OWNER)).toEqual(DONE)
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  it('does not apply the window to a non-kit purchase', async () => {
    world({
      purchases: [kitRow({ id: 12, license: null, itemType: 'course' })],
    })
    await submit(OWNER)
    await submit(OWNER)
    expect(sendAccessLinkEmail).toHaveBeenCalledTimes(2)
  })
})

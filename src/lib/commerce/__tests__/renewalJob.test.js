import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../githubInvite', () => ({
  removeFromRepo: vi.fn(),
  inviteToRepo: vi.fn(),
}))
vi.mock('../fulfillment', () => ({
  sendRenewalReminderEmail: vi.fn(),
  sendUpdatesEndedEmail: vi.fn(),
}))

import { inviteToRepo, removeFromRepo } from '../githubInvite'
import { sendRenewalReminderEmail, sendUpdatesEndedEmail } from '../fulfillment'
import { handleRenewalJob, runRenewalJob } from '../renewalJob'

const REPO = 'amwaredotdev/warekit-next-netsuite'
const INVITE = 'https://github.com/o/r/invitations'
const UNTIL = '2027-12-10T15:00:00.000Z'

/* An in-memory Payload: enough of `find` for the queries the job, recomputeTier,
   licenseRepo and coveredByAnotherLicense make. */
const valueAt = (row, path) =>
  path
    .split('.')
    .reduce((v, k) => (Array.isArray(v) ? v.map((x) => x?.[k]) : v?.[k]), row)
const idOf = (v) => (v && typeof v === 'object' ? v.id : v)
const test1 = (value, cond) => {
  const values = Array.isArray(value) ? value : [value]
  if ('equals' in cond) return values.some((v) => idOf(v) === cond.equals)
  if ('not_equals' in cond)
    return values.every((v) => idOf(v) !== cond.not_equals)
  if ('in' in cond) return values.some((v) => cond.in.includes(v))
  if ('exists' in cond) return values.some((v) => (v != null) === cond.exists)
  if ('like' in cond)
    return values.some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(String(cond.like).toLowerCase())
    )
  return true
}
const matches = (row, where) =>
  !where ||
  (where.and
    ? where.and.every((w) => matches(row, w))
    : Object.entries(where).every(([path, cond]) =>
        test1(valueAt(row, path), cond)
      ))
function memory(tables) {
  return {
    tables,
    find: vi.fn(async ({ collection, where }) => ({
      docs: tables[collection]
        .filter((r) => matches(r, where))
        .map((r) => ({ ...r })),
    })),
    findByID: vi.fn(async ({ collection, id }) => {
      const row = tables[collection].find((r) => r.id === id)
      if (!row) throw Object.assign(new Error('Not Found'), { status: 404 })
      return { ...row }
    }),
    update: vi.fn(async ({ collection, id, data }) =>
      Object.assign(
        tables[collection].find((r) => r.id === id),
        data
      )
    ),
  }
}
const world = ({ license = {}, others = [], kitRow = {} } = {}) =>
  memory({
    licenses: [
      {
        id: 41,
        ownerEmail: 'owner@example.com',
        stack: 'next-netsuite',
        tier: 'pro',
        creemEnvironment: 'production',
        seatMembers: [
          { githubUsername: 'Buyer', inviteUrl: INVITE },
          { githubUsername: 'teammate', inviteUrl: INVITE },
        ],
        ...license,
      },
      ...others,
    ],
    purchases: [
      {
        id: 1,
        license: 41,
        status: 'paid',
        grantsTier: 'pro',
        kind: 'sale',
        createdAt: '2026-12-10T15:00:00.000Z',
        githubRepo: REPO,
      },
    ],
    products: [
      {
        id: 6,
        name: 'WareKit Next NetSuite (Pro)',
        stack: 'next-netsuite',
        tier: 'pro',
        status: 'published',
        renewalPrice: 199,
        githubRepo: REPO,
        ...kitRow,
      },
    ],
  })
const run = (payload, iso, live = true) =>
  runRenewalJob(payload, { now: new Date(iso), live })
const license41 = (p) => p.tables.licenses.find((l) => l.id === 41)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.ACCESS_LINK_SECRET = 'job-secret'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
  removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
  sendRenewalReminderEmail.mockResolvedValue()
  sendUpdatesEndedEmail.mockResolvedValue()
})
afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
  delete process.env.CREEM_ENV
  delete process.env.CRON_SECRET
})

it('works out a missing date before it decides', async () => {
  const p = world()
  await run(p, '2027-01-01T00:00:00.000Z')
  expect(license41(p).updatesComputedUntil).toBe(UNTIL)
})
it('sends the 30-day reminder once', async () => {
  const p = world()
  expect(await run(p, '2027-11-10T16:00:00.000Z')).toMatchObject({
    firstReminders: 1,
  })
  expect(await run(p, '2027-11-10T17:00:00.000Z')).toMatchObject({
    firstReminders: 0,
  })
  expect(sendRenewalReminderEmail).toHaveBeenCalledTimes(1)
  expect(sendRenewalReminderEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'owner@example.com',
      until: UNTIL,
      price: 199,
      which: 'first',
      kitName: 'WareKit Next NetSuite (Pro)',
      url: expect.stringMatching(/^https:\/\/example\.com\/access\/seats\/.+/),
    })
  )
})
it('sends only the 7-day reminder inside 7 days', async () => {
  const p = world()
  await run(p, '2027-12-04T06:00:00.000Z')
  expect(sendRenewalReminderEmail).toHaveBeenCalledTimes(1)
  expect(sendRenewalReminderEmail.mock.calls[0][0].which).toBe('last')
})
it('withdraws access once on the first run after the end, records it and emails the owner', async () => {
  const p = world()
  expect(await run(p, '2027-12-11T06:00:00.000Z')).toMatchObject({
    withdrawn: 1,
    notices: 1,
  })
  expect(removeFromRepo).toHaveBeenCalledTimes(2)
  expect(license41(p)).toMatchObject({
    accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
    endedNoticeSentFor: UNTIL,
  })
  expect(sendUpdatesEndedEmail).toHaveBeenCalledWith(
    expect.objectContaining({ endedOn: UNTIL, price: 199 })
  )
})
it('changes nothing on a second run the same day', async () => {
  const p = world()
  await run(p, '2027-12-11T06:00:00.000Z')
  vi.clearAllMocks()
  const before = JSON.stringify(p.tables)
  await run(p, '2027-12-11T09:00:00.000Z')
  expect(JSON.stringify(p.tables)).toBe(before)
  expect(removeFromRepo).not.toHaveBeenCalled()
  expect(sendUpdatesEndedEmail).not.toHaveBeenCalled()
})
it('records nothing and emails nobody when GitHub cannot be reached', async () => {
  removeFromRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
  const p = world()
  await run(p, '2027-12-11T06:00:00.000Z')
  expect(license41(p).accessWithdrawnAt).toBeUndefined()
  expect(license41(p).needsReview).toBe(true)
  expect(sendUpdatesEndedEmail).not.toHaveBeenCalled()
})
it('leaves a seat another license with updates in force covers', async () => {
  // The other license is in the sandbox: cover ignores the Creem environment, the job does not, so this run never acts on it.
  const p = world({
    others: [
      {
        id: 50,
        stack: 'next-netsuite',
        tier: 'team',
        creemEnvironment: 'sandbox',
        updatesUntilOverride: '2030-01-01T00:00:00.000Z',
        seatMembers: [{ githubUsername: 'TEAMMATE' }],
      },
    ],
  })
  await run(p, '2027-12-11T06:00:00.000Z')
  expect(removeFromRepo).toHaveBeenCalledTimes(1)
  expect(removeFromRepo).toHaveBeenCalledWith({ repo: REPO, username: 'Buyer' })
})
it('removes a seat whose other license has ended too', async () => {
  const p = world({
    others: [
      {
        id: 50,
        stack: 'next-netsuite',
        tier: 'pro',
        creemEnvironment: 'sandbox',
        updatesComputedUntil: '2027-06-01T00:00:00.000Z',
        seatMembers: [{ githubUsername: 'teammate' }],
      },
    ],
  })
  await run(p, '2027-12-11T06:00:00.000Z')
  expect(removeFromRepo).toHaveBeenCalledTimes(2)
})
it('leaves a seat with no invitation link, flags once and still records the withdrawal', async () => {
  const p = world({
    license: {
      seatMembers: [
        { githubUsername: 'Buyer', inviteUrl: INVITE },
        { githubUsername: 'typed-in' },
      ],
    },
  })
  await run(p, '2027-12-11T06:00:00.000Z')
  expect(removeFromRepo).toHaveBeenCalledTimes(1)
  expect(license41(p)).toMatchObject({
    needsReview: true,
    accessWithdrawnFor: UNTIL,
  })
  license41(p).needsReview = false
  await run(p, '2027-12-12T06:00:00.000Z')
  expect(license41(p).needsReview).toBe(false)
})
it('is a dry run with the flag off: no email, no removal, no write, counts logged', async () => {
  const p = world({ license: { updatesComputedUntil: UNTIL } })
  const counts = await run(p, '2027-12-11T06:00:00.000Z', false)
  expect(counts).toMatchObject({ live: false, withdrawn: 1, wouldRemove: 2 })
  expect(p.update).not.toHaveBeenCalled()
  expect(removeFromRepo).not.toHaveBeenCalled()
  expect(sendUpdatesEndedEmail).not.toHaveBeenCalled()
  expect(console.info).toHaveBeenCalledWith(
    'Renewal job dry run',
    expect.objectContaining({ wouldRemove: 2 })
  )
})
it('acts only on licenses of its own Creem environment', async () => {
  const p = world({ license: { creemEnvironment: 'sandbox' } })
  expect(await run(p, '2027-12-11T06:00:00.000Z')).toMatchObject({ checked: 0 })
})
it('never reminds or cuts off a license with no end date', async () => {
  // Tier is worked out from purchases, so the fixture's sale must be Enterprise's.
  const p = world({ license: { tier: 'enterprise' } })
  Object.assign(p.tables.purchases[0], {
    grantsTier: 'enterprise',
    kind: 'quote',
  })
  expect(await run(p, '2030-01-01T00:00:00.000Z')).toMatchObject({
    checked: 1,
    failed: 0,
  })
  expect(removeFromRepo).not.toHaveBeenCalled()
  expect(sendRenewalReminderEmail).not.toHaveBeenCalled()
})
describe('a withdrawn license that became Enterprise', () => {
  // Tier is worked out from purchases: the Enterprise quote is paid after the
  // Pro sale, and Enterprise has no date until an override is set.
  const enterpriseWorld = () => {
    const p = world({
      license: {
        tier: 'enterprise',
        accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
        accessWithdrawnFor: UNTIL,
      },
    })
    p.tables.purchases.push({
      id: 2,
      license: 41,
      status: 'paid',
      grantsTier: 'enterprise',
      kind: 'quote',
      createdAt: '2027-12-15T00:00:00.000Z',
      githubRepo: REPO,
    })
    return p
  }
  it('gets its access back on a live run', async () => {
    inviteToRepo.mockResolvedValue({
      ok: true,
      state: 'invited',
      url: 'x',
      id: 1,
    })
    const p = enterpriseWorld()
    expect(await run(p, '2027-12-20T00:00:00.000Z')).toMatchObject({
      restored: 1,
      failed: 0,
    })
    expect(inviteToRepo).toHaveBeenCalledTimes(2)
    expect(license41(p).accessWithdrawnAt).toBeNull()
    expect(removeFromRepo).not.toHaveBeenCalled()
  })
  it('is only counted on a dry run', async () => {
    const p = enterpriseWorld()
    expect(await run(p, '2027-12-20T00:00:00.000Z', false)).toMatchObject({
      restored: 1,
    })
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(p.update).not.toHaveBeenCalled()
    expect(license41(p).accessWithdrawnAt).toBe('2027-12-11T06:00:00.000Z')
  })
})
it('gives access back when the date in force moves ahead again', async () => {
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'invited',
    url: 'x',
    id: 1,
  })
  const p = world({
    license: {
      accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
      accessWithdrawnFor: UNTIL,
      updatesUntilOverride: '2028-06-01T00:00:00.000Z',
    },
  })
  expect(await run(p, '2027-12-20T00:00:00.000Z')).toMatchObject({
    restored: 1,
  })
  expect(license41(p).accessWithdrawnAt).toBeNull()
})
it('gives the reminder mark back when the email fails, so the next run sends it once', async () => {
  sendRenewalReminderEmail.mockRejectedValueOnce(new Error('Resend refused'))
  const p = world()
  expect(await run(p, '2027-11-10T16:00:00.000Z')).toMatchObject({
    failed: 1,
    firstReminders: 0,
  })
  expect(license41(p).firstReminderSentFor ?? null).toBeNull()
  await run(p, '2027-11-11T16:00:00.000Z')
  expect(sendRenewalReminderEmail).toHaveBeenCalledTimes(2)
  expect(license41(p).firstReminderSentFor).toBe(UNTIL)
})
it('does not throw when the reminder mark cannot be given back either', async () => {
  sendRenewalReminderEmail.mockRejectedValueOnce(new Error('Resend refused'))
  const p = world()
  const real = p.update.getMockImplementation()
  p.update.mockImplementation(async (arg) => {
    if (arg.data.firstReminderSentFor === null) {
      throw new Error('db down for owner@example.com')
    }
    return real(arg)
  })
  const counts = await run(p, '2027-11-10T16:00:00.000Z')
  expect(counts).toMatchObject({ failed: 1, firstReminders: 0 })
  const logged = JSON.stringify(
    [console.info, console.warn, console.error].flatMap((s) => s.mock.calls)
  )
  expect(logged).not.toMatch(/owner@example\.com|buyer|teammate/i)
})
it('goes on to the next license when one throws, logging only ids', async () => {
  const p = world({
    others: [
      {
        id: 50,
        ownerEmail: 'second@example.com',
        stack: 'next-netsuite',
        tier: 'pro',
        creemEnvironment: 'production',
        seatMembers: [{ githubUsername: 'Other', inviteUrl: INVITE }],
      },
    ],
  })
  p.tables.purchases.push({
    id: 2,
    license: 50,
    status: 'paid',
    grantsTier: 'pro',
    kind: 'sale',
    createdAt: '2026-12-10T15:00:00.000Z',
    githubRepo: REPO,
  })
  const real = p.findByID.getMockImplementation()
  p.findByID.mockImplementation(async (arg) => {
    if (arg.id === 41) throw new Error('boom for owner@example.com Buyer')
    return real(arg)
  })
  const counts = await run(p, '2027-12-11T06:00:00.000Z')
  expect(counts).toMatchObject({ checked: 2, failed: 1, withdrawn: 1 })
  expect(removeFromRepo).toHaveBeenCalledWith({ repo: REPO, username: 'Other' })
  const logged = JSON.stringify(
    [console.info, console.warn, console.error].flatMap((s) => s.mock.calls)
  )
  expect(logged).toContain('41')
  expect(logged).not.toMatch(/example\.com|buyer|teammate|other"/i)
})
it('sends the ended notice with no price when the kit row has none', async () => {
  const p = world({ kitRow: { renewalPrice: null } })
  await run(p, '2027-12-11T06:00:00.000Z')
  expect(sendUpdatesEndedEmail).toHaveBeenCalledWith(
    expect.objectContaining({ price: null })
  )
})
it('still sends the reminder, with no price, when the kit row has none', async () => {
  const p = world({ kitRow: { renewalPrice: null } })
  await run(p, '2027-11-10T16:00:00.000Z')
  expect(sendRenewalReminderEmail).toHaveBeenCalledWith(
    expect.objectContaining({ price: null })
  )
})
it('sends the reminder with no price when the kit row says 0', async () => {
  const p = world({ kitRow: { renewalPrice: 0 } })
  await run(p, '2027-11-10T16:00:00.000Z')
  expect(sendRenewalReminderEmail).toHaveBeenCalledWith(
    expect.objectContaining({ price: null })
  )
})
it('never logs an email address or a username', async () => {
  await run(world(), '2027-12-11T06:00:00.000Z')
  const logged = JSON.stringify(
    [console.info, console.warn, console.error].flatMap((s) => s.mock.calls)
  )
  expect(logged).not.toMatch(/owner@example\.com|buyer|teammate/i)
})

describe('handleRenewalJob', () => {
  const req = (method = 'GET', auth) =>
    new Request('https://example.com/licenses/renewals', {
      method,
      headers: auth ? { authorization: auth } : {},
    })
  it('refuses a caller without the secret, with the wrong one, or when none is set', async () => {
    const getPayload = vi.fn()
    expect(
      (await handleRenewalJob(req('GET', 'Bearer s3cret'), getPayload)).status
    ).toBe(401)
    process.env.CRON_SECRET = 's3cret'
    expect((await handleRenewalJob(req('GET'), getPayload)).status).toBe(401)
    expect(
      (await handleRenewalJob(req('GET', 'Bearer wrong'), getPayload)).status
    ).toBe(401)
    expect(getPayload).not.toHaveBeenCalled()
  })
  it('answers 500 with a fixed body and no details when the licenses cannot be read', async () => {
    process.env.CRON_SECRET = 's3cret'
    const getPayload = async () => ({
      find: async () => {
        throw new Error('connection to db.internal:6543 refused')
      },
    })
    const res = await handleRenewalJob(req('GET', 'Bearer s3cret'), getPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ status: 'error' })
  })
  it('answers 405 to anything but GET', async () => {
    process.env.CRON_SECRET = 's3cret'
    expect(
      (await handleRenewalJob(req('POST', 'Bearer s3cret'), vi.fn())).status
    ).toBe(405)
  })
  it('runs and answers the counts for the right secret', async () => {
    process.env.CRON_SECRET = 's3cret'
    const res = await handleRenewalJob(
      req('GET', 'Bearer s3cret'),
      async () => world(),
      { now: new Date('2027-01-01T00:00:00.000Z') }
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ live: true, checked: 1 })
  })
})

describe('a dry run and a failed restore', () => {
  it('writes nothing and sends nothing in a dry run, for every kind of due action', async () => {
    const withdrawn = world({
      license: {
        updatesComputedUntil: UNTIL,
        seatMembers: [
          { githubUsername: 'Buyer', inviteUrl: INVITE },
          { githubUsername: 'typed-in' },
        ],
      },
    })
    const reminding = world({ license: { updatesComputedUntil: UNTIL } })
    const restoring = world({
      license: {
        updatesComputedUntil: UNTIL,
        accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
        accessWithdrawnFor: UNTIL,
        updatesUntilOverride: '2028-06-01T00:00:00.000Z',
      },
    })
    expect(
      await run(withdrawn, '2027-12-11T06:00:00.000Z', false)
    ).toMatchObject({ withdrawn: 1, wouldRemove: 1 })
    expect(
      await run(reminding, '2027-12-04T06:00:00.000Z', false)
    ).toMatchObject({ lastReminders: 1 })
    expect(
      await run(restoring, '2027-12-20T00:00:00.000Z', false)
    ).toMatchObject({ restored: 1 })
    for (const p of [withdrawn, reminding, restoring]) {
      expect(p.update).not.toHaveBeenCalled()
    }
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(sendRenewalReminderEmail).not.toHaveBeenCalled()
    expect(sendUpdatesEndedEmail).not.toHaveBeenCalled()
  })
  const withdrawnLicense = (over = {}) => ({
    accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
    accessWithdrawnFor: UNTIL,
    updatesUntilOverride: '2028-06-01T00:00:00.000Z',
    ...over,
  })
  const flagWrites = (p) =>
    p.update.mock.calls.filter(([arg]) => 'needsReview' in arg.data)
  it('flags a license whose access cannot be given back, once', async () => {
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
    const p = world({ license: withdrawnLicense() })
    expect(await run(p, '2027-12-20T00:00:00.000Z')).toMatchObject({
      restored: 0,
      failed: 1,
    })
    expect(license41(p)).toMatchObject({ needsReview: true })
    expect(license41(p).accessWithdrawnAt).toBe('2027-12-11T06:00:00.000Z')
    expect(flagWrites(p)).toHaveLength(1)
    await run(p, '2027-12-21T00:00:00.000Z')
    expect(flagWrites(p)).toHaveLength(1)
  })
  it('does not rewrite needsReview when it is already set', async () => {
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
    const p = world({ license: withdrawnLicense({ needsReview: true }) })
    await run(p, '2027-12-20T00:00:00.000Z')
    expect(flagWrites(p)).toHaveLength(0)
  })
})

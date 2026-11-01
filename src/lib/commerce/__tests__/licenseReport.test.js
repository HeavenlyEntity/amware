import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../creem', () => ({ activateLicense: vi.fn() }))
vi.mock('../fulfillment', () => ({ sendOverLimitEmail: vi.fn() }))

import { activateLicense } from '../creem'
import { sendOverLimitEmail } from '../fulfillment'
import {
  MAX_BODY_BYTES,
  methodNotAllowed,
  parseLicenseRequest,
  licenseStatus,
  reportAccount,
} from '../licenseReport'

/* An in-memory Payload: purchases, one license, and the kit row that sets its
   limits. `update` writes through, so a second report sees the first one's
   rows, and `find` understands the two queries the module makes. */
function world({
  license = {},
  purchases,
  product = { seats: 1, netsuiteAccounts: 1 },
} = {}) {
  const state = {
    license: {
      id: 5,
      ownerEmail: 'owner@example.com',
      stack: 'next-netsuite',
      tier: 'pro',
      seatMembers: [{ githubUsername: 'a' }],
      accounts: [],
      ...license,
    },
    purchases: purchases ?? [
      {
        id: 11,
        license: 5,
        licenseKey: 'KEY-A',
        status: 'paid',
        creemEnvironment: 'production',
        createdAt: '2026-10-01T00:00:00.000Z',
        item: { relationTo: 'products', value: 3 },
        email: 'buyer@example.com',
      },
    ],
  }
  const payload = {
    state,
    find: vi.fn(async ({ collection, where }) => {
      if (collection === 'products') return { docs: product ? [product] : [] }
      const byKey = where?.licenseKey?.equals
      if (byKey !== undefined) {
        return { docs: state.purchases.filter((p) => p.licenseKey === byKey) }
      }
      return {
        docs: state.purchases.filter(
          (p) => p.status === 'paid' && p.licenseKey
        ),
      }
    }),
    findByID: vi.fn(async ({ collection, id }) => {
      const doc =
        collection === 'licenses'
          ? state.license
          : state.purchases.find((p) => p.id === id)
      if (!doc || doc.id !== id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return structuredClone(doc)
    }),
    update: vi.fn(async ({ collection, data }) => {
      if (collection === 'licenses') Object.assign(state.license, data)
      return state.license
    }),
  }
  return payload
}

const row = (accountId, extra = {}) => ({
  accountId,
  status: 'active',
  creemInstanceId: `inst_${accountId}`,
  firstSeenAt: '2026-10-01T00:00:00.000Z',
  lastSeenAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

const report = (payload, accountId, extra = {}) =>
  reportAccount(payload, {
    key: 'KEY-A',
    accountId,
    kit: 'next-netsuite',
    ...extra,
  })

const rowOf = (payload, accountId) =>
  payload.state.license.accounts.find((r) => r.accountId === accountId)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  process.env.ACCESS_LINK_SECRET = 'test-secret'
  activateLicense.mockResolvedValue({ instanceId: 'inst_new' })
  sendOverLimitEmail.mockResolvedValue(undefined)
})

describe('which key answers', () => {
  it('returns invalid for an unknown key', async () => {
    const payload = world()
    const out = await report(payload, '7654321', { key: 'NOPE' })
    expect(out).toEqual({ status: 'invalid' })
    expect(payload.update).not.toHaveBeenCalled()
    expect(activateLicense).not.toHaveBeenCalled()
  })

  it('returns invalid for a refunded license', async () => {
    const payload = world({ license: { tier: null } })
    expect(await report(payload, '7654321')).toEqual({ status: 'invalid' })
    expect(payload.update).not.toHaveBeenCalled()
    expect(activateLicense).not.toHaveBeenCalled()
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
  })

  it('returns invalid for a key from another kit', async () => {
    const payload = world()
    const out = await report(payload, '7654321', { kit: 'react-netsuite' })
    expect(out).toEqual({ status: 'invalid' })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('returns invalid for a sandbox key in production, and the reverse', async () => {
    const sandbox = world({
      purchases: [
        {
          id: 11,
          license: 5,
          licenseKey: 'KEY-A',
          status: 'paid',
          creemEnvironment: 'sandbox',
        },
      ],
    })
    expect(await report(sandbox, '7654321')).toEqual({ status: 'invalid' })

    process.env.CREEM_ENV = 'sandbox'
    expect(await report(sandbox, '7654321')).toMatchObject({ status: 'ok' })

    const live = world()
    expect(await report(live, '7654321')).toEqual({ status: 'invalid' })
  })

  it('treats a purchase with no recorded environment as production', async () => {
    const payload = world({
      purchases: [{ id: 11, license: 5, licenseKey: 'KEY-A', status: 'paid' }],
    })
    expect(await report(payload, '7654321')).toMatchObject({ status: 'ok' })
  })

  it('gives the same answer whatever the cause', async () => {
    const answers = [
      await report(world(), '1', { key: 'NOPE' }),
      await report(world({ license: { tier: null } }), '1'),
      await report(world(), '1', { kit: 'react-netsuite' }),
      await report(world({ license: { tier: null } }), '1', {
        kit: 'react-netsuite',
      }),
    ]
    for (const answer of answers) expect(answer).toEqual({ status: 'invalid' })
  })

  it('returns invalid when the purchase has no license', async () => {
    const payload = world({
      purchases: [
        { id: 11, license: null, licenseKey: 'KEY-A', status: 'paid' },
      ],
    })
    expect(await report(payload, '7654321')).toEqual({ status: 'invalid' })
  })

  it('does not hide a database failure as an invalid key', async () => {
    const payload = world()
    payload.find.mockRejectedValueOnce(new Error('connection lost'))
    await expect(report(payload, '7654321')).rejects.toThrow('connection lost')
  })

  it('returns invalid for an account ID that is not an account number', async () => {
    const payload = world()
    for (const bad of ['', '   ', 'a'.repeat(65), '12\nvisit evil.test', 42]) {
      expect(await report(payload, bad)).toEqual({ status: 'invalid' })
    }
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('an account already listed', () => {
  it('updates lastSeenAt for a listed account without calling Creem', async () => {
    const payload = world({ license: { accounts: [row('7654321')] } })
    const out = await report(payload, '7654321')

    expect(out).toEqual({ status: 'ok', tier: 'pro', used: 1, limit: 1 })
    expect(activateLicense).not.toHaveBeenCalled()
    expect(payload.state.license.accounts).toHaveLength(1)
    expect(rowOf(payload, '7654321').lastSeenAt).not.toBe(
      '2026-10-01T00:00:00.000Z'
    )
    expect(rowOf(payload, '7654321').firstSeenAt).toBe(
      '2026-10-01T00:00:00.000Z'
    )
    expect(rowOf(payload, '7654321').creemInstanceId).toBe('inst_7654321')
  })

  it('matches however the account was typed', async () => {
    const payload = world({ license: { accounts: [row('TSTDRV99')] } })
    await report(payload, ' tstdrv99 ')
    expect(payload.state.license.accounts).toHaveLength(1)
    expect(activateLicense).not.toHaveBeenCalled()
  })

  it('treats a sandbox as its production account', async () => {
    const payload = world({ license: { accounts: [row('1234567')] } })

    const out = await report(payload, '1234567_SB1')

    expect(out).toMatchObject({ status: 'ok', used: 1, limit: 1 })
    expect(payload.state.license.accounts).toHaveLength(1)
    expect(activateLicense).not.toHaveBeenCalled()
  })

  it('retries Creem for a listed account that never got an instance', async () => {
    const payload = world({
      license: { accounts: [row('7654321', { creemInstanceId: undefined })] },
    })

    const out = await report(payload, '7654321')

    expect(out.status).toBe('ok')
    expect(activateLicense).toHaveBeenCalledTimes(1)
    expect(rowOf(payload, '7654321').creemInstanceId).toBe('inst_new')
  })
})

describe('a new account', () => {
  const teamPurchases = [
    {
      id: 11,
      license: 5,
      licenseKey: 'KEY-A',
      status: 'paid',
      creemEnvironment: 'production',
      createdAt: '2026-10-01T00:00:00.000Z',
      item: { relationTo: 'products', value: 3 },
    },
    {
      id: 12,
      license: 5,
      licenseKey: 'KEY-B',
      status: 'paid',
      creemEnvironment: 'production',
      createdAt: '2026-10-20T00:00:00.000Z',
      item: { relationTo: 'products', value: 3 },
    },
  ]
  const team = { seats: 5, netsuiteAccounts: 3 }

  it('activates a new account when there is room', async () => {
    const payload = world({
      license: { tier: 'team' },
      purchases: teamPurchases,
      product: team,
    })

    const out = await report(payload, '7654321_sb2')

    expect(out).toEqual({ status: 'ok', tier: 'team', used: 1, limit: 3 })
    const added = rowOf(payload, '7654321')
    expect(added).toMatchObject({
      accountId: '7654321',
      status: 'active',
      creemInstanceId: 'inst_new',
    })
    expect(Date.parse(added.firstSeenAt)).not.toBeNaN()
    expect(Date.parse(added.lastSeenAt)).not.toBeNaN()
  })

  it("activates with the license's newest key, not the reported one", async () => {
    const payload = world({
      license: { tier: 'team' },
      purchases: teamPurchases,
      product: team,
    })
    await report(payload, '7654321', { key: 'KEY-A' })

    expect(activateLicense).toHaveBeenCalledTimes(1)
    expect(activateLicense).toHaveBeenCalledWith({
      key: 'KEY-B',
      instanceName: '7654321',
      timeoutMs: 2000,
    })
  })

  it('writes the account row before it calls Creem, then stores the instance', async () => {
    const payload = world()
    let seenBeforeCreem = null
    activateLicense.mockImplementationOnce(async () => {
      seenBeforeCreem = structuredClone(payload.state.license.accounts)
      return { instanceId: 'inst_new' }
    })

    await report(payload, '7654321')

    expect(seenBeforeCreem).toHaveLength(1)
    expect(seenBeforeCreem[0]).toMatchObject({
      accountId: '7654321',
      status: 'active',
    })
    expect(seenBeforeCreem[0].creemInstanceId).toBeUndefined()
    expect(rowOf(payload, '7654321').creemInstanceId).toBe('inst_new')
  })

  it('records the account when Creem fails, and retries next report', async () => {
    const payload = world()
    activateLicense.mockRejectedValueOnce(
      Object.assign(new Error('down'), { status: 0 })
    )

    const first = await report(payload, '7654321')

    expect(first).toMatchObject({ status: 'ok', used: 1, limit: 1 })
    expect(rowOf(payload, '7654321')).toMatchObject({
      accountId: '7654321',
      status: 'active',
    })
    expect(rowOf(payload, '7654321').creemInstanceId).toBeUndefined()

    const second = await report(payload, '7654321')

    expect(second.status).toBe('ok')
    expect(activateLicense).toHaveBeenCalledTimes(2)
    expect(payload.state.license.accounts).toHaveLength(1)
    expect(rowOf(payload, '7654321').creemInstanceId).toBe('inst_new')
  })

  it('records the account when there is no key to activate with', async () => {
    const payload = world({
      purchases: [
        {
          id: 11,
          license: 5,
          licenseKey: 'KEY-A',
          status: 'refunded',
          creemEnvironment: 'production',
        },
      ],
    })
    const out = await report(payload, '7654321')
    expect(out.status).toBe('ok')
    expect(activateLicense).not.toHaveBeenCalled()
    expect(rowOf(payload, '7654321')).toBeTruthy()
  })

  it('counts only active rows against the limit', async () => {
    const payload = world({
      license: {
        tier: 'team',
        accounts: [
          row('1'),
          row('2'),
          ...['3', '4', '5', '6', '7'].map((id) =>
            row(id, { status: 'over_limit', creemInstanceId: undefined })
          ),
        ],
      },
      purchases: teamPurchases,
      product: team,
    })

    const out = await report(payload, '8')

    expect(out).toEqual({ status: 'ok', tier: 'team', used: 3, limit: 3 })
    expect(rowOf(payload, '8').status).toBe('active')
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
  })

  it('takes the limit from the override on Enterprise, which has no kit row', async () => {
    const payload = world({
      license: { tier: 'enterprise', accountOverride: 10 },
      product: null,
    })
    const out = await report(payload, '8')
    expect(out).toEqual({
      status: 'ok',
      tier: 'enterprise',
      used: 1,
      limit: 10,
    })
  })

  it('answers ok and writes nothing for a tier that does not track accounts', async () => {
    const payload = world({ license: { tier: 'lite' } })
    const out = await report(payload, '8')
    expect(out).toEqual({ status: 'ok', tier: 'lite' })
    expect(payload.update).not.toHaveBeenCalled()
    expect(activateLicense).not.toHaveBeenCalled()
  })
})

describe('going over the limit', () => {
  const full = () => world({ license: { accounts: [row('1111111')] } })

  it('records over_limit and emails the owner once', async () => {
    const payload = full()

    const out = await report(payload, '7654321')

    expect(out).toEqual({
      status: 'over_limit',
      tier: 'pro',
      used: 1,
      limit: 1,
    })
    expect(rowOf(payload, '7654321')).toMatchObject({
      accountId: '7654321',
      status: 'over_limit',
    })
    expect(rowOf(payload, '7654321').creemInstanceId).toBeUndefined()
    expect(activateLicense).not.toHaveBeenCalled()

    expect(sendOverLimitEmail).toHaveBeenCalledTimes(1)
    const mail = sendOverLimitEmail.mock.calls[0][0]
    expect(mail).toMatchObject({
      to: 'owner@example.com',
      accountId: '7654321',
      used: 1,
      limit: 1,
    })
    expect(mail.url).toMatch(/^https:\/\/example\.com\/access\/seats\/.+/)
    expect(Date.parse(rowOf(payload, '7654321').notifiedAt)).not.toBeNaN()
  })

  it('signs the link with the license id', async () => {
    const payload = full()
    await report(payload, '7654321')
    const token = sendOverLimitEmail.mock.calls[0][0].url.split('/').pop()
    const claims = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString()
    )
    expect(claims.licenseId).toBe(5)
  })

  it('mails the owner, never the buyer on the purchase', async () => {
    const payload = full()
    await report(payload, '7654321')
    expect(sendOverLimitEmail.mock.calls[0][0].to).toBe('owner@example.com')
  })

  it('does not email again for the same account', async () => {
    const payload = full()
    await report(payload, '7654321')
    const again = await report(payload, '7654321')

    expect(again.status).toBe('over_limit')
    expect(sendOverLimitEmail).toHaveBeenCalledTimes(1)
    expect(payload.state.license.accounts).toHaveLength(2)
  })

  it('emails once for each different account', async () => {
    const payload = full()
    await report(payload, '7654321')
    await report(payload, '7654322')
    expect(sendOverLimitEmail).toHaveBeenCalledTimes(2)
  })

  it('still answers over_limit when the mail fails, and tries again next time', async () => {
    const payload = full()
    sendOverLimitEmail.mockRejectedValueOnce(new Error('Resend refused'))

    const first = await report(payload, '7654321')

    expect(first.status).toBe('over_limit')
    expect(rowOf(payload, '7654321').notifiedAt).toBeUndefined()

    const second = await report(payload, '7654321')

    expect(second.status).toBe('over_limit')
    expect(sendOverLimitEmail).toHaveBeenCalledTimes(2)
    expect(Date.parse(rowOf(payload, '7654321').notifiedAt)).not.toBeNaN()
  })

  it('sends no mail when the link cannot be signed, and leaves it unmarked', async () => {
    delete process.env.ACCESS_LINK_SECRET
    delete process.env.ACCESS_TOKEN_SECRET
    const payload = full()

    const out = await report(payload, '7654321')

    expect(out.status).toBe('over_limit')
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
    expect(rowOf(payload, '7654321').notifiedAt).toBeUndefined()
  })

  it('updates lastSeenAt for a listed over_limit account with no room', async () => {
    const payload = world({
      license: {
        accounts: [
          row('1111111'),
          row('7654321', {
            status: 'over_limit',
            creemInstanceId: undefined,
            notifiedAt: '2026-10-02T00:00:00.000Z',
          }),
        ],
      },
    })

    const out = await report(payload, '7654321')

    expect(out).toEqual({
      status: 'over_limit',
      tier: 'pro',
      used: 1,
      limit: 1,
    })
    expect(rowOf(payload, '7654321').lastSeenAt).not.toBe(
      '2026-10-01T00:00:00.000Z'
    )
    expect(rowOf(payload, '7654321').status).toBe('over_limit')
    expect(activateLicense).not.toHaveBeenCalled()
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
  })

  it('promotes a listed over_limit account to active once there is room', async () => {
    const payload = world({
      license: {
        tier: 'team',
        accounts: [
          row('1111111'),
          row('7654321', {
            status: 'over_limit',
            creemInstanceId: undefined,
            notifiedAt: '2026-10-02T00:00:00.000Z',
          }),
        ],
      },
      product: { seats: 5, netsuiteAccounts: 3 },
    })

    const out = await report(payload, '7654321')

    expect(out).toEqual({ status: 'ok', tier: 'team', used: 2, limit: 3 })
    expect(rowOf(payload, '7654321')).toMatchObject({
      status: 'active',
      creemInstanceId: 'inst_new',
    })
    expect(activateLicense).toHaveBeenCalledTimes(1)
    expect(activateLicense.mock.calls[0][0].instanceName).toBe('7654321')
    expect(payload.state.license.accounts).toHaveLength(2)
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
  })

  it('stops storing accounts at the limit plus 25, with no write and no mail', async () => {
    const stored = [
      row('1111111'),
      ...Array.from({ length: 25 }, (_, i) =>
        row(`9${i}`, { status: 'over_limit', notifiedAt: '2026-10-02' })
      ),
    ]
    const payload = world({ license: { accounts: stored } })

    const out = await report(payload, '7654321')

    expect(out).toEqual({
      status: 'over_limit',
      tier: 'pro',
      used: 1,
      limit: 1,
    })
    expect(payload.update).not.toHaveBeenCalled()
    expect(sendOverLimitEmail).not.toHaveBeenCalled()
    expect(payload.state.license.accounts).toHaveLength(26)
  })

  it('still stores the 26th extra account just under the cap', async () => {
    const stored = [
      row('1111111'),
      ...Array.from({ length: 24 }, (_, i) =>
        row(`9${i}`, { status: 'over_limit', notifiedAt: '2026-10-02' })
      ),
    ]
    const payload = world({ license: { accounts: stored } })
    await report(payload, '7654321')
    expect(payload.state.license.accounts).toHaveLength(26)
    expect(sendOverLimitEmail).toHaveBeenCalledTimes(1)
  })

  it('still touches a listed account at the cap', async () => {
    const stored = [
      row('1111111'),
      ...Array.from({ length: 25 }, (_, i) =>
        row(`9${i}`, { status: 'over_limit', notifiedAt: '2026-10-02' })
      ),
    ]
    const payload = world({ license: { accounts: stored } })
    const out = await report(payload, '90')
    expect(out.status).toBe('over_limit')
    expect(payload.update).toHaveBeenCalledTimes(1)
  })
})

describe('what an answer may contain', () => {
  it('never carries the key, the owner, or a Creem instance id', async () => {
    const answers = [
      await report(world({ license: { accounts: [row('1')] } }), '1'),
      await report(world(), '2'),
      await report(world({ license: { accounts: [row('1')] } }), '3'),
      await report(world(), '2', { key: 'NOPE' }),
      await licenseStatus(world({ license: { accounts: [row('1')] } }), {
        key: 'KEY-A',
        kit: 'next-netsuite',
      }),
    ]
    for (const answer of answers) {
      const text = JSON.stringify(answer)
      expect(text).not.toContain('KEY-A')
      expect(text).not.toContain('owner@example.com')
      expect(text).not.toContain('inst_')
    }
  })
})

describe('licenseStatus', () => {
  const ask = (payload, extra = {}) =>
    licenseStatus(payload, { key: 'KEY-A', kit: 'next-netsuite', ...extra })

  it('reports the tier and both counts', async () => {
    const payload = world({
      license: {
        tier: 'team',
        seatMembers: [{ githubUsername: 'a' }, { githubUsername: 'b' }],
        accounts: [
          row('1'),
          row('2', { status: 'over_limit' }),
          row('3', { status: 'over_limit' }),
        ],
      },
      product: { seats: 5, netsuiteAccounts: 3 },
    })

    expect(await ask(payload)).toEqual({
      status: 'ok',
      tier: 'team',
      developers: { used: 2, limit: 5 },
      accounts: { used: 1, limit: 3 },
    })
  })

  it('writes nothing and never calls Creem', async () => {
    const payload = world()
    await ask(payload)
    expect(payload.update).not.toHaveBeenCalled()
    expect(activateLicense).not.toHaveBeenCalled()
  })

  it('returns invalid for an unknown key, a refund, another kit and a sandbox key', async () => {
    expect(await ask(world(), { key: 'NOPE' })).toEqual({ status: 'invalid' })
    expect(await ask(world({ license: { tier: null } }))).toEqual({
      status: 'invalid',
    })
    expect(await ask(world(), { kit: 'react-netsuite' })).toEqual({
      status: 'invalid',
    })
    process.env.CREEM_ENV = 'sandbox'
    expect(await ask(world())).toEqual({ status: 'invalid' })
  })

  it('leaves accounts out for a tier that does not track them', async () => {
    const out = await ask(world({ license: { tier: 'lite' } }))
    expect(out).toEqual({
      status: 'ok',
      tier: 'lite',
      developers: { used: 1, limit: 1 },
    })
  })
})

const post = (body, init = {}) =>
  new Request('https://example.com/licenses/report', {
    method: 'POST',
    body,
    ...init,
  })

describe('parseLicenseRequest', () => {
  const good = {
    key: 'KEY-A',
    accountId: '7654321',
    kit: 'next-netsuite',
  }

  it('reads a good body', async () => {
    const out = await parseLicenseRequest(post(JSON.stringify(good)), {
      account: true,
    })
    expect(out).toEqual({ ok: true, value: good })
  })

  it('does not ask for an account when the route has none', async () => {
    const out = await parseLicenseRequest(
      post(JSON.stringify({ key: 'KEY-A', kit: 'next-netsuite' })),
      { account: false }
    )
    expect(out).toEqual({
      ok: true,
      value: { key: 'KEY-A', kit: 'next-netsuite' },
    })
  })

  it('rejects an empty body with 400', async () => {
    for (const body of [undefined, '', '   ']) {
      const out = await parseLicenseRequest(post(body), { account: true })
      expect(out).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('rejects text that is not JSON, and JSON that is not an object, with 400', async () => {
    for (const body of ['key=1&kit=2', '{', 'null', '[]', '"text"', '12']) {
      const out = await parseLicenseRequest(post(body), { account: true })
      expect(out).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('rejects wrongly typed or missing fields with 400', async () => {
    const bad = [
      { ...good, key: 12 },
      { ...good, key: '' },
      { ...good, kit: ['next-netsuite'] },
      { ...good, kit: '' },
      { ...good, accountId: 7654321 },
      { ...good, accountId: null },
      { key: 'KEY-A', kit: 'next-netsuite' },
      { ...good, key: 'k'.repeat(300) },
    ]
    for (const body of bad) {
      const out = await parseLicenseRequest(post(JSON.stringify(body)), {
        account: true,
      })
      expect(out).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('rejects an account ID that cannot be an account number with 400', async () => {
    for (const accountId of ['', '   ', 'x'.repeat(65), 'a b', '12\n34']) {
      const out = await parseLicenseRequest(
        post(JSON.stringify({ ...good, accountId })),
        { account: true }
      )
      expect(out).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('answers 413 above 2 KB when there is no Content-Length', async () => {
    const big = JSON.stringify({ ...good, pad: 'x'.repeat(MAX_BODY_BYTES) })
    const request = post(big)
    expect(request.headers.get('content-length')).toBeNull()
    const out = await parseLicenseRequest(request, { account: true })
    expect(out).toMatchObject({ ok: false, status: 413 })
  })

  it('answers 413 when Content-Length understates the body', async () => {
    const big = JSON.stringify({ ...good, pad: 'x'.repeat(MAX_BODY_BYTES) })
    const out = await parseLicenseRequest(
      post(big, { headers: { 'content-length': '40' } }),
      { account: true }
    )
    expect(out).toMatchObject({ ok: false, status: 413 })
  })

  it('answers 413 for a stream that never stops', async () => {
    let pulled = 0
    const stream = new ReadableStream({
      pull(controller) {
        pulled += 1
        controller.enqueue(new TextEncoder().encode('x'.repeat(512)))
        if (pulled > 1000) controller.close()
      },
    })
    const out = await parseLicenseRequest(post(stream, { duplex: 'half' }), {
      account: true,
    })
    expect(out).toMatchObject({ ok: false, status: 413 })
    expect(pulled).toBeLessThan(20)
  })

  it('counts bytes, not characters', async () => {
    const body = JSON.stringify({ ...good, pad: 'é'.repeat(1100) })
    expect(body.length).toBeLessThan(MAX_BODY_BYTES)
    const out = await parseLicenseRequest(post(body), { account: true })
    expect(out).toMatchObject({ ok: false, status: 413 })
  })

  it('answers 413 early for a Content-Length that is already too big', async () => {
    const out = await parseLicenseRequest(
      post(JSON.stringify(good), {
        headers: { 'content-length': String(MAX_BODY_BYTES + 1) },
      }),
      { account: true }
    )
    expect(out).toMatchObject({ ok: false, status: 413 })
  })

  it('accepts a body of exactly 2 KB', async () => {
    const pad = 'x'.repeat(
      MAX_BODY_BYTES - Buffer.byteLength(JSON.stringify({ ...good, pad: '' }))
    )
    const body = JSON.stringify({ ...good, pad })
    expect(Buffer.byteLength(body)).toBe(MAX_BODY_BYTES)
    const out = await parseLicenseRequest(post(body), { account: true })
    expect(out.ok).toBe(true)
  })
})

describe('methodNotAllowed', () => {
  it('is a JSON 405 that names POST', async () => {
    const res = methodNotAllowed()
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
    expect(res.headers.get('content-type')).toMatch(/json/)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(await res.json()).toMatchObject({ error: 'method_not_allowed' })
  })
})

import { describe, expect, it, vi } from 'vitest'

import {
  lockLicenseBeforeUpdate,
  lockLicenseRow,
  withLicenseLock,
} from '../licenseLock'
import { reserveSeat, setSeatInvite } from '../licenseSeats'
import { reportAccount } from '../licenseReport'

/*
 * A stand-in for the Postgres adapter with real lock behaviour: a
 * transaction that asks for a license's row lock waits until whichever
 * transaction holds it commits or rolls back, as `SELECT ... FOR UPDATE`
 * does. Each transaction has its own session, and `req.transactionID` names
 * it, as in @payloadcms/drizzle. That is enough to show the read, the check
 * and the write cannot interleave; it is not a test of Postgres itself.
 */
function lockingAdapter() {
  const locks = new Map() // license id -> { holder, released }
  const releases = new Map() // transaction id -> release()
  const sessions = {}
  const events = []
  let n = 0

  const sessionDb = (tx) => ({
    execute: async (statement) => statement,
    select: () => ({
      from: () => ({
        where: (condition) => ({
          for: async (mode) => {
            // Not FOR UPDATE: that would queue behind a purchase's
            // foreign-key lock on the license.
            expect(mode).toBe('no key update')
            const id = condition.licenseId
            for (;;) {
              const held = locks.get(id)
              if (!held || held.holder === tx) break
              await held.released
            }
            if (locks.get(id)?.holder === tx) return []
            let release
            const released = new Promise((resolve) => (release = resolve))
            locks.set(id, { holder: tx, released })
            const previous = releases.get(tx)
            releases.set(tx, () => {
              previous?.()
              locks.delete(id)
              release()
            })
            events.push(`lock ${tx}`)
            return []
          },
        }),
      }),
    }),
  })

  const end = (tx, how) => {
    events.push(`${how} ${tx}`)
    releases.get(tx)?.()
    releases.delete(tx)
    delete sessions[tx]
  }

  return {
    events,
    db: {
      tables: { licenses: { id: 'licenses.id' } },
      sessions,
      beginTransaction: vi.fn(async () => {
        const tx = `tx${++n}`
        sessions[tx] = { db: sessionDb(tx) }
        return tx
      }),
      commitTransaction: vi.fn(async (tx) => end(tx, 'commit')),
      rollbackTransaction: vi.fn(async (tx) => end(tx, 'rollback')),
    },
  }
}

/* `eq` from drizzle is replaced so the fake can read which license a lock is
   for without parsing SQL. */
vi.mock('@payloadcms/db-postgres/drizzle', () => ({
  eq: (_column, licenseId) => ({ licenseId }),
  sql: { raw: (text) => ({ text }) },
}))

/* A Payload with one license, whose reads and writes yield between steps the
   way a database round trip does. A call that names a transaction must name
   a live one, and every call records which it ran in, so a test can tell a
   query that left the locked connection. */
function payloadWith(license, adapter = lockingAdapter()) {
  const store = { license: structuredClone(license) }
  const ranIn = []
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
  const session = async (req) => {
    const tx = (await req?.transactionID) ?? null
    if (req && !adapter.db.sessions[tx]) {
      throw new Error(`query in an ended transaction ${tx}`)
    }
    return tx
  }
  const payload = {
    db: adapter.db,
    findByID: vi.fn(async ({ id, req }) => {
      ranIn.push(await session(req))
      await tick()
      if (id !== store.license.id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return structuredClone(store.license)
    }),
    find: vi.fn(async () => ({ docs: [] })),
    update: vi.fn(async ({ data, req }) => {
      ranIn.push(await session(req))
      await tick()
      Object.assign(store.license, structuredClone(data))
      return structuredClone(store.license)
    }),
  }
  return { payload, store, adapter, ranIn }
}

describe('withLicenseLock', () => {
  it('locks the row, runs the work in that transaction, and commits', async () => {
    const { payload, adapter } = payloadWith({ id: 5 })
    const seen = []
    const result = await withLicenseLock(payload, 5, async (tx) => {
      seen.push(tx.req.transactionID)
      return 'done'
    })
    expect(result).toBe('done')
    expect(seen).toEqual(['tx1'])
    expect(adapter.events).toEqual(['lock tx1', 'commit tx1'])
  })

  it('sets a lock timeout for the transaction before it asks for the lock', async () => {
    const { payload, adapter } = payloadWith({ id: 5 })
    const order = []
    const db = adapter.db
    const begin = db.beginTransaction
    db.beginTransaction = vi.fn(async () => {
      const tx = await begin()
      const inner = db.sessions[tx].db
      db.sessions[tx].db = {
        ...inner,
        execute: async (statement) => {
          order.push('timeout')
          return inner.execute(statement)
        },
        select: (...args) => {
          order.push('lock')
          return inner.select(...args)
        },
      }
      return tx
    })
    await withLicenseLock(payload, 5, async () => {})
    expect(order).toEqual(['timeout', 'lock'])
  })

  it('rolls back and rethrows when the work fails', async () => {
    const { payload, adapter } = payloadWith({ id: 5 })
    await expect(
      withLicenseLock(payload, 5, async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    expect(adapter.events).toEqual(['lock tx1', 'rollback tx1'])
    expect(adapter.db.commitTransaction).not.toHaveBeenCalled()
  })

  it('does not report a write Payload already rolled back as done', async () => {
    const { payload } = payloadWith({ id: 5 })
    await expect(
      withLicenseLock(payload, 5, async (tx) => {
        // What Payload does to `req` when a query in it fails.
        delete tx.req.transactionID
      })
    ).rejects.toThrow(/rolled back/)
  })

  it('makes the second writer wait for the first to commit', async () => {
    const { payload, adapter } = payloadWith({ id: 5 })
    let releaseFirst
    const first = withLicenseLock(payload, 5, async () => {
      await new Promise((resolve) => (releaseFirst = resolve))
    })
    await vi.waitFor(() => expect(releaseFirst).toBeTypeOf('function'))
    const second = withLicenseLock(payload, 5, async () => {})
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(adapter.events).toEqual(['lock tx1'])

    releaseFirst()
    await Promise.all([first, second])
    expect(adapter.events).toEqual([
      'lock tx1',
      'commit tx1',
      'lock tx2',
      'commit tx2',
    ])
  })

  it('refuses to run unlocked inside a transaction it could not lock', async () => {
    const { payload } = payloadWith({ id: 5 })
    delete payload.db.tables.licenses
    const work = vi.fn()
    await expect(withLicenseLock(payload, 5, work)).rejects.toThrow(
      /lock was not taken/
    )
    expect(work).not.toHaveBeenCalled()
  })

  it('runs unlocked where there is no transaction to lock in', async () => {
    const payload = { findByID: vi.fn(), update: vi.fn() }
    const work = vi.fn(async (tx) => tx)
    expect(await withLicenseLock(payload, 5, work)).toEqual({})
  })
})

describe('lockLicenseBeforeUpdate', () => {
  it('locks the license an update names, in the update’s own transaction', async () => {
    const adapter = lockingAdapter()
    const payload = { db: adapter.db }
    const transactionID = await adapter.db.beginTransaction()
    const req = { payload, transactionID }
    const args = { id: 5, req }
    expect(
      await lockLicenseBeforeUpdate({ args, operation: 'update', req })
    ).toBe(args)
    expect(adapter.events).toEqual(['lock tx1'])
  })

  it('leaves every other operation alone', async () => {
    const adapter = lockingAdapter()
    const payload = { db: adapter.db }
    const transactionID = await adapter.db.beginTransaction()
    const req = { payload, transactionID }
    await lockLicenseBeforeUpdate({ args: { req }, operation: 'create', req })
    await lockLicenseBeforeUpdate({ args: { req }, operation: 'update', req })
    expect(adapter.events).toEqual([])
  })

  it('locks nothing outside a transaction', async () => {
    const adapter = lockingAdapter()
    expect(
      await lockLicenseRow({ db: adapter.db }, { transactionID: null }, 5)
    ).toBe(false)
  })
})

describe('reserveSeat', () => {
  const pro = { id: 6, seats: 1 }

  it('gives only one of two racing developers the last seat', async () => {
    const { payload, store } = payloadWith({
      id: 5,
      tier: 'pro',
      seatMembers: [],
    })
    const results = await Promise.all([
      reserveSeat(payload, { licenseId: 5, username: 'ada', product: pro }),
      reserveSeat(payload, { licenseId: 5, username: 'grace', product: pro }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual(['added', 'full'])
    expect(store.license.seatMembers).toHaveLength(1)
  })

  it('reads and writes only on the locked connection', async () => {
    const { payload, ranIn } = payloadWith({
      id: 5,
      tier: 'pro',
      seatMembers: [],
    })
    await reserveSeat(payload, { licenseId: 5, username: 'ada', product: pro })
    await setSeatInvite(payload, {
      licenseId: 5,
      username: 'ada',
      inviteUrl: 'https://github.com/invite/1',
      needsReview: true,
    })
    expect(ranIn.length).toBeGreaterThan(0)
    expect(ranIn.every(Boolean)).toBe(true)
  })

  it('loses nobody when several seats are taken at once', async () => {
    const { payload, store } = payloadWith({
      id: 5,
      tier: 'team',
      seatMembers: [],
    })
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const results = await Promise.all(
      names.map((username) =>
        reserveSeat(payload, {
          licenseId: 5,
          username,
          product: { seats: 5 },
        })
      )
    )
    expect(results.filter((r) => r.status === 'added')).toHaveLength(5)
    expect(store.license.seatMembers).toHaveLength(5)
  })

  it('does not spend a seat on someone already on the license', async () => {
    const { payload } = payloadWith({
      id: 5,
      tier: 'pro',
      seatMembers: [{ githubUsername: 'Ada' }],
    })
    const result = await reserveSeat(payload, {
      licenseId: 5,
      username: 'ada',
      product: pro,
    })
    expect(result.status).toBe('member')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('records a paid-for seat past the limit when told to', async () => {
    const { payload, store } = payloadWith({
      id: 5,
      tier: 'pro',
      seatMembers: [{ githubUsername: 'ada' }],
    })
    const result = await reserveSeat(payload, {
      licenseId: 5,
      username: 'grace',
      product: pro,
      enforceLimit: false,
      inviteUrl: 'https://github.com/invite/2',
    })
    expect(result.status).toBe('added')
    expect(store.license.seatMembers[1]).toMatchObject({
      githubUsername: 'grace',
      inviteUrl: 'https://github.com/invite/2',
    })
  })
})

describe('setSeatInvite', () => {
  it('puts the link on the seat without dropping one added meanwhile', async () => {
    const { payload, store } = payloadWith({
      id: 5,
      tier: 'team',
      seatMembers: [],
    })
    await reserveSeat(payload, {
      licenseId: 5,
      username: 'ada',
      product: { seats: 5 },
    })
    await Promise.all([
      setSeatInvite(payload, {
        licenseId: 5,
        username: 'ada',
        inviteUrl: 'https://github.com/invite/1',
      }),
      reserveSeat(payload, {
        licenseId: 5,
        username: 'grace',
        product: { seats: 5 },
      }),
    ])
    expect(store.license.seatMembers).toEqual([
      expect.objectContaining({
        githubUsername: 'ada',
        inviteUrl: 'https://github.com/invite/1',
      }),
      expect.objectContaining({ githubUsername: 'grace' }),
    ])
  })

  it('keeps a link a seat already has', async () => {
    const { payload, store } = payloadWith({
      id: 5,
      seatMembers: [{ githubUsername: 'ada', inviteUrl: 'first' }],
    })
    await setSeatInvite(payload, {
      licenseId: 5,
      username: 'ada',
      inviteUrl: 'second',
    })
    expect(store.license.seatMembers[0].inviteUrl).toBe('first')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('does not put back a seat removed in the meantime', async () => {
    const { payload, store } = payloadWith({ id: 5, seatMembers: [] })
    await setSeatInvite(payload, {
      licenseId: 5,
      username: 'ada',
      inviteUrl: 'https://github.com/invite/1',
      needsReview: true,
    })
    expect(store.license.seatMembers).toEqual([])
    expect(store.license.needsReview).toBe(true)
  })
})

describe('reportAccount under the lock', () => {
  it('lets in only one of two accounts racing for the last place', async () => {
    const license = {
      id: 5,
      stack: 'next-netsuite',
      tier: 'pro',
      accounts: [],
      seatMembers: [],
    }
    const { payload, store } = payloadWith(license)
    payload.find = vi.fn(async ({ collection }) => {
      if (collection === 'purchases') {
        return {
          docs: [{ id: 1, licenseKey: 'KEY', license: 5, status: 'paid' }],
        }
      }
      return { docs: [{ id: 6, netsuiteAccounts: 1 }] }
    })
    payload.findByID = vi.fn(async ({ collection, id }) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (collection === 'licenses' && id === 5) {
        return structuredClone(store.license)
      }
      throw Object.assign(new Error('Not Found'), { status: 404 })
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const answers = await Promise.all([
      reportAccount(payload, {
        key: 'KEY',
        accountId: '1111111',
        kit: 'next-netsuite',
      }),
      reportAccount(payload, {
        key: 'KEY',
        accountId: '2222222',
        kit: 'next-netsuite',
      }),
    ])
    error.mockRestore()

    // Every write ran inside a locked transaction.
    for (const [arg] of payload.update.mock.calls) {
      expect(arg.req?.transactionID).toBeTruthy()
    }
    expect(answers.map((a) => a.status).sort()).toEqual(['ok', 'over_limit'])
    // Both are on record: one active, one marked over the limit.
    expect(store.license.accounts.map((a) => a.status).sort()).toEqual([
      'active',
      'over_limit',
    ])
  })
})

/*
 * One writer at a time on a license.
 *
 * A license keeps its seats and its NetSuite accounts as arrays, and Payload
 * saves a license whole: an update that names only `needsReview` still reads
 * the stored document first and writes every array back from that read. Two
 * writers on one license therefore overwrite each other, and a writer that
 * read the seats, decided there was room and then appended to them can be
 * joined by a second one that read the same seats and decided the same. That
 * is how a one-seat license used to end up with two people in the repository
 * and one of them on record.
 *
 * Two pieces stop it, both a Postgres row lock on the license:
 *
 *  - `lockLicenseBeforeUpdate`, the Licenses `beforeOperation` hook. Every
 *    update of a license, from this code or from the admin, takes the lock in
 *    its own transaction before Payload reads the stored document, so the
 *    arrays it writes back are never older than the last committed write.
 *  - `withLicenseLock`, for a read, a decision and a write that must not be
 *    split: adding a seat while there is room, recording an account under
 *    the limit, removing a row from a fresh read. The lock is held from the
 *    read to the commit.
 *
 * The lock lives only as long as a short transaction. Nothing slow happens
 * inside one: GitHub and Creem are called before or after, never while the
 * license is locked. Every query inside `work` must pass the `req` it is
 * given, so it runs on the locked connection; a query without it asks the
 * pool for a second connection while this one is held.
 *
 * Two choices keep the lock from deadlocking anything:
 *
 *  - It is `FOR NO KEY UPDATE`, not `FOR UPDATE`. Saving a purchase that
 *    points at a license takes `FOR KEY SHARE` on the license row (the
 *    foreign key), and `FOR UPDATE` would queue against it: a purchase save
 *    whose hook then updates its license could wait on a lock waiter that
 *    is itself waiting on that save. `NO KEY UPDATE` is the lock an ordinary
 *    UPDATE of a license takes anyway, so writers still go one at a time.
 *  - A waiter gives up after LOCK_TIMEOUT. A request waiting for the lock
 *    holds one of the pool's two usable connections, and an admin save that
 *    holds the lock also reads outside its transaction (its list columns,
 *    its document-lock check), so it can need that same connection. Waiting
 *    forever would freeze both. Giving up fails the waiting request, whose
 *    caller already answers a database failure with "try again", and frees
 *    the connection.
 *
 * Where there is no transaction to take a lock in -- an adapter without
 * transactions, or the unit tests' stand-in for Payload -- the work runs
 * unlocked, exactly as it did before this module existed.
 *
 * A plain module, never a server action: every export of a 'use server' file
 * is a public endpoint. Imports are relative so the engine test project can
 * load it.
 */

import { eq, sql } from '@payloadcms/db-postgres/drizzle'

/** How long a writer waits for another to finish before giving up. Every
    holder is a short transaction, so this is only ever reached when
    something is stuck. */
export const LOCK_TIMEOUT = '3s'

/* The drizzle handle of the transaction `req` belongs to, or null. */
async function transactionDb(payload, req) {
  const id = await req?.transactionID
  if (!id) return null
  return payload?.db?.sessions?.[id]?.db ?? null
}

/**
 * Lock the license's row for the rest of the transaction `req` is in. A
 * second transaction that asks for the same lock waits until this one ends,
 * or for LOCK_TIMEOUT, and then throws. Returns false, having locked
 * nothing, when there is no transaction.
 */
export async function lockLicenseRow(payload, req, licenseId) {
  if (licenseId == null) return false
  const db = await transactionDb(payload, req)
  const table = payload?.db?.tables?.licenses
  if (!db || !table) return false
  // For this transaction only; the pooled connection goes back unchanged.
  await db.execute(sql.raw(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`))
  await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, licenseId))
    .for('no key update')
  return true
}

/**
 * The Licenses `beforeOperation` hook. Payload opens the update's transaction
 * before this runs and reads the stored document after it, so the read waits
 * for any other writer on the same license to commit.
 *
 * Only an update by id is locked. Nothing updates licenses by a `where`;
 * one that did would need the same lock on every row it touches.
 */
export async function lockLicenseBeforeUpdate({ args, operation, req }) {
  if (operation === 'update' && args?.id != null) {
    await lockLicenseRow(
      req?.payload ?? args.req?.payload,
      args.req ?? req,
      args.id
    )
  }
  return args
}

/**
 * Run `work` with the license locked, in one transaction, and commit what it
 * wrote. `work` gets `{ req }` to spread into every Payload call it makes,
 * or `{}` when there is no transaction to lock in.
 *
 * Throws what `work` throws, after rolling back. A query inside `work` that
 * fails can also end the transaction itself (Payload rolls it back and drops
 * `req.transactionID`); that is reported as a failure rather than committed
 * as a success that never happened.
 *
 * @template T
 * @param {any} payload
 * @param {string | number} licenseId
 * @param {(tx: { req?: any }) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withLicenseLock(payload, licenseId, work) {
  const db = payload?.db
  if (typeof db?.beginTransaction !== 'function') return work({})

  const transactionID = await db.beginTransaction()
  if (!transactionID) return work({})

  const req = { transactionID }
  try {
    /* Inside a transaction the lock must be taken. Going on without it would
       look locked and not be. */
    if (!(await lockLicenseRow(payload, req, licenseId))) {
      throw new Error(`License ${licenseId}: the row lock was not taken`)
    }
    const result = await work({ req })
    if (!req.transactionID) {
      throw new Error(`License ${licenseId}: the write was rolled back`)
    }
    await db.commitTransaction(transactionID)
    return result
  } catch (err) {
    try {
      await db.rollbackTransaction(transactionID)
    } catch {
      // Already ended. The original error is the one worth reporting.
    }
    throw err
  }
}

/*
 * One writer at a time per lead email.
 *
 * A lead keeps its calls as an array, and recording an event reads the lead,
 * changes the array in memory and writes it back whole. Two Cal.com events
 * for one person arriving together (a booking and a meeting ending, or both
 * calls booked back to back) would each write back the other's stale array,
 * and two first events for a new email would both try to create the lead.
 *
 * A Postgres advisory lock on the email, held for one short transaction,
 * makes the second writer wait for the first to commit. It needs no row, so
 * it also covers the lead that does not exist yet. Same shape as
 * src/lib/commerce/licenseLock.js: every query inside `work` must pass the
 * `req` it is given, so it runs on the locked connection rather than asking
 * the pool for a second one; a waiter gives up after LOCK_TIMEOUT; and with
 * no transaction support (the unit tests' stand-in for Payload) the work runs
 * unlocked.
 */

import { sql } from '@payloadcms/db-postgres/drizzle'

export const LOCK_TIMEOUT = '3s'

export async function withLeadLock<T>(
  payload: any,
  email: string,
  work: (tx: { req?: any }) => Promise<T>
): Promise<T> {
  const db = payload?.db
  if (typeof db?.beginTransaction !== 'function') return work({})

  const transactionID = await db.beginTransaction()
  if (!transactionID) return work({})

  const req: { transactionID?: any } = { transactionID }
  try {
    const conn = db.sessions?.[await transactionID]?.db
    if (!conn) throw new Error('Lead lock: no transaction connection')
    // For this transaction only; the pooled connection goes back unchanged.
    await conn.execute(sql.raw(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`))
    await conn.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`lead:${email}`}))`
    )
    const result = await work({ req })
    if (!req.transactionID) {
      throw new Error('Lead lock: the write was rolled back')
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

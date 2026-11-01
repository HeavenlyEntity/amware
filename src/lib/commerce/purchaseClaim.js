/*
 * Claiming a purchase's GitHub account, once.
 *
 * A plain module, never a server action: it must not carry 'use server',
 * because every export of such a file becomes a public endpoint. The
 * onboarding action imports it and passes in the Payload client.
 *
 * Payload's own `update({ where })` finds the matching rows and then updates
 * each one by id, so a condition in `where` is checked and then written in
 * two steps, and two requests can both pass the check. This is one SQL
 * statement instead: Postgres decides which request wins, and exactly one of
 * them gets a row back.
 */

import { and, eq, isNull, or } from '@payloadcms/db-postgres/drizzle'

/**
 * Set `githubUsername` on a purchase only while it is still empty.
 *
 * Resolves true for the one caller whose statement changed the row. False
 * means someone else already named an account, and the caller must not send
 * an invitation. It throws when the database cannot be reached or the table
 * is missing, which the caller treats as "not claimed".
 */
export async function claimGithubUsername(payload, purchaseId, username) {
  const { drizzle, tables } = payload.db
  const table = tables?.purchases
  if (!drizzle || !table) throw new Error('purchases table is not available')

  const rows = await drizzle
    .update(table)
    .set({ githubUsername: username, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(table.id, purchaseId),
        or(isNull(table.githubUsername), eq(table.githubUsername, ''))
      )
    )
    .returning({ id: table.id })

  return rows.length === 1
}

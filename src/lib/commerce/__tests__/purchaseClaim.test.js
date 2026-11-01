import { describe, expect, it } from 'vitest'
import { drizzle } from '@payloadcms/db-postgres/drizzle/node-postgres'
import {
  pgTable,
  serial,
  timestamp,
  varchar,
} from '@payloadcms/db-postgres/drizzle/pg-core'
import { claimGithubUsername } from '../purchaseClaim'

/* The real query builder against a fake connection: what is checked is the
   SQL that would run, because the whole point of this module is that the
   "still empty" test and the write are one statement. */
const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  githubUsername: varchar('github_username'),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
})

function payloadReturning(rows) {
  const statements = []
  const client = {
    query: async (config, values) => {
      statements.push({ text: config.text ?? config, values: values ?? [] })
      return { rows, fields: [], rowCount: rows.length }
    },
  }
  return {
    statements,
    payload: { db: { drizzle: drizzle({ client }), tables: { purchases } } },
  }
}

describe('claimGithubUsername', () => {
  it('is one conditional update, not a read followed by a write', async () => {
    const { payload, statements } = payloadReturning([[7]])
    await claimGithubUsername(payload, 7, 'octocat')

    expect(statements).toHaveLength(1)
    const sql = statements[0].text
    expect(sql).toMatch(/^update "purchases" set /i)
    expect(sql).toMatch(/"github_username" is null/i)
    expect(sql).toMatch(/"github_username" = \$\d+/i)
    expect(sql).toMatch(/"id" = \$\d+/i)
    expect(sql).toMatch(/returning "id"/i)
    expect(statements[0].values).toContain('octocat')
    expect(statements[0].values).toContain(7)
  })

  it('is true for the statement that changed the row', async () => {
    const { payload } = payloadReturning([[7]])
    expect(await claimGithubUsername(payload, 7, 'octocat')).toBe(true)
  })

  it('is false when the row was no longer empty, so nothing came back', async () => {
    const { payload } = payloadReturning([])
    expect(await claimGithubUsername(payload, 7, 'octocat')).toBe(false)
  })

  it('throws, rather than claiming, when there is no database handle', async () => {
    await expect(
      claimGithubUsername({ db: { tables: {} } }, 7, 'octocat')
    ).rejects.toThrow(/not available/)
  })
})

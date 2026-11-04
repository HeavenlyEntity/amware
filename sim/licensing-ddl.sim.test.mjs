import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'

/*
 * A dry run of the schema push for the license record: the `licenses`
 * collection, and the license, tier, environment and account fields on
 * `purchases` and `products`. It boots Payload WITHOUT pushing
 * (PAYLOAD_MIGRATING=true), asks drizzle-kit for the statements a dev push
 * would run against the live database, and prints them. It never calls
 * apply(): drizzle-kit's pushSchema only introspects until then. The
 * database is shared with production, so the guard below refuses to boot
 * Payload without the flag, and a push would run.
 *
 *   PAYLOAD_MIGRATING=true DDL_OUT=/path/to/out.sql \
 *     pnpm sim sim/licensing-ddl.sim.test.mjs
 *
 * Expect only additions for the tables named below. Any DROP, or a
 * statement for another table, means the database has drifted from this
 * checkout; stop.
 */
const enabled = process.env.PAYLOAD_MIGRATING === 'true'

const TABLES = new Set([
  'licenses',
  'licenses_seat_members',
  'licenses_accounts',
  'purchases',
  'products',
  'payload_locked_documents_rels',
])

/* The table or enum a statement creates or alters, or null if the statement
   is not a shape this dry run knows. */
const targetOf = (statement) => {
  const s = statement.trim()
  const type = s.match(/^CREATE TYPE "public"\."(enum_\w+)"/)
  if (type) return type[1]
  const table = s.match(/^(?:CREATE TABLE|ALTER TABLE) (?:"public"\.)?"(\w+)"/)
  if (table) return table[1]
  const index = s.match(
    /^CREATE (?:UNIQUE )?INDEX "\w+" ON (?:"public"\.)?"(\w+)"/
  )
  return index ? index[1] : null
}

const isAllowed = (statement) => {
  const target = targetOf(statement)
  if (!target) return false
  return (
    TABLES.has(target) ||
    target.startsWith('enum_licenses_') ||
    target.startsWith('enum_purchases_')
  )
}

describe.skipIf(!enabled)('licensing schema dry run', () => {
  it('lists only additive license statements', async () => {
    const payload = await getPayload({ config })
    const adapter = payload.db
    try {
      const { pushSchema } = adapter.requireDrizzleKit()
      const { statementsToExecute, hasDataLoss, warnings } = await pushSchema(
        adapter.schema,
        adapter.drizzle,
        adapter.schemaName ? [adapter.schemaName] : undefined,
        adapter.tablesFilter,
        adapter.extensions?.postgis ? ['postgis'] : undefined
      )

      /* drizzle-kit re-issues SET DEFAULT for every numeric column with a
         default on every push: it introspects the live default as a string
         and compares it with the schema's number. The live values already
         match, so these are listed, not applied. */
      const isNumericDefault = (s) =>
        /^ALTER TABLE "\w+" ALTER COLUMN "\w+" SET DEFAULT \d+;?$/.test(
          s.trim()
        )
      /* The live database's ensure_rls event trigger enables RLS on every
         table created in it, so tables made by an earlier push have it on
         while drizzle's schema wants it off. That is not drift, and
         disabling RLS is never wanted: listed, not applied. */
      const isDisableRls = (s) =>
        /^ALTER TABLE "\w+" DISABLE ROW LEVEL SECURITY;?$/.test(s.trim())
      const isNoise = (s) => isNumericDefault(s) || isDisableRls(s)
      const noise = statementsToExecute.filter(isNoise)
      const changes = statementsToExecute.filter((s) => !isNoise(s))

      const terminate = (s) => (s.trim().endsWith(';') ? s.trim() : `${s};`)
      const sql = changes.map(terminate).join('\n')
      if (process.env.DDL_OUT) await fs.writeFile(process.env.DDL_OUT, sql)
      console.log(
        `\n-- ${changes.length} statements, hasDataLoss=${hasDataLoss}` +
          `\n-- ${noise.length} no-ops left out:\n` +
          `${noise.map((s) => `--   ${s.trim()}`).join('\n')}` +
          `\n${warnings.join('\n')}\n${sql}\n`
      )

      expect(hasDataLoss).toBe(false)
      expect(changes.filter((s) => /\bdrop\b/i.test(s))).toEqual([])
      /* Every change must create or alter one of the tables or enums this
         work owns. */
      expect(changes.filter((s) => !isAllowed(s))).toEqual([])
    } finally {
      await payload.destroy()
    }
  })
})

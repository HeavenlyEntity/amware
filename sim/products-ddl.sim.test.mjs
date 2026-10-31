import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'

/*
 * A dry run of the schema push for the Products line, edition and digital fields. It boots Payload
 * WITHOUT pushing (PAYLOAD_MIGRATING=true), asks drizzle-kit for the
 * statements a dev push would run against the live database, and prints
 * them. It never calls apply(): drizzle-kit's pushSchema only introspects
 * until then. The database is shared with production, so the guard below
 * refuses to boot Payload without the flag, and a push would run.
 *
 *   PAYLOAD_MIGRATING=true DDL_OUT=/path/to/out.sql \
 *     pnpm sim sim/products-ddl.sim.test.mjs
 *
 * Expect only additions for `products`. Any DROP, or a statement for
 * another table, means the database has drifted from this checkout; stop.
 */
const enabled = process.env.PAYLOAD_MIGRATING === 'true'

describe.skipIf(!enabled)('products schema dry run', () => {
  it('lists only additive products statements', async () => {
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
         match (checked 2026-10-30), so these are listed, not applied. */
      const isNumericDefault = (s) =>
        /^ALTER TABLE "\w+" ALTER COLUMN "\w+" SET DEFAULT \d+;?$/.test(
          s.trim()
        )
      /* The live database's ensure_rls event trigger enables RLS on every
         table created in it, so tables made by an earlier push (projects_*)
         have it on while drizzle's schema wants it off. That is not drift,
         and disabling RLS is never wanted: listed, not applied. */
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
      /* Every change must create or alter a products table, column or
         enum; a mention of products_id elsewhere does not count. */
      expect(
        changes.filter(
          (s) =>
            !/^(CREATE (TYPE|TABLE|(UNIQUE )?INDEX "\w+" ON)|ALTER TABLE) "(public"\.")?(enum_)?products/.test(
              s.trim()
            )
        )
      ).toEqual([])
    } finally {
      await payload.destroy()
    }
  })
})

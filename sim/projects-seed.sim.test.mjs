import { describe, expect, it } from 'vitest'
import { getPayload } from 'payload'
import config from '@payload-config'
import { projects } from '@/content/site/projects'
import { fromPayload, pageOrder, toPayload } from '@/lib/projects/cms'

/*
 * Copies content/site/projects.js into the Payload `projects` collection,
 * upserting by key, so running it again is safe. Run it only after the
 * columns from docs/superpowers/plans/2026-10-29-projects-cms.sql exist.
 *
 *   PAYLOAD_MIGRATING=true pnpm sim sim/projects-seed.sim.test.mjs
 *
 * The database is shared with production, and a Payload boot without the
 * flag pushes this checkout's schema, so the guard refuses to run without
 * it. Always pass the file path: other sim files write data too.
 */
const enabled = process.env.PAYLOAD_MIGRATING === 'true'

describe.skipIf(!enabled)('projects seed', () => {
  it('upserts every static project and reads them back unchanged', async () => {
    const payload = await getPayload({ config })
    try {
      for (const [index, project] of projects.entries()) {
        const data = toPayload(project, index)
        const { docs } = await payload.find({
          collection: 'projects',
          where: { key: { equals: project.key } },
          depth: 0,
          limit: 1,
        })
        if (docs[0]) {
          await payload.update({ collection: 'projects', id: docs[0].id, data })
        } else {
          await payload.create({ collection: 'projects', data })
        }
      }

      const { docs } = await payload.find({
        collection: 'projects',
        depth: 0,
        pagination: false,
      })
      expect(docs).toHaveLength(projects.length)
      expect(pageOrder(docs).map(fromPayload)).toStrictEqual(projects)
    } finally {
      await payload.destroy()
    }
  })
})

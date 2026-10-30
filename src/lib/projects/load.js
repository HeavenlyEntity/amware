import { cache } from 'react'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

import { projects as staticProjects } from '../../content/site/projects'
import { getPayloadClient } from '../getPayloadClient'
import { fromPayload, pageOrder } from './cms'

/* The static file's first three entries are the bench. */
const FALLBACK = { projects: staticProjects, benchCount: 3 }

/* The Projects content from Payload, in the static shape and page order,
   with the bench first: `benchCount` is how many projects have On the
   bench ticked. With no projects in the collection yet, the static file.
   Throws when the database is unreachable. */
const fetchProjects = cache(async () => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'projects',
    depth: 0,
    pagination: false,
  })
  if (docs.length === 0) return FALLBACK
  return {
    projects: pageOrder(docs).map(fromPayload),
    benchCount: docs.filter((doc) => doc.onBench).length,
  }
})

/* For dynamic readers (the AI documents): the static file when the
   database is unreachable, so they never come back empty. */
export async function loadProjects() {
  try {
    return await fetchProjects()
  } catch (error) {
    console.error('Projects: could not load from the CMS', error)
    return FALLBACK
  }
}

/* For the ISR Projects page. A fallback returned during a background
   regeneration would be cached as a success until the next revalidate, so
   in production the error is rethrown and Next keeps serving the last good
   page. At build, and in dev, there is no good page to keep: fall back.
   The trade-off: right after an admin save has expired the page, a database
   error gives that one visitor an error page instead of stale content. */
export async function loadProjectsForPage() {
  try {
    return await fetchProjects()
  } catch (error) {
    console.error('Projects: could not load from the CMS', error)
    const regenerating =
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD
    if (regenerating) throw error
    return FALLBACK
  }
}

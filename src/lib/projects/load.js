import { cache } from 'react'

import { projects as staticProjects } from '@/content/site/projects'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { fromPayload, pageOrder } from './cms'

/* The Projects content from Payload, in the static shape. Falls back to
   content/site/projects.js when the database is unreachable or holds no
   projects yet, so the page never renders empty. */
export const loadProjects = cache(async () => {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'projects',
      depth: 0,
      limit: 100,
      pagination: false,
    })
    if (docs.length === 0) return staticProjects
    return pageOrder(docs).map(fromPayload)
  } catch (error) {
    console.error('Projects: could not load from the CMS', error)
    return staticProjects
  }
})

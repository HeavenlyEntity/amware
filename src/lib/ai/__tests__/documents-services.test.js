import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: (fn) => fn }))
vi.mock('react', () => ({ cache: (fn) => fn }))
vi.mock('../../getPayloadClient', () => ({
  getPayloadClient: async () => ({
    find: async ({ collection }) => ({
      docs:
        collection === 'services'
          ? [
              { name: 'Advisor', slug: 'advisor', status: 'published' },
              {
                name: 'Codebase Diagnostic',
                slug: 'codebase-diagnostic',
                status: 'published',
              },
            ]
          : [],
      hasNextPage: false,
    }),
  }),
}))
import { getDocument, documentMarkdown } from '../documents.js'

describe('services document', () => {
  it('lists the engagements but not the Codebase Diagnostic', async () => {
    const text = documentMarkdown(await getDocument('services'))
    expect(text).toContain('Advisor')
    expect(text).toContain('/services#advisor')
    expect(text).not.toContain('Codebase Diagnostic')
    expect(text).not.toContain('#codebase-diagnostic')
  })
})

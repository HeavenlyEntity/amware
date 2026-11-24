import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: (fn) => fn }))
vi.mock('react', () => ({ cache: (fn) => fn }))
vi.mock('../../getPayloadClient', () => ({
  getPayloadClient: async () => ({
    find: async ({ collection }) => ({
      docs:
        collection === 'products'
          ? [
              { name: 'A Guide', slug: 'a-guide', status: 'published' },
              {
                name: 'WareKit Standard Pro',
                slug: 'warekit-standard-pro',
                stack: 'standard',
                status: 'published',
              },
              {
                name: 'WareKit Standard Team',
                slug: 'warekit-standard-team',
                stack: 'standard',
                status: 'published',
              },
            ]
          : [],
      hasNextPage: false,
    }),
  }),
}))
import { documentIndex, getDocument, documentMarkdown } from '../documents.js'

describe('products documents', () => {
  it('leaves Standard kits out of the document index', async () => {
    const ids = (await documentIndex()).map((d) => d.id)
    expect(ids).toContain('products/a-guide')
    expect(ids).not.toContain('products/warekit-standard-pro')
    expect(ids).not.toContain('products/warekit-standard-team')
  })

  it('leaves Standard kits out of the products document and its details', async () => {
    const text = documentMarkdown(await getDocument('products'))
    expect(text).toContain('A Guide')
    expect(text).not.toContain('Standard')
    expect(await getDocument('products/warekit-standard-pro')).toBeNull()
  })
})

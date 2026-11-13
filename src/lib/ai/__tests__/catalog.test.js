import { describe, it, expect, vi } from 'vitest'
import { readCatalog, allCatalog } from '../catalog.js'

describe('public catalog boundary', () => {
  it('enforces access checks and strips internal fields even if select is ignored', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            name: 'Public',
            slug: 'public',
            status: 'published',
            downloadUrl: 'SECRET',
            creemProductId: 'SECRET',
            githubRepo: 'SECRET',
          },
          { name: 'Draft', status: 'draft' },
        ],
        hasNextPage: false,
      }),
    }
    const result = await readCatalog(payload, 'products')
    expect(payload.find.mock.calls[0][0]).toMatchObject({
      overrideAccess: false,
      user: null,
      depth: 0,
      where: { and: [{ status: { equals: 'published' } }] },
    })
    expect(result.docs).toHaveLength(1)
    expect(JSON.stringify(result.docs)).not.toContain('SECRET')
    expect(payload.find.mock.calls[0][0].select).not.toHaveProperty(
      'downloadUrl'
    )
  })
  it('publishes no price for any service, advisory or build', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            name: 'Advisor',
            slug: 'advisor',
            status: 'published',
            category: 'consulting',
            startingPrice: 3000,
            priceLabel: 'per month',
          },
          {
            name: 'One Pager',
            slug: 'one-pager',
            status: 'published',
            category: 'technical',
            startingPrice: 2500,
            priceLabel: 'one-time payment',
          },
        ],
        hasNextPage: false,
      }),
    }
    const { docs } = await readCatalog(payload, 'services')
    for (const doc of docs) {
      expect(doc.price).toBeUndefined()
      expect(doc.priceLabel).toBeUndefined()
    }
    expect(payload.find.mock.calls[0][0].select).not.toHaveProperty(
      'startingPrice'
    )
  })
  it('does not duplicate CMS records backed by MDX', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          { status: 'published', title: 'CMS', slug: 'same' },
          { status: 'published', title: 'MDX', mdxSlug: 'same' },
        ],
      }),
    }
    expect(
      (await readCatalog(payload, 'articles')).docs.map((row) => row.title)
    ).toEqual(['CMS'])
  })
  it('exhausts pagination and propagates failures rather than returning an empty index', async () => {
    const payload = {
      find: vi
        .fn()
        .mockResolvedValueOnce({
          docs: [{ status: 'published', title: 'One' }],
          hasNextPage: true,
          nextPage: 2,
        })
        .mockResolvedValueOnce({
          docs: [{ status: 'published', title: 'Two' }],
          hasNextPage: false,
        }),
    }
    expect(await allCatalog(payload, 'courses')).toHaveLength(2)
    expect(payload.find.mock.calls[1][0].page).toBe(2)
    payload.find.mockRejectedValue(new Error('Unavailable'))
    await expect(allCatalog(payload, 'courses')).rejects.toThrow('Unavailable')
  })
})

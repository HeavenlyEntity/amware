import { describe, expect, it, vi } from 'vitest'

/* The home page reads the Consulting services as retainer offer cards. The
   Codebase Diagnostic has a services row only for its deposit, so the query
   must never ask for it. */

const payload = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({
  getPayloadClient: vi.fn(async () => payload),
}))
vi.mock('@/lib/getAllArticles', () => ({
  getAllArticles: vi.fn(async () => []),
}))
vi.mock('../HomeContent', () => ({ default: () => null }))

import HomePage from '../page'

describe('HomePage services query', () => {
  it('never asks for the Codebase Diagnostic as a home page offer', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    await HomePage()
    const call = payload.find.mock.calls
      .map(([args]) => args)
      .find((args) => args.collection === 'services')
    expect(call.where).toMatchObject({
      category: { equals: 'consulting' },
      slug: { not_equals: 'codebase-diagnostic' },
    })
  })
})

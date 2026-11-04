import { describe, expect, it, vi } from 'vitest'

import { coveredByAnotherLicense, licenseRepo, repoOf } from '../repoAccess'

const payloadWith = (docs) => ({ find: vi.fn(async () => ({ docs })) })

describe('repoOf', () => {
  it('prefers the kit row, then the purchase', () => {
    expect(
      repoOf({
        product: { githubRepo: 'a/kit' },
        purchase: { githubRepo: 'a/old' },
      })
    ).toBe('a/kit')
    expect(repoOf({ product: null, purchase: { githubRepo: 'a/old' } })).toBe(
      'a/old'
    )
    expect(repoOf({ product: null, purchase: null })).toBeNull()
    expect(repoOf()).toBeNull()
  })
})

describe('coveredByAnotherLicense', () => {
  const license = { id: 1, stack: 'next-netsuite' }

  it('decides on the exact name, not the search match', async () => {
    const other = {
      id: 2,
      tier: 'pro',
      seatMembers: [{ githubUsername: 'octocat2' }],
    }
    expect(
      await coveredByAnotherLicense(payloadWith([other]), license, 'octocat')
    ).toBe(false)
  })

  it('is case-insensitive and ignores unpaid or the same license', async () => {
    const same = { id: 1, tier: 'pro', seatMembers: [{ githubUsername: 'a' }] }
    const lite = { id: 3, tier: 'lite', seatMembers: [{ githubUsername: 'a' }] }
    const team = { id: 4, tier: 'team', seatMembers: [{ githubUsername: 'A' }] }
    expect(
      await coveredByAnotherLicense(payloadWith([same, lite]), license, 'a')
    ).toBe(false)
    expect(
      await coveredByAnotherLicense(
        payloadWith([same, lite, team]),
        license,
        'a'
      )
    ).toBe(true)
  })

  it('searches every Creem environment', async () => {
    const payload = payloadWith([])
    await coveredByAnotherLicense(payload, license, 'a')
    const where = JSON.stringify(payload.find.mock.calls[0][0].where)
    expect(where).not.toContain('creemEnvironment')
  })
})

describe('licenseRepo', () => {
  it('reads the repository from a paid sale on the license', async () => {
    const payload = payloadWith([
      { grantsTier: 'lite', githubRepo: 'a/lite' },
      { grantsTier: 'team', githubRepo: 'a/kit' },
    ])
    expect(await licenseRepo(payload, { id: 1 })).toBe('a/kit')
  })

  it('is null when no paid sale names one', async () => {
    expect(await licenseRepo(payloadWith([]), { id: 1 })).toBeNull()
  })

  it('throws when the database does, so "could not look" is not "none"', async () => {
    const payload = { find: vi.fn().mockRejectedValue(new Error('down')) }
    await expect(licenseRepo(payload, { id: 1 })).rejects.toThrow('down')
  })
})

describe('licenseRepo for Enterprise', () => {
  /* Enterprise has no `products` row, so with no sale on the license naming a
     repository the Team row of its stack is the source: the same repository
     the Team kit invites to. `find` answers by collection. */
  const world = ({ purchases = [], products = [] } = {}) => ({
    find: vi.fn(async ({ collection }) => ({
      docs: collection === 'purchases' ? purchases : products,
    })),
  })
  const team = { id: 60, githubRepo: 'a/team-kit' }

  it('takes the Team row of the license stack when no sale names one', async () => {
    const payload = world({ products: [team] })
    const license = { id: 1, tier: 'enterprise', stack: 'next-netsuite' }
    expect(await licenseRepo(payload, license)).toBe('a/team-kit')

    const query = payload.find.mock.calls
      .map(([q]) => q)
      .find((q) => q.collection === 'products')
    expect(query.where.and).toEqual([
      { stack: { equals: 'next-netsuite' } },
      { tier: { equals: 'team' } },
      { status: { equals: 'published' } },
    ])
  })

  it('also serves a quoted license that has no tier yet, or lost it to a refund', async () => {
    const payload = world({ products: [team] })
    const license = {
      id: 1,
      tier: null,
      stack: 'next-netsuite',
      quoteCreemProductId: 'prod_quote',
    }
    expect(await licenseRepo(payload, license)).toBe('a/team-kit')
  })

  it('prefers a repository a sale on the license names', async () => {
    const payload = world({
      purchases: [{ grantsTier: 'enterprise', githubRepo: 'a/sold' }],
      products: [team],
    })
    const license = { id: 1, tier: 'enterprise', stack: 'next-netsuite' }
    expect(await licenseRepo(payload, license)).toBe('a/sold')
    expect(payload.find).toHaveBeenCalledTimes(1)
  })

  it('is null when the stack has no Team row', async () => {
    const license = { id: 1, tier: 'enterprise', stack: 'next-netsuite' }
    expect(await licenseRepo(world(), license)).toBeNull()
  })

  it('does not hand a license that was never paid for the paid repository', async () => {
    const payload = world({ products: [team] })
    for (const license of [
      { id: 1, tier: null, stack: 'next-netsuite' },
      { id: 1, tier: 'lite', stack: 'next-netsuite' },
    ]) {
      expect(await licenseRepo(payload, license)).toBeNull()
    }
    expect(
      payload.find.mock.calls.some(([q]) => q.collection === 'products')
    ).toBe(false)
  })

  it('throws when the Team row cannot be read', async () => {
    const payload = {
      find: vi.fn(async ({ collection }) => {
        if (collection === 'products') throw new Error('down')
        return { docs: [] }
      }),
    }
    await expect(
      licenseRepo(payload, {
        id: 1,
        tier: 'enterprise',
        stack: 'next-netsuite',
      })
    ).rejects.toThrow('down')
  })
})

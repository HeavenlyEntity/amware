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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../githubInvite', () => ({ removeFromRepo: vi.fn() }))

import { removeFromRepo } from '../githubInvite'
import { revokeLicenseAccess } from '../licenseRevoke'

const REPO = 'amwaredotdev/warekit-next-netsuite'
const INVITE = 'https://github.com/o/r/invitations'

/* A fake Payload client. `find` answers by collection: the purchases the
   license was sold on, and the other licenses on the stack. */
function fakePayload({ purchases, others = [] } = {}) {
  return {
    find: vi.fn(async ({ collection }) => ({
      docs:
        collection === 'purchases'
          ? purchases ?? [
              { id: 1, grantsTier: 'pro', githubRepo: REPO },
              { id: 2, grantsTier: 'team' },
            ]
          : others,
    })),
    update: vi.fn(async ({ data }) => data),
  }
}

const refunded = (over = {}) => ({
  id: 41,
  stack: 'next-netsuite',
  tier: null,
  seatMembers: [
    { githubUsername: 'Buyer', inviteUrl: INVITE },
    { githubUsername: 'teammate', inviteUrl: INVITE },
  ],
  ...over,
})

const flagged = (payload) =>
  payload.update.mock.calls.some(
    ([arg]) =>
      arg.collection === 'licenses' &&
      arg.id === 41 &&
      arg.data.needsReview === true
  )

/* Everything the module logged, as one string. A username showing up in it
   is the failure these tests are written to catch. */
const logged = (...spies) =>
  JSON.stringify(spies.flatMap((spy) => spy.mock.calls))

let info
let warn
let error

beforeEach(() => {
  vi.clearAllMocks()
  info = vi.spyOn(console, 'info').mockImplementation(() => {})
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
  removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
})

describe('revokeLicenseAccess', () => {
  it('only logs repo removal while the flag is off', async () => {
    const payload = fakePayload()

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      'Would revoke repo access (flag off)',
      expect.objectContaining({ license: 41, repo: REPO, wouldRemove: 2 })
    )
    // Access is still in place, so a person is asked to look.
    expect(flagged(payload)).toBe(true)
  })

  it('stays off for any value but 1', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = 'true'

    await revokeLicenseAccess(fakePayload(), refunded())

    expect(removeFromRepo).not.toHaveBeenCalled()
  })

  it('removes the people this license invited when the flag is on', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload()

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).toHaveBeenCalledTimes(2)
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'Buyer',
    })
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'teammate',
    })
    // Everything was accounted for, so nothing is left to review.
    expect(flagged(payload)).toBe(false)
  })

  it('skips anyone covered by another paid license', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload({
      // Another license, in any Creem environment, still holds teammate.
      others: [
        {
          id: 99,
          tier: 'team',
          creemEnvironment: 'sandbox',
          seatMembers: [{ githubUsername: 'TeamMate' }],
        },
      ],
    })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).toHaveBeenCalledTimes(1)
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'Buyer',
    })
    expect(flagged(payload)).toBe(false)
  })

  it('does not count a covering license that has no paid tier', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload({
      others: [
        { id: 99, tier: 'lite', seatMembers: [{ githubUsername: 'teammate' }] },
      ],
    })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).toHaveBeenCalledTimes(2)
  })

  it('leaves a seat with no invitation link alone, and flags it', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload()
    const license = refunded({
      seatMembers: [
        { githubUsername: 'Buyer', inviteUrl: INVITE },
        // Typed in by the owner: may be an existing collaborator.
        { githubUsername: 'somebody-elses-customer' },
      ],
    })

    await revokeLicenseAccess(payload, license)

    expect(removeFromRepo).toHaveBeenCalledTimes(1)
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'Buyer',
    })
    expect(flagged(payload)).toBe(true)
  })

  it('never logs a username, only counts', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    removeFromRepo.mockResolvedValueOnce({ ok: false, reason: 'forbidden' })
    const license = refunded({
      seatMembers: [
        { githubUsername: 'Buyer', inviteUrl: INVITE },
        { githubUsername: 'teammate', inviteUrl: INVITE },
        { githubUsername: 'unvouched' },
      ],
    })

    await revokeLicenseAccess(fakePayload(), license)

    const text = logged(info, warn, error).toLowerCase()
    for (const name of ['buyer', 'teammate', 'unvouched']) {
      expect(text).not.toContain(name)
    }
    expect(warn).toHaveBeenCalledWith(
      'Revocation left repo access in place',
      expect.objectContaining({ seats: 3, removed: 1, unproven: 1, failed: 1 })
    )
  })

  it('flags the license when GitHub refuses a removal', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    removeFromRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
    const payload = fakePayload()

    await revokeLicenseAccess(payload, refunded())

    expect(flagged(payload)).toBe(true)
  })

  it('does nothing while the license still holds a paid tier', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    for (const tier of ['pro', 'team', 'enterprise']) {
      const payload = fakePayload()
      await revokeLicenseAccess(payload, refunded({ tier }))
      expect(payload.find).not.toHaveBeenCalled()
    }
    expect(removeFromRepo).not.toHaveBeenCalled()
  })

  it('does nothing for a license with no seats', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload()

    await revokeLicenseAccess(payload, refunded({ seatMembers: [] }))

    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('removes a person once however many rows name them', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const license = refunded({
      seatMembers: [
        { githubUsername: 'Buyer' },
        { githubUsername: 'buyer', inviteUrl: INVITE },
      ],
    })

    await revokeLicenseAccess(fakePayload(), license)

    expect(removeFromRepo).toHaveBeenCalledTimes(1)
  })

  it('takes the repository from a paid-tier sale, never a Lite one', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload({
      purchases: [
        { id: 1, grantsTier: 'lite', githubRepo: 'amwaredotdev/lite' },
        { id: 2, grantsTier: 'pro', githubRepo: REPO },
      ],
    })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).toHaveBeenCalledWith(
      expect.objectContaining({ repo: REPO })
    )
  })

  it('removes nobody and flags the license when no repository is found', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload({ purchases: [{ id: 2, grantsTier: 'team' }] })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(flagged(payload)).toBe(true)
  })

  it('removes nobody when the coverage check cannot be made', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload()
    const find = payload.find.getMockImplementation()
    payload.find.mockImplementation(async (args) => {
      if (args.collection === 'licenses') throw new Error('db down')
      return find(args)
    })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(flagged(payload)).toBe(true)
  })

  it('never throws, even when flagging fails', async () => {
    const payload = fakePayload()
    payload.update.mockRejectedValue(new Error('db down'))

    await expect(
      revokeLicenseAccess(payload, refunded())
    ).resolves.toBeUndefined()
  })

  it('keeps a username out of the log when the coverage query fails', async () => {
    process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
    const payload = fakePayload()
    const find = payload.find.getMockImplementation()
    payload.find.mockImplementation(async (args) => {
      if (args.collection === 'licenses') {
        // As drizzle words it: the query parameters are in the message.
        throw Object.assign(
          new Error('Failed query: select ... params: %buyer%,next-netsuite'),
          { name: 'DrizzleQueryError' }
        )
      }
      return find(args)
    })

    await revokeLicenseAccess(payload, refunded())

    expect(removeFromRepo).not.toHaveBeenCalled()
    const text = logged(info, warn, error).toLowerCase()
    expect(text).not.toContain('buyer')
    expect(text).not.toContain('teammate')
    expect(error).toHaveBeenCalledWith(
      'Revocation coverage check failed',
      41,
      'DrizzleQueryError'
    )
  })
})

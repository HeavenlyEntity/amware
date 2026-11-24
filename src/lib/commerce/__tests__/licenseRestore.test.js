import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../githubInvite', () => ({ inviteToRepo: vi.fn() }))

import { inviteToRepo } from '../githubInvite'
import { restoreLicenseAccess } from '../licenseRestore'

const REPO = 'amwaredotdev/warekit-next-netsuite'
const fakePayload = () => ({
  find: vi.fn(async ({ collection }) => ({
    docs:
      collection === 'purchases'
        ? [{ id: 1, grantsTier: 'pro', githubRepo: REPO }]
        : [],
  })),
  update: vi.fn(async ({ data }) => data),
})
const withdrawn = (over = {}) => ({
  id: 41,
  stack: 'next-netsuite',
  tier: 'pro',
  accessWithdrawnAt: '2027-12-11T06:00:00.000Z',
  accessWithdrawnFor: '2027-12-10T15:00:00.000Z',
  seatMembers: [
    { githubUsername: 'Buyer', inviteUrl: 'u' },
    { githubUsername: 'buyer' },
    { githubUsername: 'teammate', inviteUrl: 'u' },
  ],
  ...over,
})
const cleared = (payload) =>
  payload.update.mock.calls.some(
    ([a]) =>
      a.data.accessWithdrawnAt === null && a.data.accessWithdrawnFor === null
  )
const flagged = (payload) =>
  payload.update.mock.calls.some(([a]) => a.data.needsReview === true)

beforeEach(() => {
  vi.clearAllMocks()
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'invited',
    url: 'x',
    id: 1,
  })
})

it('invites every developer on the license once and clears the withdrawn marks', async () => {
  const payload = fakePayload()
  expect(await restoreLicenseAccess(payload, withdrawn())).toMatchObject({
    state: 'restored',
    invited: 2,
  })
  expect(inviteToRepo).toHaveBeenCalledTimes(2)
  expect(inviteToRepo).toHaveBeenCalledWith({ repo: REPO, username: 'Buyer' })
  expect(cleared(payload)).toBe(true)
})
it('invites only the developers still on the license', async () => {
  await restoreLicenseAccess(
    fakePayload(),
    withdrawn({ seatMembers: [{ githubUsername: 'teammate', inviteUrl: 'u' }] })
  )
  expect(inviteToRepo).toHaveBeenCalledTimes(1)
  expect(inviteToRepo).toHaveBeenCalledWith({
    repo: REPO,
    username: 'teammate',
  })
})
it('counts someone who already had access as restored', async () => {
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'already-a-collaborator',
    url: null,
    id: null,
  })
  expect(await restoreLicenseAccess(fakePayload(), withdrawn())).toMatchObject({
    state: 'restored',
    already: 2,
  })
})
it('flags the license and still clears the marks when GitHub refuses an invitation', async () => {
  inviteToRepo.mockResolvedValueOnce({ ok: false, reason: 'rejected' })
  const payload = fakePayload()
  expect(await restoreLicenseAccess(payload, withdrawn())).toMatchObject({
    state: 'restored',
    failed: 1,
  })
  expect(flagged(payload)).toBe(true)
  expect(cleared(payload)).toBe(true)
})
it('leaves the marks for the next run when GitHub cannot be reached', async () => {
  inviteToRepo.mockResolvedValue({ ok: false, reason: 'unreachable' })
  const payload = fakePayload()
  expect(await restoreLicenseAccess(payload, withdrawn())).toMatchObject({
    state: 'retry',
  })
  expect(cleared(payload)).toBe(false)
})
it('does nothing for a license whose access was not withdrawn', async () => {
  expect(
    await restoreLicenseAccess(
      fakePayload(),
      withdrawn({ accessWithdrawnAt: null })
    )
  ).toMatchObject({ state: 'skipped' })
  expect(inviteToRepo).not.toHaveBeenCalled()
})
it('never throws and never logs a username', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const payload = fakePayload()
  payload.update.mockRejectedValue(new Error('db down'))
  inviteToRepo.mockResolvedValueOnce({ ok: false, reason: 'rejected' })
  await expect(restoreLicenseAccess(payload, withdrawn())).resolves.toBeTruthy()
  expect(
    JSON.stringify([error, warn, info].flatMap((s) => s.mock.calls))
  ).not.toMatch(/buyer|teammate/i)
})

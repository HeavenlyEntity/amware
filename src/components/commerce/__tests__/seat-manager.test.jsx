import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

/* From the components project: addSeat imports through the `@/` alias, which
   the engine project does not define. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({
  inviteToRepo: vi.fn(),
  removeFromRepo: vi.fn(),
}))
vi.mock('@/lib/commerce/creem', async () => {
  const real = await vi.importActual('@/lib/commerce/creem')
  return { ...real, deactivateLicense: vi.fn() }
})

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo, removeFromRepo } from '@/lib/commerce/githubInvite'
import { deactivateLicense, CreemError } from '@/lib/commerce/creem'
import { createAccessToken } from '@/lib/commerce/accessToken'
import { addSeat, removeAccount, removeSeat } from '@/lib/commerce/addSeat'
import { AccountList, SeatManager } from '@/components/commerce/SeatManager'

const REPO = 'amwaredotdev/warekit-next-netsuite'

const teamProduct = {
  id: 7,
  name: 'Team kit',
  seats: 5,
  netsuiteAccounts: 3,
  githubRepo: REPO,
}
const proProduct = { id: 6, name: 'Pro kit', seats: 1, githubRepo: REPO }

const update = vi.fn()

const members = (...names) =>
  names.map((githubUsername) => ({ githubUsername }))

/* Seats this license invited itself: only `inviteToRepo` returning a link
   puts one on the row. */
const invited = (...names) =>
  names.map((githubUsername) => ({
    githubUsername,
    inviteUrl: `https://github.com/${REPO}/invitations`,
  }))

/* The database as addSeat sees it: a license, the purchase that opened it and
   the kit row for its stack and tier. */
const world = ({
  license = {},
  purchase = {},
  product = teamProduct,
  others = [],
  keyRows = [{ id: 42, status: 'paid', licenseKey: 'KEY-1' }],
} = {}) => {
  const rows = {
    licenses: {
      id: 9,
      tier: 'team',
      stack: 'next-netsuite',
      seatMembers: members('owner'),
      ...license,
    },
    purchases: {
      id: 42,
      status: 'paid',
      license: 9,
      githubUsername: 'owner',
      ...purchase,
    },
  }
  update.mockResolvedValue({})
  getPayloadClient.mockResolvedValue({
    findByID: vi.fn(async ({ collection, id }) => {
      const row = rows[collection]
      if (!row || row.id !== id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return row
    }),
    find: vi.fn(async ({ collection }) => {
      if (collection === 'licenses') return { docs: others }
      if (collection === 'purchases') return { docs: keyRows }
      return { docs: product ? [product] : [] }
    }),
    update,
  })
  return rows
}

const token = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 7,
    ...claims,
  }).token

const add = (username, tok, extra = {}) => {
  const fd = new FormData()
  fd.set('token', tok ?? token())
  fd.set('githubUsername', username)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return addSeat({ error: null, ok: null, seats: null }, fd)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACCESS_LINK_SECRET = 'seat-test-secret'
  global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true })
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'invited',
    url: `https://github.com/${REPO}/invitations`,
    id: 1,
  })
})

describe('addSeat: the link is the authentication', () => {
  it('refuses a token that was not signed by us', async () => {
    world()
    const state = await add('octocat', 'not.a.real.token')
    expect(state.error?.message).toMatch(/no longer valid/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a token signed with a different secret', async () => {
    world()
    const tok = token()
    process.env.ACCESS_LINK_SECRET = 'a-different-secret'
    const state = await add('octocat', tok)
    expect(state.error?.message).toMatch(/no longer valid/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a license that was refunded', async () => {
    world({ license: { tier: null } })
    const state = await add('octocat')
    expect(state.error?.message).toMatch(/no longer active/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses an old token whose purchase never reached a license, without throwing', async () => {
    world({ purchase: { license: null } })
    const state = await add('octocat')
    expect(state.error?.message).toMatch(/no longer valid/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('answers a database failure with a try-again, not a throw', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection refused'))
    const state = await add('octocat')
    expect(state.error?.message).toMatch(/try again/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it.each([
    ['purchase', 'purchases'],
    ['license', 'licenses'],
  ])(
    'answers a failed %s read with a try-again, never "no longer valid"',
    async (_label, failing) => {
      const rows = world()
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const payload = await getPayloadClient()
      payload.findByID.mockImplementation(async ({ collection }) => {
        if (collection === failing) {
          throw Object.assign(new Error('connection terminated'), {
            status: 500,
          })
        }
        return rows[collection]
      })
      const state = await add('octocat')
      error.mockRestore()

      expect(state.error?.message).toMatch(/nothing was sent/i)
      expect(state.error?.message).toMatch(/try again/i)
      expect(state.error?.message).not.toMatch(/no longer valid/i)
      expect(inviteToRepo).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()
    }
  )

  it('works from a token that names only a license', async () => {
    world()
    const state = await add(
      'octocat',
      token({ purchaseId: null, licenseId: 9 })
    )
    expect(state.error).toBeNull()
    expect(state.seats).toEqual({ used: ['owner', 'octocat'], limit: 5 })
  })
})

describe('addSeat: the license limit', () => {
  it('adds a new account while there is room, and writes it to the license', async () => {
    world()
    const state = await add('octocat')
    expect(state.error).toBeNull()
    expect(state.seats).toEqual({ used: ['owner', 'octocat'], limit: 5 })
    expect(inviteToRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'octocat',
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0]).toMatchObject({
      collection: 'licenses',
      id: 9,
    })
  })

  it('refuses the sixth developer on a five-developer license', async () => {
    world({ license: { seatMembers: members('a', 'b', 'c', 'd', 'e') } })
    const state = await add('octocat')
    expect(state.error?.field).toBe('githubUsername')
    expect(state.error?.message).toBe(
      'This license covers 5 developers and all 5 are in use. Remove someone below, or see your options above.'
    )
    // The limit is the license, so nothing is invited and nothing is written.
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('holds a hand-made POST to the limit, trusting only the token and the username', async () => {
    world({
      license: { tier: 'pro' },
      product: proProduct,
    })
    const state = await add('octocat', undefined, {
      limit: '99',
      seats: '99',
      licenseId: '12345',
      seatMembers: '[]',
      repo: 'someone/else',
    })
    expect(state.error?.message).toMatch(/1 developer and all 1 is in use/)
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('counts the seats on the license, not the ones left on the purchase', async () => {
    world({
      purchase: { seatMembers: members('a', 'b', 'c', 'd', 'e') },
    })
    const state = await add('octocat')
    expect(state.error).toBeNull()
    expect(state.seats.used).toEqual(['owner', 'octocat'])
  })

  it('lets a Pro buyer who abandoned onboarding add their first developer', async () => {
    world({
      license: { tier: 'pro', seatMembers: [] },
      product: proProduct,
      purchase: { githubUsername: null },
    })
    const state = await add('octocat')
    expect(state.error).toBeNull()
    expect(state.seats).toEqual({ used: ['octocat'], limit: 1 })
  })

  it('reads the limit from the license override when it has one', async () => {
    world({
      license: {
        tier: 'enterprise',
        seatOverride: 2,
        seatMembers: members('a', 'b'),
      },
      purchase: { githubRepo: REPO },
      product: null,
    })
    const state = await add('octocat')
    expect(state.error?.message).toMatch(/2 developers and all 2 are in use/)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('does not guess a limit when the kit row is missing', async () => {
    world({ product: null })
    const state = await add('octocat')
    expect(state.error?.message).toMatch(/get in touch/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('re-invites someone already on a full license without spending a seat', async () => {
    world({ license: { seatMembers: members('a', 'b', 'c', 'd', 'e') } })
    const state = await add('A')
    expect(state.error).toBeNull()
    // Invited again, but not recorded again: a full team must be able to
    // re-send an invitation nobody accepted.
    expect(inviteToRepo).toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(state.seats.used).toHaveLength(5)
  })

  it('does not let one person take two seats by changing capitalisation', async () => {
    world({ license: { seatMembers: members('OctoCat') } })
    const state = await add('octocat')
    expect(state.error).toBeNull()
    expect(update).not.toHaveBeenCalled()
    expect(state.seats.used).toEqual(['OctoCat'])
  })
})

describe('addSeat: delivery', () => {
  it('records the seat with its invite link', async () => {
    world()
    await add('octocat')
    const written = update.mock.calls[0][0].data.seatMembers
    expect(written).toHaveLength(2)
    expect(written[1]).toMatchObject({
      githubUsername: 'octocat',
      inviteUrl: `https://github.com/${REPO}/invitations`,
    })
  })

  it('still records the seat when the invitation could not be sent', async () => {
    world()
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'not-configured' })
    const state = await add('octocat')
    expect(state.ok?.manual).toBe(true)
    // The seat is spent either way: a human is going to finish this invite.
    expect(update).toHaveBeenCalled()
  })

  it('does not show a seat as added when it could not be stored', async () => {
    world()
    update.mockRejectedValue(new Error('write failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await add('octocat')
    error.mockRestore()

    // The invitation cannot be taken back, so it did go out.
    expect(inviteToRepo).toHaveBeenCalled()
    expect(state.error).toBeNull()
    expect(state.ok).toMatchObject({ username: 'octocat', unsaved: true })
    // But the count does not include an account that was never stored.
    expect(state.seats).toEqual({ used: ['owner'], limit: 5 })
  })

  it('does not call a stored seat unsaved', async () => {
    world()
    const state = await add('octocat')
    expect(state.ok.unsaved).toBe(false)
  })

  it('rejects an account GitHub says does not exist', async () => {
    world()
    global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false })
    const state = await add('ghost')
    expect(state.error?.field).toBe('githubUsername')
    expect(inviteToRepo).not.toHaveBeenCalled()
  })
})

describe('SeatManager', () => {
  const seats = { used: ['owner', 'octocat'], limit: 5 }

  it('shows seats used against the limit', () => {
    render(<SeatManager token="t" repo={REPO} initialSeats={seats} />)
    expect(screen.getByText('2 / 5 developers')).toBeInTheDocument()
    expect(screen.getByText(/3 developers left/i)).toBeInTheDocument()
  })

  it('says no developers are left rather than showing zero left', () => {
    render(
      <SeatManager
        token="t"
        repo={REPO}
        initialSeats={{ used: ['a', 'b', 'c', 'd', 'e'], limit: 5 }}
      />
    )
    expect(screen.getByText(/no developers left/i)).toBeInTheDocument()
  })

  it('keeps the form usable when full, so a lapsed invite can be re-sent', () => {
    render(
      <SeatManager
        token="t"
        repo={REPO}
        initialSeats={{ used: ['a', 'b', 'c', 'd', 'e'], limit: 5 }}
      />
    )
    // A dead form with no explanation is the worse failure.
    expect(
      screen.getByRole('button', { name: /add to the license/i })
    ).toBeEnabled()
    expect(screen.getByText(/re-send an invitation/i)).toBeInTheDocument()
  })

  it('carries the signed link with the submission', () => {
    const { container } = render(
      <SeatManager token="signed-tok" repo={REPO} initialSeats={seats} />
    )
    expect(container.querySelector('input[name="token"]')).toHaveValue(
      'signed-tok'
    )
  })

  it('says "Add your first developer" when nobody has a seat yet', () => {
    render(
      <SeatManager
        token="t"
        repo={REPO}
        initialSeats={{ used: [], limit: 1 }}
      />
    )
    expect(screen.getByText('Add your first developer')).toBeInTheDocument()
    expect(screen.getByText('0 / 1 developers')).toBeInTheDocument()
  })

  it('does not claim removing someone on GitHub frees a seat', () => {
    render(<SeatManager token="t" repo={REPO} initialSeats={seats} />)
    expect(screen.queryByText(/frees/i)).toBeNull()
    expect(screen.queryByText(/licence/i)).toBeNull()
  })

  it('renders its children inside the usage card', () => {
    render(
      <SeatManager token="t" repo={REPO} initialSeats={seats}>
        <p>1 / 3 NetSuite accounts</p>
      </SeatManager>
    )
    expect(screen.getByText('1 / 3 NetSuite accounts')).toBeInTheDocument()
  })

  it('links each seat to its GitHub profile', () => {
    render(<SeatManager token="t" repo={REPO} initialSeats={seats} />)
    expect(screen.getByRole('link', { name: '@octocat' })).toHaveAttribute(
      'href',
      'https://github.com/octocat'
    )
  })
})

const remove = (username, tok, extra = {}) => {
  const fd = new FormData()
  fd.set('token', tok ?? token())
  fd.set('githubUsername', username)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return removeSeat({ error: null, ok: null, seats: null }, fd)
}

const writtenSeats = () => update.mock.calls.at(-1)[0].data.seatMembers

describe('removeSeat', () => {
  beforeEach(() => {
    removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
  })

  it('frees the seat after GitHub removes the person', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    const state = await remove('octocat')

    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'octocat',
    })
    expect(state.error).toBeNull()
    expect(state.removed).toEqual({
      username: 'octocat',
      accessKept: false,
      unsaved: false,
    })
    expect(state.seats).toEqual({ used: ['owner'], limit: 5 })
    expect(writtenSeats().map((m) => m.githubUsername)).toEqual(['owner'])
  })

  it('keeps the seat and says so when GitHub refuses', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    removeFromRepo.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await remove('octocat')
    error.mockRestore()

    expect(state.error?.message).toMatch(/would not remove @octocat/i)
    expect(state.error?.message).toMatch(/seat is kept/i)
    expect(state.removed ?? null).toBeNull()
    expect(state.seats).toEqual({ used: ['owner', 'octocat'], limit: 5 })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses a removal with a bad token', async () => {
    world()
    const state = await remove('owner', 'not.a.real.token')
    expect(state.error?.message).toMatch(/no longer valid/i)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses a name that is not on the stored list, and touches nothing', async () => {
    world()
    const state = await remove('stranger', undefined, {
      seatMembers: '[{"githubUsername":"stranger"}]',
      repo: 'someone/else',
      licenseId: '12345',
    })
    expect(state.error?.message).toMatch(/not on this license/i)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('acts on the stored spelling and on the token repo, not the form', async () => {
    world({ license: { seatMembers: invited('owner', 'OctoCat') } })
    await remove('octocat', undefined, { repo: 'someone/else' })
    expect(removeFromRepo).toHaveBeenCalledWith({
      repo: REPO,
      username: 'OctoCat',
    })
  })

  it('lets the last developer go: an owner may be swapping themselves out', async () => {
    world({ license: { seatMembers: invited('owner') } })
    const state = await remove('owner')
    expect(state.error).toBeNull()
    expect(state.seats).toEqual({ used: [], limit: 5 })
    expect(writtenSeats()).toEqual([])
  })

  it('leaves repository access alone when another paid license holds the person', async () => {
    world({
      license: { seatMembers: invited('owner', 'octocat') },
      others: [
        {
          id: 31,
          stack: 'next-netsuite',
          tier: 'pro',
          seatMembers: members('OctoCat'),
        },
      ],
    })
    const state = await remove('octocat')

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(state.removed).toMatchObject({
      username: 'octocat',
      accessKept: true,
      unsaved: false,
    })
    // The seat here is still freed.
    expect(state.seats.used).toEqual(['owner'])
    expect(writtenSeats().map((m) => m.githubUsername)).toEqual(['owner'])
  })

  it('asks for other licenses of this stack only, and never this one', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    await remove('octocat')
    const payload = await getPayloadClient()
    const call = payload.find.mock.calls
      .map(([arg]) => arg)
      .find((arg) => arg.collection === 'licenses')
    expect(call.where.and).toEqual(
      expect.arrayContaining([
        { stack: { equals: 'next-netsuite' } },
        { id: { not_equals: 9 } },
        { tier: { in: ['pro', 'team', 'enterprise'] } },
      ])
    )
  })

  it.each([
    ['a refunded license', { id: 31, tier: null }],
    ['a free Lite license', { id: 32, tier: 'lite' }],
    ['this license itself', { id: 9, tier: 'team' }],
  ])('does not treat %s as cover', async (_label, other) => {
    world({
      license: { seatMembers: invited('owner', 'octocat') },
      others: [
        { stack: 'next-netsuite', seatMembers: members('octocat'), ...other },
      ],
    })
    await remove('octocat')
    expect(removeFromRepo).toHaveBeenCalled()
  })

  it.each([
    ['a sandbox license covers a production one', 'production', 'sandbox'],
    ['a production license covers a sandbox one', 'sandbox', 'production'],
  ])('%s: they share the real repo', async (_label, mine, theirs) => {
    world({
      license: {
        creemEnvironment: mine,
        seatMembers: invited('owner', 'octocat'),
      },
      others: [
        {
          id: 31,
          stack: 'next-netsuite',
          tier: 'team',
          creemEnvironment: theirs,
          seatMembers: members('octocat'),
        },
      ],
    })
    const state = await remove('octocat')
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(state.removed).toMatchObject({ accessKept: true, unsaved: false })
    expect(state.seats.used).toEqual(['owner'])
  })

  it('frees a seat that has no invite link without calling GitHub', async () => {
    // No link means inviteToRepo said "already a collaborator" (or it failed):
    // this license did not create that access, so it must not take it away.
    world({
      license: { seatMembers: members('owner', 'someone-elses-customer') },
    })
    const state = await remove('someone-elses-customer')

    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(state.error).toBeNull()
    expect(state.removed).toEqual({
      username: 'someone-elses-customer',
      accessKept: true,
      unsaved: false,
    })
    expect(state.seats.used).toEqual(['owner'])
    expect(writtenSeats().map((m) => m.githubUsername)).toEqual(['owner'])
  })

  it('does not look for cover when it is not going to remove anyone', async () => {
    world({ license: { seatMembers: members('owner', 'octocat') } })
    await remove('octocat')
    const payload = await getPayloadClient()
    const searched = payload.find.mock.calls.some(
      ([arg]) => arg.collection === 'licenses'
    )
    expect(searched).toBe(false)
  })

  it('makes no GitHub call on a Lite license, even for a seat with an invite link', async () => {
    world({
      license: { tier: 'lite', seatMembers: invited('owner') },
      product: { id: 5, name: 'Lite kit', seats: 1, githubRepo: REPO },
    })
    const state = await remove('owner')
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(state.removed).toMatchObject({ accessKept: true, unsaved: false })
    expect(state.seats.used).toEqual([])
  })

  it('makes no GitHub call on a refunded license, and frees nothing', async () => {
    world({ license: { tier: null, seatMembers: invited('owner') } })
    const state = await remove('owner')
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(state.error?.message).toMatch(/no longer active/i)
    expect(update).not.toHaveBeenCalled()
  })

  it('does not match on a longer name that contains the username', async () => {
    world({
      license: { seatMembers: invited('owner', 'cat') },
      others: [
        {
          id: 31,
          stack: 'next-netsuite',
          tier: 'team',
          seatMembers: members('octocat'),
        },
      ],
    })
    await remove('cat')
    expect(removeFromRepo).toHaveBeenCalled()
  })

  it('removes nothing when the cover check cannot run', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    const payload = await getPayloadClient()
    payload.find.mockImplementation(async ({ collection }) => {
      if (collection === 'licenses') throw new Error('connection terminated')
      return { docs: [teamProduct] }
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await remove('octocat')
    error.mockRestore()

    expect(state.error?.message).toMatch(/nothing was changed/i)
    expect(removeFromRepo).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('says the seat is not freed when GitHub let go but the write failed', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    update.mockRejectedValue(new Error('write failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await remove('octocat')
    error.mockRestore()

    expect(state.removed).toMatchObject({ username: 'octocat', unsaved: true })
    expect(state.seats.used).toEqual(['owner', 'octocat'])
  })

  it('keeps a developer added while GitHub was being called', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    const payload = await getPayloadClient()
    const stored = payload.findByID.getMockImplementation()
    let reads = 0
    payload.findByID.mockImplementation(async (args) => {
      const row = await stored(args)
      // The second read of the license is the fresh one before the write.
      if (args.collection === 'licenses' && ++reads > 1) {
        return { ...row, seatMembers: members('owner', 'octocat', 'newcomer') }
      }
      return row
    })
    const state = await remove('octocat')
    expect(writtenSeats().map((m) => m.githubUsername)).toEqual([
      'owner',
      'newcomer',
    ])
    expect(state.seats.used).toEqual(['owner', 'newcomer'])
  })

  it('refuses a refunded license', async () => {
    world({ license: { tier: null } })
    const state = await remove('owner')
    expect(state.error?.message).toMatch(/no longer active/i)
    expect(removeFromRepo).not.toHaveBeenCalled()
  })

  it('answers a database failure with a try-again, not a throw', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection refused'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await remove('owner')
    error.mockRestore()
    expect(state.error?.message).toMatch(/try again/i)
    expect(removeFromRepo).not.toHaveBeenCalled()
  })
})

const accountRows = (...rows) =>
  rows.map(([accountId, status = 'active', creemInstanceId]) => ({
    accountId,
    status,
    creemInstanceId,
  }))

const removeAcct = (accountId, tok, extra = {}) => {
  const fd = new FormData()
  fd.set('token', tok ?? token())
  fd.set('accountId', accountId)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return removeAccount({ error: null, ok: null, accounts: null }, fd)
}

const writtenAccounts = () => update.mock.calls.at(-1)[0].data.accounts

describe('removeAccount', () => {
  beforeEach(() => {
    deactivateLicense.mockResolvedValue(undefined)
  })

  it('removes an account and deactivates it in Creem', async () => {
    world({
      license: {
        accounts: accountRows(
          ['7654321', 'active', 'inst_1'],
          ['111', 'active', 'inst_2']
        ),
      },
    })
    const state = await removeAcct('7654321')

    expect(deactivateLicense).toHaveBeenCalledWith({
      key: 'KEY-1',
      instanceId: 'inst_1',
    })
    expect(state.error).toBeNull()
    expect(state.ok).toEqual({ accountId: '7654321', creemFailed: false })
    expect(writtenAccounts().map((a) => a.accountId)).toEqual(['111'])
    // Nothing but what the page shows comes back: no instance ids.
    expect(state.accounts).toEqual([{ accountId: '111', status: 'active' }])
  })

  it('still removes the account when Creem fails', async () => {
    world({
      license: { accounts: accountRows(['7654321', 'active', 'inst_1']) },
    })
    deactivateLicense.mockRejectedValue(new CreemError('down', 502))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await removeAcct('7654321')
    error.mockRestore()

    expect(state.error).toBeNull()
    expect(state.ok).toEqual({ accountId: '7654321', creemFailed: true })
    expect(writtenAccounts()).toEqual([])
  })

  it('just drops an over-limit row, which has no instance', async () => {
    world({
      license: {
        accounts: accountRows(
          ['111', 'active', 'inst_2'],
          ['222', 'over_limit']
        ),
      },
    })
    const state = await removeAcct('222')
    expect(deactivateLicense).not.toHaveBeenCalled()
    expect(state.ok).toEqual({ accountId: '222', creemFailed: false })
    expect(writtenAccounts().map((a) => a.accountId)).toEqual(['111'])
  })

  it('does not call Creem without a key, and still removes the account', async () => {
    world({
      license: { accounts: accountRows(['111', 'active', 'inst_2']) },
      keyRows: [],
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await removeAcct('111')
    error.mockRestore()
    expect(deactivateLicense).not.toHaveBeenCalled()
    expect(state.ok).toMatchObject({ accountId: '111', creemFailed: true })
    expect(writtenAccounts()).toEqual([])
  })

  it('refuses a bad token', async () => {
    world({ license: { accounts: accountRows(['111', 'active', 'inst_2']) } })
    const state = await removeAcct('111', 'not.a.real.token')
    expect(state.error?.message).toMatch(/no longer valid/i)
    expect(deactivateLicense).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses an account that is not listed, ignoring an instance id from the form', async () => {
    world({ license: { accounts: accountRows(['111', 'active', 'inst_2']) } })
    const state = await removeAcct('999', undefined, {
      instanceId: 'inst_2',
      creemInstanceId: 'inst_2',
    })
    expect(state.error?.message).toMatch(/not on this license/i)
    expect(deactivateLicense).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('releases the stored instance, never one named by the form', async () => {
    world({ license: { accounts: accountRows(['111', 'active', 'inst_2']) } })
    await removeAcct('111', undefined, { instanceId: 'inst_evil' })
    expect(deactivateLicense).toHaveBeenCalledWith({
      key: 'KEY-1',
      instanceId: 'inst_2',
    })
  })

  it('keeps the list and asks to retry when the license cannot be written', async () => {
    world({ license: { accounts: accountRows(['111', 'over_limit']) } })
    update.mockRejectedValue(new Error('write failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await removeAcct('111')
    error.mockRestore()
    expect(state.error?.message).toMatch(/try again/i)
    expect(state.accounts).toEqual([{ accountId: '111', status: 'over_limit' }])
  })

  it('refuses a refunded license', async () => {
    world({ license: { tier: null, accounts: accountRows(['111']) } })
    const state = await removeAcct('111')
    expect(state.error?.message).toMatch(/no longer active/i)
  })
})

describe('SeatManager remove buttons', () => {
  const seats = { used: ['owner', 'octocat'], limit: 5 }

  beforeEach(() => {
    removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
  })

  it('gives each developer a named, 44px Remove button', () => {
    render(<SeatManager token="t" repo={REPO} initialSeats={seats} />)
    const button = screen.getByRole('button', { name: 'Remove @octocat' })
    expect(button).toBeInTheDocument()
    expect(button.className).toMatch(/min-h-11/)
    expect(screen.getByRole('button', { name: 'Remove @owner' })).toBeEnabled()
  })

  it('carries only the token and the name with a removal', () => {
    const { container } = render(
      <SeatManager token="signed-tok" repo={REPO} initialSeats={seats} />
    )
    const form = screen
      .getByRole('button', { name: 'Remove @octocat' })
      .closest('form')
    expect(form.querySelector('input[name="token"]')).toHaveValue('signed-tok')
    expect(form.querySelector('input[name="githubUsername"]')).toHaveValue(
      'octocat'
    )
    expect(container.querySelectorAll('input[name="intent"]')).toHaveLength(3)
  })

  it('removes a developer through the form and shows the server count', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/@octocat removed/i)
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove @octocat' })).toBeNull()
  })

  it('says the seat is kept when GitHub refuses', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    removeFromRepo.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/seat is kept/i)
    error.mockRestore()
    expect(screen.getByText('2 / 5 developers')).toBeInTheDocument()
  })

  it('says access was left as it is, and offers contact, when this license did not create it', async () => {
    world({ license: { seatMembers: members('owner', 'octocat') } })
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/seat is free/i)
    expect(status).toHaveTextContent(/repository access was left as it is/i)
    expect(status).not.toHaveTextContent(/lost access/i)
    expect(status).not.toHaveTextContent(/access is gone/i)
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
  })

  it('does not claim access was lost when it was kept and the seat could not be freed', async () => {
    world({ license: { seatMembers: members('owner', 'octocat') } })
    update.mockRejectedValue(new Error('write failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })
    error.mockRestore()
    const status = await screen.findByRole('status')
    expect(status).not.toHaveTextContent(/lost access/i)
    expect(status).toHaveTextContent(/could not free the seat/i)
    expect(status).toHaveTextContent(/press remove again/i)
    expect(status).toHaveTextContent(/repository access was not changed/i)
    expect(screen.getByText('2 / 5 developers')).toBeInTheDocument()
  })

  it('tells the owner to press Remove again when access went but the seat stayed', async () => {
    world({ license: { seatMembers: invited('owner', 'octocat') } })
    update.mockRejectedValue(new Error('write failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })
    error.mockRestore()
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/@octocat lost access on GitHub/i)
    expect(status).toHaveTextContent(/press remove again/i)
    expect(status).toHaveTextContent(/safe to repeat/i)
  })

  it('says repository access was left alone when another license covers the person', async () => {
    world({
      license: { seatMembers: invited('owner', 'octocat') },
      others: [
        {
          id: 31,
          stack: 'next-netsuite',
          tier: 'team',
          seatMembers: members('octocat'),
        },
      ],
    })
    render(<SeatManager token={token()} repo={REPO} initialSeats={seats} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove @octocat' }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      /repository access was left as it is/i
    )
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
  })
})

describe('AccountList', () => {
  const accounts = [
    { accountId: '7654321', status: 'active' },
    { accountId: '222', status: 'over_limit' },
  ]

  it('gives each account a named, 44px Remove button, and marks the over-limit one', () => {
    render(<AccountList token="t" accounts={accounts} limit={1} />)
    const button = screen.getByRole('button', { name: 'Remove account 222' })
    expect(button.className).toMatch(/min-h-11/)
    expect(screen.getByText('Over your limit')).toBeInTheDocument()
    expect(screen.getByText('1 / 1 NetSuite accounts')).toBeInTheDocument()
  })

  it('removes an account through the form and updates the list', async () => {
    world({
      license: {
        accounts: accountRows(
          ['7654321', 'active', 'inst_1'],
          ['222', 'over_limit']
        ),
      },
    })
    render(<AccountList token={token()} accounts={accounts} limit={1} />)

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove account 222' })
      )
    })

    expect(await screen.findByRole('status')).toHaveTextContent(
      /222 removed from your license/i
    )
    expect(screen.queryByText('Over your limit')).toBeNull()
    expect(screen.queryByText('222')).toBeNull()
    expect(screen.getByText('7654321')).toBeInTheDocument()
  })

  it('says so when Creem did not confirm, and still drops the account', async () => {
    world({
      license: { accounts: accountRows(['7654321', 'active', 'inst_1']) },
    })
    deactivateLicense.mockRejectedValue(new CreemError('down', 502))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AccountList
        token={token()}
        accounts={[{ accountId: '7654321', status: 'active' }]}
        limit={1}
      />
    )
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove account 7654321' })
      )
    })
    error.mockRestore()
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Creem did not confirm/i
    )
    expect(screen.getByText(/Shows up after your first/)).toBeInTheDocument()
  })
})

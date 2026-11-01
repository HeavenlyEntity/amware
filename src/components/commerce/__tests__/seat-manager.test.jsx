import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/* From the components project: addSeat imports through the `@/` alias, which
   the engine project does not define. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { createAccessToken } from '@/lib/commerce/accessToken'
import { addSeat } from '@/lib/commerce/addSeat'
import { SeatManager } from '@/components/commerce/SeatManager'

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

/* The database as addSeat sees it: a license, the purchase that opened it and
   the kit row for its stack and tier. */
const world = ({ license = {}, purchase = {}, product = teamProduct } = {}) => {
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
      if (!row || row.id !== id) throw new Error('not found')
      return row
    }),
    find: vi.fn(async () => ({ docs: product ? [product] : [] })),
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

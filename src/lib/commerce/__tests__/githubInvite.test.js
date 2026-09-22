import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/* Relative import: the engine project defines no `@/` alias, and this module
   reaches nothing but global fetch. */
import { inviteToRepo, removeFromRepo } from '../githubInvite'

const REPO = 'amwaredotdev/warekit-react-netsuite-lite'

const reply = (status, body = null, headers = {}) => {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  })
}

beforeEach(() => {
  process.env.GITHUB_TOKEN = 'gh_test'
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.GITHUB_TOKEN
})

describe('inviteToRepo', () => {
  it('returns the accept link when GitHub creates an invitation', async () => {
    reply(201, {
      id: 42,
      html_url: `https://github.com/${REPO}/invitations`,
    })
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    expect(r).toEqual({
      ok: true,
      state: 'invited',
      url: `https://github.com/${REPO}/invitations`,
      id: 42,
    })
  })

  it('asks for read access, not push', async () => {
    reply(201, { id: 1, html_url: 'https://example.com' })
    await inviteToRepo({ repo: REPO, username: 'octocat' })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(
      `https://api.github.com/repos/${REPO}/collaborators/octocat`
    )
    expect(init.method).toBe('PUT')
    // A buyer clones and forks the kit. Push would let them rewrite the
    // product they bought a copy of.
    expect(JSON.parse(init.body)).toEqual({ permission: 'pull' })
  })

  it('treats 204 as success, because that is what a retried webhook looks like', async () => {
    reply(204)
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    expect(r.ok).toBe(true)
    expect(r.state).toBe('already-a-collaborator')
  })

  it('returns null rather than guessing a URL when the body has none', async () => {
    reply(201, { id: 7 })
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    // A link that 404s in a confirmation email is worse than no link.
    expect(r.ok).toBe(true)
    expect(r.url).toBeNull()
  })

  it('separates a missing scope from an exhausted rate limit', async () => {
    reply(403, null, { 'x-ratelimit-remaining': '4999' })
    expect((await inviteToRepo({ repo: REPO, username: 'a' })).reason).toBe(
      'forbidden'
    )
    reply(403, null, { 'x-ratelimit-remaining': '0' })
    expect((await inviteToRepo({ repo: REPO, username: 'a' })).reason).toBe(
      'rate-limited'
    )
  })

  it('reports a missing token without calling GitHub', async () => {
    delete process.env.GITHUB_TOKEN
    global.fetch = vi.fn()
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    expect(r).toEqual({ ok: false, reason: 'not-configured' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refuses a repo that is not owner/repo before spending a request', async () => {
    global.fetch = vi.fn()
    for (const repo of [
      null,
      '',
      'warekit',
      'https://github.com/a/b',
      'a/b/c',
    ]) {
      const r = await inviteToRepo({ repo, username: 'octocat' })
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('no-repo')
    }
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refuses a missing username before spending a request', async () => {
    global.fetch = vi.fn()
    const r = await inviteToRepo({ repo: REPO, username: '   ' })
    expect(r).toEqual({ ok: false, reason: 'no-username' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('never throws when GitHub is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))
    // Thrown here, this would 500 a webhook for an order already captured.
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    expect(r).toEqual({ ok: false, reason: 'unreachable' })
  })

  it('reports 422 as rejected, not as a network problem', async () => {
    reply(422)
    const r = await inviteToRepo({ repo: REPO, username: 'octocat' })
    // 422 is the daily 50-invitation cap, or spam detection. Either way a
    // human has to finish the order, so it must not read as "try again".
    expect(r).toEqual({ ok: false, reason: 'rejected' })
  })

  it('reports 404 as not-found rather than pretending it worked', async () => {
    reply(404)
    const r = await inviteToRepo({ repo: REPO, username: 'ghost' })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not-found')
  })
})

describe('removeFromRepo', () => {
  it('removes a collaborator and reports it', async () => {
    reply(204)
    const result = await removeFromRepo({ repo: REPO, username: 'octocat' })
    expect(result).toEqual({ ok: true, state: 'removed' })
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/collaborators\/octocat$/)
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('cancels a pending invitation when the person never accepted', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 404,
        headers: { get: () => null },
        json: async () => null,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        json: async () => [{ id: 42, invitee: { login: 'OctoCat' } }],
      })
      .mockResolvedValueOnce({
        status: 204,
        headers: { get: () => null },
        json: async () => null,
      })
    const result = await removeFromRepo({ repo: REPO, username: 'octocat' })
    expect(result).toEqual({ ok: true, state: 'invitation-cancelled' })
    expect(global.fetch.mock.calls[2][0]).toMatch(/\/invitations\/42$/)
  })

  it('reports nothing-to-remove when there is neither access nor an invitation', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 404,
        headers: { get: () => null },
        json: async () => null,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        json: async () => [],
      })
    expect(await removeFromRepo({ repo: REPO, username: 'octocat' })).toEqual({
      ok: true,
      state: 'nothing-to-remove',
    })
  })

  it('never throws when GitHub is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      removeFromRepo({ repo: REPO, username: 'octocat' })
    ).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    })
  })
})

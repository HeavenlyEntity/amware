/*
 * Sends the repository invitation a boilerplate buyer paid for.
 *
 * Inviting is one call, `PUT /repos/{owner}/{repo}/collaborators/{username}`;
 * `removeFromRepo` below undoes it. The PUT answers 201 with an invitation
 * object when it creates one, and 204 with no body when the person is
 * already a collaborator -- which is not a failure and must not be reported
 * as one, because it is exactly what a second webhook delivery for the same
 * order looks like.
 *
 * Access is `pull`. A buyer needs to clone and fork the kit, never to push to
 * the product itself, and `push` is the default the API would otherwise pick
 * for you.
 *
 * GitHub caps this at 50 invitations per repository per 24 hours (no cap for
 * inviting existing organisation members, which buyers are not). At that
 * point it answers 422, the same status it uses for spam detection, so
 * `rejected` covers both -- and both mean the same thing operationally: this
 * order needs a human.
 *
 * Token: see docs/github-token.md. Fine-grained PATs need Administration
 * (write) on the kit repositories; classic PATs need `repo`.
 *
 * Nothing here throws. This runs inside a payment webhook, where an exception
 * means Whop retries an order that was already captured, and where GitHub
 * being unreachable says nothing about whether the sale was good. Every
 * failure comes back as a value so the caller can record the order, fall back
 * to the manual path, and tell the buyer the truth.
 */

const API = 'https://api.github.com'
const TIMEOUT_MS = 8000

/** Read access: clone and fork, never push to the product repository. */
const PERMISSION = 'pull'

export type InviteFailure =
  | 'not-configured' // no GITHUB_TOKEN, so we cannot invite anyone
  | 'no-repo' // the product names no repository
  | 'no-username' // the purchase carries no GitHub account
  | 'not-found' // repo or user gone, or the token cannot see the repo
  | 'forbidden' // token lacks the scope, or SSO is not authorised
  | 'rejected' // 422: invitation cap for the day, or spam detection
  | 'rate-limited'
  | 'unreachable' // timeout, DNS, GitHub 5xx

export type InviteResult =
  | { ok: true; state: 'invited'; url: string | null; id: number | null }
  | { ok: true; state: 'already-a-collaborator'; url: null; id: null }
  | { ok: false; reason: InviteFailure; detail?: string }

/** `owner/repo`, the shape the products collection stores. */
const REPO = /^[\w.-]+\/[\w.-]+$/

export async function inviteToRepo(args: {
  repo?: string | null
  username?: string | null
}): Promise<InviteResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, reason: 'not-configured' }

  const repo = args.repo?.trim()
  if (!repo || !REPO.test(repo)) {
    return { ok: false, reason: 'no-repo', detail: args.repo ?? undefined }
  }

  const username = args.username?.trim()
  if (!username) return { ok: false, reason: 'no-username' }

  let res: Response
  try {
    res = await fetch(
      `${API}/repos/${repo}/collaborators/${encodeURIComponent(username)}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission: PERMISSION }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    )
  } catch {
    return { ok: false, reason: 'unreachable' }
  }

  // 204: already a collaborator. The commonest cause is a retried webhook,
  // so treating it as success is what makes this safe to call twice.
  if (res.status === 204) {
    return { ok: true, state: 'already-a-collaborator', url: null, id: null }
  }

  if (res.status === 201) {
    const body = await res.json().catch(() => null)
    return {
      ok: true,
      state: 'invited',
      // Null rather than a guessed URL: a link that 404s is worse in an
      // email than no link at all.
      url: typeof body?.html_url === 'string' ? body.html_url : null,
      id: typeof body?.id === 'number' ? body.id : null,
    }
  }

  if (res.status === 404) return { ok: false, reason: 'not-found' }
  if (res.status === 403) {
    // GitHub returns 403 for both "no scope" and "you are out of requests";
    // the header is the only thing that separates them.
    const remaining = res.headers.get('x-ratelimit-remaining')
    return {
      ok: false,
      reason: remaining === '0' ? 'rate-limited' : 'forbidden',
    }
  }
  if (res.status === 429) return { ok: false, reason: 'rate-limited' }
  /* 422 is validation-failed OR spam detection OR the 50-a-day invitation
     cap. GitHub does not separate them, so neither do we -- it is reported
     honestly as rejected rather than dressed up as a network problem. */
  if (res.status === 422) return { ok: false, reason: 'rejected' }

  return { ok: false, reason: 'unreachable', detail: String(res.status) }
}

/* The inverse of inviteToRepo, for a licence that has ended.
 *
 * An invitation is not access, and removing a collaborator does not touch
 * one. So the collaborator is removed first, and then the pending
 * invitations are ALWAYS checked and the one for this login cancelled --
 * after a 204 as much as after a 404. GitHub documents 204, 403 and 422 for
 * the collaborator DELETE, never "you also cancelled their invitation", and
 * refunds land early, exactly when an invitation is most likely still
 * sitting there unaccepted.
 *
 * The result names the strongest thing that happened: `removed` when the
 * collaborator DELETE answered 204, else `invitation-cancelled`, else
 * `nothing-to-remove`. Any other collaborator status is a failure, and so is
 * an invitation list that cannot be read -- "nothing pending" is only ever
 * reported after looking.
 *
 * Like inviteToRepo, nothing here throws. It runs inside a webhook. */

export type RemoveResult =
  | {
      ok: true
      state: 'removed' | 'invitation-cancelled' | 'nothing-to-remove'
    }
  | { ok: false; reason: InviteFailure; detail?: string }

export async function removeFromRepo(args: {
  repo?: string | null
  username?: string | null
}): Promise<RemoveResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, reason: 'not-configured' }
  const repo = args.repo?.trim()
  if (!repo || !REPO.test(repo)) return { ok: false, reason: 'no-repo' }
  const username = args.username?.trim()
  if (!username) return { ok: false, reason: 'no-username' }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const call = (path: string, method = 'GET') =>
    fetch(`${API}${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

  try {
    const removed = await call(
      `/repos/${repo}/collaborators/${encodeURIComponent(username)}`,
      'DELETE'
    )
    // 204: was a collaborator, is not now. 404: never was one.
    if (removed.status !== 204 && removed.status !== 404) {
      return failure(removed)
    }

    const listed = await call(`/repos/${repo}/invitations?per_page=100`)
    if (listed.status !== 200) return failure(listed)
    const invitations: unknown = await listed.json().catch(() => null)
    if (!Array.isArray(invitations)) return { ok: false, reason: 'unreachable' }

    const login = username.toLowerCase()
    const pending = (
      invitations as Array<{
        id?: number
        invitee?: { login?: string } | null
      } | null>
    ).find((i) => i?.invitee?.login?.toLowerCase() === login)

    if (pending) {
      const cancelled = await call(
        `/repos/${repo}/invitations/${pending.id}`,
        'DELETE'
      )
      if (cancelled.status !== 204) return failure(cancelled)
    }

    if (removed.status === 204) return { ok: true, state: 'removed' }
    if (pending) return { ok: true, state: 'invitation-cancelled' }
    return { ok: true, state: 'nothing-to-remove' }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

function failure(res: Response): RemoveResult {
  if (res.status === 403) {
    return {
      ok: false,
      reason:
        res.headers.get('x-ratelimit-remaining') === '0'
          ? 'rate-limited'
          : 'forbidden',
    }
  }
  if (res.status === 429) return { ok: false, reason: 'rate-limited' }
  if (res.status === 404) return { ok: false, reason: 'not-found' }
  return { ok: false, reason: 'unreachable', detail: String(res.status) }
}

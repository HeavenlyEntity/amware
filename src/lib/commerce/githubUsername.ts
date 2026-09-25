/*
 * GitHub's own account-name rules, in one place because both sides need them:
 * the browser to give instant feedback, the server to re-check a submission it
 * cannot trust.
 *
 * Alphanumerics and single hyphens, never leading or trailing, 39 characters
 * at most. The lookahead is what forbids a doubled hyphen: a hyphen is only
 * allowed when another alphanumeric follows it, which also rules out a
 * trailing one without a second pattern.
 *
 * Deliberately no network call. Format is decidable offline, and rejecting a
 * malformed name here means never spending a GitHub request on input that
 * could not match an account anyway.
 */
const PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** Shared with the input's `pattern` attribute for native browser validation. */
export const GITHUB_USERNAME_PATTERN = PATTERN.source
export const GITHUB_USERNAME_MAX = 39

export type UsernameProblem = 'empty' | 'too-long' | 'malformed' | null

export function checkGithubUsername(raw: string): UsernameProblem {
  const value = raw.trim()
  if (!value) return 'empty'
  if (value.length > GITHUB_USERNAME_MAX) return 'too-long'
  return PATTERN.test(value) ? null : 'malformed'
}

/* Messages say what is wrong and what to do, rather than "invalid input". */
export function usernameMessage(problem: UsernameProblem): string | null {
  switch (problem) {
    case 'empty':
      return 'Enter the GitHub username that should receive repository access.'
    case 'too-long':
      return `GitHub usernames are at most ${GITHUB_USERNAME_MAX} characters.`
    case 'malformed':
      return 'Use letters, numbers and single hyphens only. No spaces, and not starting or ending with a hyphen.'
    default:
      return null
  }
}

/* A profile URL, optionally with its scheme, `www.`, a trailing slash, or a
   query or fragment. One path segment only: a repository URL names a
   repository, not the account to invite. */
const PROFILE_URL =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i

/*
 * The login in what a buyer typed into Whop's "GitHub username" field.
 *
 * Our own form rejects these shapes with checkGithubUsername, but Whop's
 * custom field is free text with nothing of ours in front of it. Two habits
 * are common enough to undo rather than send to a human: the leading @ of a
 * mention, and a pasted profile URL. Anything else is left as typed --
 * guessing further risks inviting the wrong account, while a malformed name
 * simply fails the invitation and lands in the manual queue.
 */
export function githubLoginFromAnswer(
  answer: string | null | undefined
): string | null {
  if (typeof answer !== 'string') return null
  const typed = answer.trim().replace(/^@/, '')
  const login = PROFILE_URL.exec(typed)?.[1] ?? typed
  return login || null
}

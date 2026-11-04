/*
 * Seat accounting for a license.
 *
 * Kept as pure functions over plain data, deliberately. The interesting part
 * of a seat limit is not the invitation, it is deciding whether this account
 * is allowed one -- and that decision has to survive a buyer refreshing the
 * page twice, adding someone who is already on the license, and changing the
 * capitalisation of a username. None of that needs a database to test.
 *
 * The used seats live on the license, and so does the limit's source: the
 * caller reads it with `licenseLimits` and passes the number in. A product
 * with no `seats` recorded is a single-seat license: every Lite and Pro sale
 * predates this field, and treating an absent limit as unlimited would give
 * away exactly the thing being sold.
 */

export type SeatMember = {
  githubUsername?: string | null
  inviteUrl?: string | null
  addedAt?: string | null
}

export type SeatVerdict =
  | { allowed: true; reason: 'new' }
  /* Already on the license: not an error. Re-inviting is how someone who
     never accepted gets another chance, and it must not cost a seat. */
  | { allowed: true; reason: 'already-a-member' }
  | { allowed: false; reason: 'license-full'; used: number; limit: number }

/** A license always has at least one seat, even if the product forgot to say. */
export function seatLimit(product: { seats?: number | null } | null): number {
  const n = product?.seats
  return typeof n === 'number' && n >= 1 ? Math.floor(n) : 1
}

/** GitHub usernames are case-insensitive; two spellings are one person. */
const key = (name?: string | null) => (name || '').trim().toLowerCase()

export function seatsUsed(members: SeatMember[] | null | undefined): number {
  return listSeats(members).length
}

/** Deduplicated, in the order they were added. */
export function listSeats(members: SeatMember[] | null | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of members || []) {
    const k = key(m?.githubUsername)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push((m.githubUsername || '').trim())
  }
  return out
}

export function hasSeat(
  members: SeatMember[] | null | undefined,
  username: string
): boolean {
  const k = key(username)
  return !!k && listSeats(members).some((n) => key(n) === k)
}

/**
 * `limit` is the license's developer limit, from `licenseLimits`. A limit that
 * is not a number of at least one is read as one, never as unlimited.
 */
export function canAddSeat(
  members: SeatMember[] | null | undefined,
  username: string,
  limit: number
): SeatVerdict {
  if (hasSeat(members, username)) {
    return { allowed: true, reason: 'already-a-member' }
  }
  const used = seatsUsed(members)
  const cap = seatLimit({ seats: limit })
  if (used >= cap) {
    return { allowed: false, reason: 'license-full', used, limit: cap }
  }
  return { allowed: true, reason: 'new' }
}

export function seatsFullMessage(used: number, limit: number): string {
  return `This license covers ${limit} ${
    limit === 1 ? 'developer' : 'developers'
  } and all ${used} ${
    used === 1 ? 'is' : 'are'
  } in use. Remove someone below, or see your options above.`
}

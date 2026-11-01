import { describe, expect, it } from 'vitest'

/* Relative import: the engine project defines no `@/` alias, and this module
   reaches nothing at all. */
import {
  canAddSeat,
  hasSeat,
  listSeats,
  seatLimit,
  seatsFullMessage,
  seatsUsed,
} from '../seats'

const members = (...names) =>
  names.map((githubUsername) => ({ githubUsername }))

describe('seatLimit', () => {
  it('reads the limit off the product', () => {
    expect(seatLimit({ seats: 5 })).toBe(5)
  })

  /* Every Lite and Pro sale predates this field. Treating an absent limit as
     unlimited would give away the exact thing Team is selling. */
  it('treats a missing limit as one seat, never as unlimited', () => {
    expect(seatLimit({})).toBe(1)
    expect(seatLimit(null)).toBe(1)
    expect(seatLimit({ seats: null })).toBe(1)
    expect(seatLimit({ seats: 0 })).toBe(1)
    expect(seatLimit({ seats: -3 })).toBe(1)
  })
})

describe('counting seats', () => {
  it('counts members', () => {
    expect(seatsUsed(members('a', 'b'))).toBe(2)
    expect(seatsUsed([])).toBe(0)
    expect(seatsUsed(null)).toBe(0)
  })

  it('counts one person once, however they capitalised it', () => {
    // GitHub usernames are case-insensitive. Two spellings are one seat.
    expect(seatsUsed(members('OctoCat', 'octocat', 'OCTOCAT'))).toBe(1)
    expect(listSeats(members('OctoCat', 'octocat'))).toEqual(['OctoCat'])
  })

  it('ignores blank rows rather than billing a seat for them', () => {
    expect(
      seatsUsed([{ githubUsername: '' }, { githubUsername: '  ' }, {}])
    ).toBe(0)
  })

  it('trims before comparing, so a stray space is not a second seat', () => {
    expect(seatsUsed(members('octocat', '  octocat  '))).toBe(1)
  })
})

describe('hasSeat', () => {
  it('matches case-insensitively', () => {
    expect(hasSeat(members('OctoCat'), 'octocat')).toBe(true)
    expect(hasSeat(members('octocat'), 'OCTOCAT')).toBe(true)
  })

  it('is false for an empty name rather than matching a blank row', () => {
    expect(hasSeat(members('octocat'), '')).toBe(false)
    expect(hasSeat([{ githubUsername: '' }], '')).toBe(false)
  })
})

describe('canAddSeat', () => {
  it('allows a new account while the license has room', () => {
    expect(canAddSeat(members('a', 'b'), 'c', 5)).toEqual({
      allowed: true,
      reason: 'new',
    })
  })

  it('allows the last seat exactly, and refuses the one after', () => {
    const four = members('a', 'b', 'c', 'd')
    expect(canAddSeat(four, 'e', 5).allowed).toBe(true)
    expect(canAddSeat([...four, { githubUsername: 'e' }], 'f', 5)).toEqual({
      allowed: false,
      reason: 'license-full',
      used: 5,
      limit: 5,
    })
  })

  /* Re-adding someone already on the license must not cost a seat. It is how
     a person who never accepted their invitation gets another one, and a team
     of five would otherwise lock itself out by retrying. */
  it('lets an existing member through without spending a seat', () => {
    const full = members('a', 'b', 'c', 'd', 'e')
    expect(canAddSeat(full, 'a', 5)).toEqual({
      allowed: true,
      reason: 'already-a-member',
    })
    expect(canAddSeat(full, 'A', 5).allowed).toBe(true)
  })

  it('refuses a second account on a single-seat license', () => {
    expect(canAddSeat(members('a'), 'b', 1)).toMatchObject({
      allowed: false,
      limit: 1,
    })
    // But the buyer themselves can always be re-invited.
    expect(canAddSeat(members('a'), 'a', 1).allowed).toBe(true)
  })

  it('allows the first seat on an empty license', () => {
    expect(canAddSeat([], 'a', 1).allowed).toBe(true)
    expect(canAddSeat(null, 'a', 5).allowed).toBe(true)
  })
})

describe('canAddSeat — the limit is a number from the license', () => {
  it('reads a limit that is not a real number as one seat, never unlimited', () => {
    expect(canAddSeat(members('a'), 'b', undefined).allowed).toBe(false)
    expect(canAddSeat(members('a'), 'b', NaN).allowed).toBe(false)
    expect(canAddSeat(members('a'), 'b', 0).allowed).toBe(false)
  })

  it('honours a limit that is not a tier default, such as an Enterprise override', () => {
    const twelve = members(...'abcdefghijk'.split(''))
    expect(canAddSeat(twelve, 'z', 12).allowed).toBe(true)
    expect(canAddSeat(twelve, 'z', 11)).toMatchObject({
      allowed: false,
      used: 11,
      limit: 11,
    })
  })
})

describe('seatsFullMessage', () => {
  it('says what to do, not just that it is full', () => {
    expect(seatsFullMessage(5, 5)).toBe(
      'This license covers 5 developers and all 5 are in use. Remove someone below, or see your options above.'
    )
  })

  it('reads correctly for a single seat', () => {
    expect(seatsFullMessage(1, 1)).toBe(
      'This license covers 1 developer and all 1 is in use. Remove someone below, or see your options above.'
    )
  })
})

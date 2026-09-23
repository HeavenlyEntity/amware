import { describe, expect, it } from 'vitest'
import { MAX_ATTEMPTS } from '../pendingRefresh'

/* Both return pages compare the attempt count against this bound while they
   render on the server. It lives in a plain module because every export of
   a 'use client' module reaches a server component as a client reference --
   a function -- and a number compared with one is always false: the
   automatic re-check never rendered while the bound lived in
   PendingRefresh.jsx. */
describe('MAX_ATTEMPTS', () => {
  it('is a plain number the server can compare the attempt count against', () => {
    expect(typeof MAX_ATTEMPTS).toBe('number')
    expect(MAX_ATTEMPTS).toBe(6)
  })
})

import { describe, expect, it } from 'vitest'

import { EXAMPLE } from '../benchmarks.js'
import { SLIDER_TRACKS } from '../bounds.js'
import { computeRead, positionFor as enginePositionFor } from '../engine.js'
import { gapFor, positionFor } from '../position.js'

/* The desk landing's slider runs `position.js` in the browser instead of the
   engine. These hold the two together at every stop on the slider's track, so
   the pill on the landing can never say something the calculator would not. */

const track = SLIDER_TRACKS.offeredEquityPct
const stops = []
for (let v = track.min; v <= track.max; v += track.step) stops.push(v)

describe('position.js matches the engine across the desk slider', () => {
  it('covers the whole track', () => {
    expect(stops[0]).toBe(0)
    expect(stops[stops.length - 1]).toBe(30)
    expect(stops).toHaveLength(61)
  })

  it.each(stops)('agrees with computeRead at %s%%', (pct) => {
    const read = computeRead({ ...EXAMPLE, offeredEquityPct: pct })
    const { range } = read.offer
    expect(positionFor(pct, range, false)).toBe(read.offer.position)
    const gap = gapFor(pct, range)
    expect(gap.below).toEqual(read.offer.gapPts)
    if (read.offer.position === 'above') {
      expect(gap.above).toBe(Number((pct - range.hi).toFixed(2)))
    } else {
      expect(gap.above).toBeNull()
    }
  })

  it('keeps the band fixed while only the offer moves', () => {
    /* Why the landing can ship the band once: it depends on the work, not on
       what was offered. If that ever changes, the slider needs the engine. */
    const ranges = stops.map((pct) => {
      const { lo, hi } = computeRead({
        ...EXAMPLE,
        offeredEquityPct: pct,
      }).offer.range
      return `${lo}-${hi}`
    })
    expect(new Set(ranges).size).toBe(1)
  })

  it('is the same function the engine exports', () => {
    expect(enginePositionFor).toBe(positionFor)
  })
})

describe('gapFor', () => {
  const range = { lo: 8.5, hi: 15.5 }

  it('measures below the band to both edges', () => {
    expect(gapFor(3, range)).toEqual({ below: [5.5, 12.5], above: null })
  })

  it('is empty inside the band, edges included', () => {
    expect(gapFor(8.5, range)).toEqual({ below: null, above: null })
    expect(gapFor(15.5, range)).toEqual({ below: null, above: null })
  })

  it('measures above the band past the top', () => {
    expect(gapFor(20, range)).toEqual({ below: null, above: 4.5 })
  })

  it('has nothing to say without an offer', () => {
    expect(gapFor(null, range)).toEqual({ below: null, above: null })
  })
})

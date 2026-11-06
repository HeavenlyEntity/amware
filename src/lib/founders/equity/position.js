/*
 * Where an offered percent sits against a rounded range, and by how much.
 *
 * Pure and import-free on purpose: the desk landing's slider runs this in the
 * browser, and importing it from `engine.js` would ship the whole engine (the
 * benchmarks, dilution, scenarios) to every visitor for two comparisons. The
 * engine imports it from here, so there is one definition, and
 * `__tests__/position.test.js` holds the two together across the slider's
 * whole track.
 */

const round2 = (n) => Number(n.toFixed(2))

/**
 * Position the offer against the rounded range.
 * @param {number|null} pct
 * @param {{ lo: number, hi: number }} range
 * @param {boolean} pending true when the class is still unknown
 * @returns {'below'|'within'|'above'|'unknown'}
 */
export function positionFor(pct, range, pending) {
  if (pct === null || pending) return 'unknown'
  if (pct < range.lo) return 'below'
  if (pct > range.hi) return 'above'
  return 'within'
}

/**
 * The distance from the offer to the band, in points.
 * `below` is `[to the floor, to the top]` (the engine's `gapPts`), `above` is
 * how far past the top it sits. Whichever does not apply is null.
 * @param {number|null} pct
 * @param {{ lo: number, hi: number }} range
 * @returns {{ below: readonly [number, number]|null, above: number|null }}
 */
export function gapFor(pct, range) {
  if (pct === null || pct === undefined) return { below: null, above: null }
  return {
    below:
      pct < range.lo
        ? Object.freeze([round2(range.lo - pct), round2(range.hi - pct)])
        : null,
    above: pct > range.hi ? round2(pct - range.hi) : null,
  }
}

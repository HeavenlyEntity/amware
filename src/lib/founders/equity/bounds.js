/*
 * Numeric bounds for every engine input. Required fields fall back to
 * `default` when blank; optional fields become `null` (and `0` is a value).
 * `marketSalary` and `roundsBeforeExit` have contextual defaults resolved in
 * normalize.js (role × stage table, per path), so their `default` is null here.
 */

const bound = (min, max, def, optional) =>
  Object.freeze({ min, max, default: def, optional })

export const BOUNDS = Object.freeze({
  months: bound(0, 120, 6, false),
  hoursPerWeek: bound(0, 80, 10, false),
  ratePerHour: bound(0, 1000, 150, false),
  feesBilled: bound(0, 5_000_000, 0, false),
  marketSalary: bound(0, 2_000_000, null, false),
  offeredSalary: bound(0, 2_000_000, null, true),
  offeredEquityPct: bound(0, 100, null, true),
  optionCount: bound(0, 1e12, null, true),
  fullyDilutedShares: bound(0, 1e12, null, true),
  strikePrice: bound(0, 10_000, null, true),
  founders: bound(1, 6, 2, false),
  vestingYears: bound(1, 10, 4, false),
  cliffMonths: bound(0, 24, 12, false),
  roundsBeforeExit: bound(0, 6, null, true),
  accelerationTerminationMonths: bound(0, 24, 0, false),
  severanceMonths: bound(0, 24, 0, false),
})

const tick = (value, label) => Object.freeze({ value, label })

/*
 * Slider tracks are narrower than the engine bounds: the paired number input
 * clamps to BOUNDS, the slider pins at its own max and shows `pinSuffix`.
 */
export const SLIDER_TRACKS = Object.freeze({
  months: Object.freeze({
    min: 0,
    max: 36,
    step: 1,
    unit: 'mo',
    pinSuffix: '+',
    ticks: Object.freeze([tick(0, '0'), tick(12, '12'), tick(24, '24')]),
  }),
  hoursPerWeek: Object.freeze({
    min: 0,
    max: 60,
    step: 1,
    unit: 'h',
    pinSuffix: '+',
    ticks: Object.freeze([tick(0, '0'), tick(20, '20'), tick(40, '40')]),
  }),
  ratePerHour: Object.freeze({
    min: 50,
    max: 500,
    step: 5,
    unit: '$/h',
    pinSuffix: '+',
    ticks: Object.freeze([
      tick(50, '$50'),
      tick(250, '$250'),
      tick(450, '$450+'),
    ]),
  }),
  marketSalary: Object.freeze({
    min: 60_000,
    max: 400_000,
    step: 5_000,
    unit: '$',
    pinSuffix: '+',
    ticks: Object.freeze([
      tick(60_000, '$60k'),
      tick(200_000, '$200k'),
      tick(400_000, '$400k+'),
    ]),
  }),
  /* The desk landing's "try a different offer" slider, and the axis its gap
     figure draws: 0 to 30 percent covers every band the engine can produce at
     the example's stage with room either side. Presentational only; the
     engine's own bound on the field stays 0 to 100. */
  offeredEquityPct: Object.freeze({
    min: 0,
    max: 30,
    step: 0.5,
    unit: '%',
    pinSuffix: '',
    ticks: Object.freeze([tick(0, '0%'), tick(15, '15%'), tick(30, '30%')]),
  }),
})

/**
 * Clamp a finite number into a field's bounds.
 * @param {number} value
 * @param {{ min: number, max: number }} b
 * @returns {number}
 */
export function clampTo(value, b) {
  return Math.min(b.max, Math.max(b.min, value))
}

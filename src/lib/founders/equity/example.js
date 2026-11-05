/* The worked example on its own, with no imports, so client code that needs
   only the example (the desk dock's "Open with the worked example") does not
   pull the benchmark tables into its bundle. `benchmarks.js` re-exports it, so
   every existing import keeps working. */

/*
 * The canonical hero example: a fractional CTO converting at pre-seed, offered
 * 3% against the founding-executive band of 8–15. Hours were fully billed and
 * salary is at market, so no adjustment moves the band.
 */
export const EXAMPLE = Object.freeze({
  role: 'cto',
  joining: 'fractional_conversion',
  founders: 2,
  stage: 'preseed',
  path: 'ipo',
  fullTimeOnSigning: true,
  finalTechnicalSay: true,
  responsibilities: Object.freeze([
    'architecture',
    'shipped_mvp',
    'owned_roadmap',
    'infra_oncall',
    'investor_diligence',
  ]),
  months: 8,
  hoursPerWeek: 10,
  ratePerHour: 150,
  feesBilled: 52_000,
  /* marketSalary is deliberately absent: it resolves from the researched
     hired band via marketSalaryFor(), so the example can never drift from the
     data the rest of the desk cites. Design review DD4. */
  offeredSalary: 120_000,
  offerMode: 'percent',
  offeredEquityPct: 3,
  optionCount: null,
  fullyDilutedShares: null,
  strikePrice: null,
  instrument: 'options',
  vestingYears: 4,
  cliffMonths: 12,
})

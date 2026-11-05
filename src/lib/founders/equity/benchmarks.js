/*
 * Founders' Desk — versioned benchmark data for the equity engine.
 *
 * Every band row carries { lo, hi, source, asOf, confidence } so the results
 * screen can print provenance inline. Values are fully diluted percent unless
 * noted. This file is data only: no logic, no imports.
 */

export const BENCHMARKS_UPDATED_AT = '2026-09'

export const ROLES = Object.freeze(['cto', 'engineer', 'ceo_builder'])
export const JOINING = Object.freeze([
  'formation',
  'fractional_conversion',
  'hired_after',
])
/* Canonical stage keys. `idea` is accepted as input and maps to `preseed`. */
export const STAGES = Object.freeze([
  'preseed',
  'seed',
  'series_a',
  'series_b_plus',
])
export const STAGE_ALIASES = Object.freeze({ idea: 'preseed' })
export const STAGE_ORDER = Object.freeze({
  preseed: 0,
  seed: 1,
  series_a: 2,
  series_b_plus: 3,
})
export const PATHS = Object.freeze([
  'bootstrap',
  'acquisition',
  'ipo',
  'unknown',
])
export const CLASSES = Object.freeze([
  'founder',
  'founding_executive',
  'hired_executive',
  'hire',
])
export const INSTRUMENTS = Object.freeze([
  'options',
  'restricted_stock',
  'unsure',
])
export const OFFER_MODES = Object.freeze(['percent', 'shares'])
export const EXERCISE_WINDOWS = Object.freeze([
  'days_90',
  'months_6',
  'year_1',
  'extended',
  'unsure',
])
export const ACCELERATION_COC = Object.freeze([
  'none',
  'single',
  'double',
  'unsure',
])
export const REPURCHASE_VESTED = Object.freeze([
  'none',
  'fmv_any',
  'cost_for_cause',
  'unsure',
])

/*
 * "If it ends": leaver terms and how the market sets them.
 * - Post-termination exercise window: ~82% of companies use ~90 days (the
 *   ISO rule); extended windows (6 months to 10 years) are a negotiated
 *   minority (Carta PTEP data, 2024).
 * - Acceleration: 38% of founder agreements at Series A+ carry some form,
 *   14% single-trigger, 24% double-trigger (Carta 2025, via secondary).
 * - Repurchase rights on vested shares are the good-/bad-leaver clause:
 *   FMV for good leavers, cost or nominal for bad leavers (Cooley GO, NVCA
 *   model Stock Restriction Agreement; Ashfords leaver provisions, 2025).
 * - Severance: minimal and ad hoc at seed/A; 6–12 months of base for the
 *   C-suite from Series C onward (Sequoia executive severance guide, 2025).
 */
export const LEAVER = Object.freeze({
  standard: Object.freeze({
    exerciseWindow: 'days_90',
    accelerationCoC: 'none',
    accelerationTerminationMonths: 0,
    repurchaseVested: 'none',
    severanceMonths: 0,
  }),
  exerciseWindow: Object.freeze({
    days: Object.freeze({
      days_90: 90,
      months_6: 182,
      year_1: 365,
      extended: 3650,
      unsure: null,
      na: null,
    }),
    labels: Object.freeze({
      days_90: '90 days (the default)',
      months_6: '6 months',
      year_1: '1 year',
      extended: 'Extended (5–10 years)',
      unsure: 'Not sure',
      na: 'No window: restricted stock is owned once vested',
    }),
    prevalence: '82% of companies use a window of 89–92 days',
    source: 'carta_ptep',
  }),
  acceleration: Object.freeze({
    labels: Object.freeze({
      none: 'None',
      single: 'Single trigger (vests on a change of control)',
      double: 'Double trigger (vests if terminated after a change of control)',
      unsure: 'Not sure',
    }),
    prevalence: Object.freeze({ any: 38, single: 14, double: 24 }),
    source: 'carta_accel',
  }),
  repurchase: Object.freeze({
    labels: Object.freeze({
      none: 'None: vested shares are mine when I leave',
      fmv_any: 'Company can buy back vested shares at fair market value',
      cost_for_cause:
        'Bad-leaver clause: buy back at cost if terminated for cause',
      unsure: 'Not sure',
    }),
    exposure: Object.freeze({
      none: 'Vested shares are yours after you leave; the company has no right to buy them back.',
      fmv_any:
        'The company can buy back your vested shares at fair market value when you leave, so you may not get to hold them to the exit.',
      cost_for_cause:
        'A for-cause departure lets the company buy vested shares at cost or nominal value; make sure “cause” is defined narrowly in the agreement.',
      unsure:
        'Ask whether there is a repurchase right on vested shares and at what price.',
    }),
    source: 'cooley_leaver',
  }),
  severance: Object.freeze({
    standard: Object.freeze({
      preseed: 0,
      seed: 0,
      series_a: 0,
      series_b_plus: 6,
    }),
    note: 'Cash severance is ad hoc before Series C; 6–12 months of base for the C-suite later.',
    source: 'sequoia_severance',
  }),
})

export const LABELS = Object.freeze({
  role: Object.freeze({
    cto: 'CTO',
    engineer: 'Software engineer',
    ceo_builder: 'CEO who builds',
  }),
  stage: Object.freeze({
    idea: 'idea',
    preseed: 'pre-seed',
    seed: 'seed',
    series_a: 'Series A',
    series_b_plus: 'Series B+',
  }),
  class: Object.freeze({
    founder: 'Founder',
    founding_executive: 'Founding executive',
    hired_executive: 'Hired executive',
    hire: 'Hire',
    unknown: 'Possible range',
  }),
  path: Object.freeze({
    bootstrap: 'Bootstrap or hold',
    acquisition: 'Acquisition',
    ipo: 'IPO',
    unknown: "Don't know",
  }),
  joining: Object.freeze({
    formation: 'Co-founding at formation',
    fractional_conversion: 'Converting from fractional or contract',
    hired_after: 'Hired after formation',
  }),
  exerciseWindow: Object.freeze({
    days_90: '90 days',
    months_6: '6 months',
    year_1: '1 year',
    extended: '5–10 years',
    unsure: 'unknown',
    na: 'n/a (restricted stock)',
  }),
  accelerationCoC: Object.freeze({
    none: 'none',
    single: 'single trigger',
    double: 'double trigger',
    unsure: 'unknown',
  }),
  repurchaseVested: Object.freeze({
    none: 'none',
    fmv_any: 'FMV on any departure',
    cost_for_cause: 'cost for cause',
    unsure: 'unknown',
  }),
})

/* Sources referenced by the rows below. `asOf` is the publication year/month. */
export const SOURCES = Object.freeze([
  Object.freeze({
    id: 'carta',
    name: 'Carta founder equity medians',
    asOf: '2026',
    url: 'https://carta.com/data/founder-ownership-2026/',
  }),
  Object.freeze({
    id: 'yc',
    name: 'Y Combinator, how to split equity among co-founders',
    asOf: '2025',
    url: 'https://www.ycombinator.com/library/5x-how-to-split-equity-among-co-founders',
  }),
  Object.freeze({
    id: 'carta_ptep',
    name: 'Carta, post-termination exercise periods',
    asOf: '2024',
    url: 'https://carta.com/learn/equity/leaving-company/post-termination-exercise-period/',
  }),
  Object.freeze({
    id: 'carta_accel',
    name: 'Carta founder acceleration data (via secondary reporting)',
    asOf: '2025',
    url: 'https://carta.com/learn/startups/compensation/golden-parachute/',
  }),
  Object.freeze({
    id: 'cooley_leaver',
    name: 'Cooley GO / NVCA model docs, leaver and repurchase provisions',
    asOf: '2025',
    url: 'https://www.cooleygo.com/what-are-single-and-double-trigger-acceleration-and-how-do-they-work/',
  }),
  Object.freeze({
    id: 'sequoia_severance',
    name: 'Sequoia, executive severance guide',
    asOf: '2025',
    url: 'https://www.sequoia.com/2025/06/executive-severance-package/',
  }),
  Object.freeze({
    id: 'index',
    name: 'Index Ventures, Rewarding Talent',
    asOf: '2025',
    url: 'https://www.indexventures.com/rewarding-talent/allocation-considerations-and-benchmarks',
  }),
  Object.freeze({
    id: 'ravio',
    name: 'Ravio Equity Report',
    asOf: '2026',
    url: 'https://ravio.com/blog/startup-salaries',
  }),
  Object.freeze({
    id: 'founder_math',
    name: 'founder-math CTO benchmarks',
    asOf: '2026',
  }),
  Object.freeze({
    id: 'soc',
    name: 'Stock Option Counsel',
    asOf: '2025',
    url: 'https://www.stockoptioncounsel.com/blog/startup-compensation-data-sources',
  }),
  Object.freeze({
    id: 'equitylist',
    name: 'EquityList / Alumni Founders (Carta relay)',
    asOf: '2026',
  }),
  Object.freeze({ id: 'kore1', name: 'Kore1 salary guide', asOf: '2026' }),
  Object.freeze({
    id: 'amware',
    name: 'AMWARE inference from adjacent rows',
    asOf: BENCHMARKS_UPDATED_AT,
  }),
])

/*
 * Founding-team pool by stage: the fully diluted percent the founding team
 * holds after the last closed priced round.
 */
export const TEAM_POOL = Object.freeze({
  preseed: Object.freeze({
    value: 90,
    source: 'EquityList / Index (after a ~10% option pool)',
    asOf: '2026',
    confidence: 'inferred',
  }),
  seed: Object.freeze({
    value: 56,
    source: 'Carta 2026',
    asOf: '2026',
    confidence: 'sourced',
  }),
  series_a: Object.freeze({
    value: 36,
    source: 'Carta 2026',
    asOf: '2026',
    confidence: 'sourced',
  }),
  series_b_plus: Object.freeze({
    value: 27,
    source: 'Carta 2026 (AI-team median; inferred for general)',
    asOf: '2026',
    confidence: 'inferred',
  }),
})

const row = (lo, hi, source, asOf, confidence) =>
  Object.freeze({ lo, hi, source, asOf, confidence })

const CTO_SRC =
  'Index Ventures / Ravio 2026 / founder-math / Stock Option Counsel'
const INFERRED_SRC = 'AMWARE inference from CTO rows and Carta medians'

/* Non-founder bands: role → class → stage. */
export const NON_FOUNDER_BANDS = Object.freeze({
  cto: Object.freeze({
    founding_executive: Object.freeze({
      preseed: row(8, 15, CTO_SRC, '2026', 'sourced'),
      seed: row(4, 8, CTO_SRC, '2026', 'sourced'),
      series_a: row(2, 4, CTO_SRC, '2026', 'sourced'),
      series_b_plus: row(1, 2, CTO_SRC, '2026', 'sourced'),
    }),
    hired_executive: Object.freeze({
      preseed: row(3, 6, CTO_SRC, '2026', 'sourced'),
      seed: row(1, 5, CTO_SRC, '2026', 'sourced'),
      series_a: row(1, 3, CTO_SRC, '2026', 'sourced'),
      series_b_plus: row(0.5, 1.5, CTO_SRC, '2026', 'sourced'),
    }),
    hire: Object.freeze({
      preseed: row(0.5, 1.5, CTO_SRC, '2026', 'sourced'),
      seed: row(0.25, 0.75, CTO_SRC, '2026', 'sourced'),
      series_a: row(0.1, 0.5, CTO_SRC, '2026', 'sourced'),
      series_b_plus: row(0.05, 0.25, CTO_SRC, '2026', 'sourced'),
    }),
  }),
  engineer: Object.freeze({
    founding_executive: Object.freeze({
      preseed: row(3, 7, INFERRED_SRC, '2026', 'inferred'),
      seed: row(1, 3, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(0.5, 1.5, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(0.25, 0.75, INFERRED_SRC, '2026', 'inferred'),
    }),
    hired_executive: Object.freeze({
      preseed: row(1, 2, INFERRED_SRC, '2026', 'inferred'),
      seed: row(0.5, 1, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(0.2, 0.6, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(0.1, 0.3, INFERRED_SRC, '2026', 'inferred'),
    }),
    hire: Object.freeze({
      preseed: row(0.5, 1, INFERRED_SRC, '2026', 'inferred'),
      seed: row(0.2, 0.5, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(0.1, 0.25, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(0.05, 0.15, INFERRED_SRC, '2026', 'inferred'),
    }),
  }),
  ceo_builder: Object.freeze({
    founding_executive: Object.freeze({
      preseed: row(10, 20, INFERRED_SRC, '2026', 'inferred'),
      seed: row(5, 10, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(3, 5, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(1.5, 3, INFERRED_SRC, '2026', 'inferred'),
    }),
    hired_executive: Object.freeze({
      preseed: row(3, 6, INFERRED_SRC, '2026', 'inferred'),
      seed: row(1, 5, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(1, 3, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(0.5, 1.5, INFERRED_SRC, '2026', 'inferred'),
    }),
    hire: Object.freeze({
      preseed: row(0.5, 1.5, INFERRED_SRC, '2026', 'inferred'),
      seed: row(0.25, 0.75, INFERRED_SRC, '2026', 'inferred'),
      series_a: row(0.1, 0.5, INFERRED_SRC, '2026', 'inferred'),
      series_b_plus: row(0.05, 0.25, INFERRED_SRC, '2026', 'inferred'),
    }),
  }),
})

const chip = (id, label, weight) => Object.freeze({ id, label, weight })

/* Responsibility chips per role. Every set sums to 8.5. */
export const CHIPS = Object.freeze({
  cto: Object.freeze([
    chip('architecture', 'Designed the architecture', 1),
    chip('shipped_mvp', 'Shipped the MVP', 1.5),
    chip('hired_engineers', 'Hired engineers', 1),
    chip('owned_roadmap', 'Owned the roadmap', 1),
    chip('infra_oncall', 'Ran infra and on-call', 0.5),
    chip('investor_diligence', 'Investor / tech diligence', 1),
    chip('ops_vendors', 'Ops: vendors and contracts', 1),
    chip('capital_in', 'Put personal capital in', 1.5),
  ]),
  engineer: Object.freeze([
    chip('architecture', 'Designed the architecture', 1.5),
    chip('shipped_mvp', 'Shipped the MVP', 1.5),
    chip('owned_product_area', 'Owned a product area end to end', 1),
    chip('infra_oncall', 'Ran infra and on-call', 1),
    chip('hired_mentored', 'Hired or mentored engineers', 1),
    chip('customer_support', 'Customer-facing support', 0.5),
    chip('ops_vendors', 'Ops: vendors and contracts', 0.5),
    chip('capital_in', 'Put personal capital in', 1.5),
  ]),
  ceo_builder: Object.freeze([
    chip('wrote_product', 'Wrote the product', 1.5),
    chip('shipped_mvp', 'Shipped the MVP', 1),
    chip('fundraising', 'Fundraising and investor relations', 1.5),
    chip('sales_first_customers', 'Sales and first customers', 1),
    chip('hired_team', 'Hired the team', 1),
    chip('ops_finance_legal', 'Ops: finance, legal, vendors', 1),
    chip('capital_in', 'Put personal capital in', 1.5),
  ]),
})

/* Salary ⇄ equity exchange rate by stage: every unitDollars ≈ unitPts. */
export const EXCHANGE_RATES = Object.freeze({
  preseed: Object.freeze({ unitDollars: 50_000, unitPts: 0.75 }),
  seed: Object.freeze({ unitDollars: 50_000, unitPts: 0.5 }),
  series_a: Object.freeze({ unitDollars: 100_000, unitPts: 0.75 }),
  series_b_plus: Object.freeze({ unitDollars: 100_000, unitPts: 0.4 }),
})

/* Per-round median dilution (option-pool refresh included). Carta 2026 / Index. */
export const DILUTION_ROUNDS = Object.freeze({
  seed: Object.freeze({ id: 'seed', label: 'Seed', d: 0.2 }),
  series_a: Object.freeze({ id: 'series_a', label: 'Series A', d: 0.25 }),
  series_b: Object.freeze({ id: 'series_b', label: 'Series B', d: 0.18 }),
  series_c: Object.freeze({ id: 'series_c', label: 'Series C', d: 0.15 }),
  series_d: Object.freeze({ id: 'series_d', label: 'Series D', d: 0.12 }),
  ipo: Object.freeze({ id: 'ipo', label: 'IPO', d: 0.15 }),
})

/* Rounds still ahead of the company, by the last closed priced round. */
export const REMAINING_ROUNDS = Object.freeze({
  preseed: Object.freeze([
    'seed',
    'series_a',
    'series_b',
    'series_c',
    'series_d',
    'ipo',
  ]),
  seed: Object.freeze(['series_a', 'series_b', 'series_c', 'series_d', 'ipo']),
  series_a: Object.freeze(['series_b', 'series_c', 'series_d', 'ipo']),
  series_b_plus: Object.freeze(['series_c', 'series_d', 'ipo']),
})

/* Exit valuations (USD) per path. `unknown` uses the acquisition set. */
export const SCENARIO_VALUATIONS = Object.freeze({
  bootstrap: Object.freeze({
    conservative: 3_000_000,
    base: 10_000_000,
    upside: 30_000_000,
  }),
  acquisition: Object.freeze({
    conservative: 25_000_000,
    base: 100_000_000,
    upside: 400_000_000,
  }),
  ipo: Object.freeze({
    conservative: 400_000_000,
    base: 1_500_000_000,
    upside: 5_000_000_000,
  }),
})

/* Market salary defaults (USD, US non-Bay-Area hubs). Ravio 2026 / founder-math / Kore1. */
/* MARKET_SALARY moved to salary-bands.js as `marketSalaryFor(role, stage)`,
   which derives it from the researched hired band so the equity calculator and
   the job offer calculator can never disagree about what "market" means.
   Design review DD4, 2026-09-04. */

/* The canonical hero example lives in example.js (import-free, for client
   bundles); re-exported here so existing imports are unchanged. */
export { EXAMPLE } from './example.js'

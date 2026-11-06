import { computeAdjustments } from './adjustments.js'
import { resolveBand } from './bands.js'
import {
  BENCHMARKS_UPDATED_AT,
  EXAMPLE,
  LABELS,
  SOURCES,
} from './benchmarks.js'
import { buildBrief } from './brief.js'
import { classify } from './classify.js'
import { computeDilution } from './dilution.js'
import { computeLeaver } from './leaver.js'
import { normalizeInputs } from './normalize.js'
import { gapFor, positionFor } from './position.js'
import { roundRange } from './rounding.js'
import { computeScenarios } from './scenarios.js'

const round4 = (n) => Number(n.toFixed(4))

/**
 * Resolve the offered percent from the offer inputs.
 * Percent mode uses `offeredEquityPct`; shares mode needs both a count and a
 * positive fully diluted total (`100 × count / fd`, clamped to 0–100).
 * @param {object} inputs normalized inputs
 * @returns {{ pct: number|null, mode: string, missingFullyDiluted: boolean }}
 */
export function resolveOfferPct(inputs) {
  if (inputs.offerMode === 'shares') {
    const count = inputs.optionCount
    const fd = inputs.fullyDilutedShares
    const missingFullyDiluted = count !== null && !(fd > 0)
    if (count === null || !(fd > 0)) {
      return { pct: null, mode: 'shares', missingFullyDiluted }
    }
    const pct = Math.min(100, Math.max(0, (100 * count) / fd))
    return { pct: round4(pct), mode: 'shares', missingFullyDiluted: false }
  }
  return {
    pct: inputs.offeredEquityPct,
    mode: 'percent',
    missingFullyDiluted: false,
  }
}

/* `positionFor` lives in the import-free position.js so the desk landing's
   slider can run it without shipping the engine; re-exported for callers. */
export { positionFor }

function buildRead(rawInputs, options) {
  const inputs = normalizeInputs(rawInputs)
  const classification = classify(inputs)
  const band = resolveBand(inputs, classification)
  const adjustments = computeAdjustments(inputs)

  const rawRange = Object.freeze({
    lo: round4(band.lo + adjustments.total),
    hi: round4(band.hi + adjustments.total),
  })
  const range = roundRange(rawRange.lo, rawRange.hi)

  const resolved = resolveOfferPct(inputs)
  const position = positionFor(resolved.pct, range, classification.pending)
  const gapPts = position === 'below' ? gapFor(resolved.pct, range).below : null
  const offerBase = {
    pct: resolved.pct,
    mode: resolved.mode,
    position,
    range,
    rawRange,
    gapPts,
    missingFullyDiluted: resolved.missingFullyDiluted,
  }

  const dilution = computeDilution(inputs, {
    offerPct: resolved.pct,
    midPct: range.mid,
  })
  const scenarios = computeScenarios(
    inputs,
    dilution.exitStakes,
    options.valuations || options.overrides || {}
  )
  const sources = SOURCES.map((s) =>
    Object.freeze({ id: s.id, name: s.name, asOf: s.asOf, url: s.url ?? null })
  )

  const leaver = computeLeaver(inputs, {
    offerPct: resolved.pct,
    midPct: range.mid,
  })

  const brief = buildBrief({
    inputs,
    classification,
    band,
    adjustments,
    range,
    offer: offerBase,
    dilution,
    scenarios,
    leaver,
    sources,
  })

  const offer = Object.freeze({ ...offerBase, numberToSay: brief.numberToSay })
  const hasOffer = resolved.pct !== null
  const askSanity = hasOffer
    ? Object.freeze({
        acquisition: scenarios.acquisition[2].value,
        ipo: scenarios.ipo[2].value,
      })
    : null

  return Object.freeze({
    inputs,
    classification,
    band,
    adjustments,
    offer,
    rounds: dilution.series,
    dilution: Object.freeze({
      remaining: dilution.remaining,
      applied: dilution.applied,
      defaults: dilution.defaults,
      clamped: dilution.clamped,
      exitStakes: dilution.exitStakes,
    }),
    scenarios,
    leaver,
    askSanity,
    preselectedPath: inputs.path === 'unknown' ? 'acquisition' : inputs.path,
    brief,
    labels: Object.freeze({
      role: LABELS.role[inputs.role],
      joining: LABELS.joining[inputs.joining],
      stage: LABELS.stage[inputs.stageKey],
      path: LABELS.path[inputs.path],
      class: band.label,
    }),
    sources: Object.freeze(sources),
    updatedAt: BENCHMARKS_UPDATED_AT,
  })
}

/**
 * Compute the single derived `Read` for the wizard, rail, results, print,
 * announcer and tests. Never throws and never yields NaN: on any internal
 * failure it falls back to the read for default inputs.
 * @param {object} rawInputs wizard inputs (any shape; normalized inside)
 * @param {{ valuations?: object, overrides?: object }} [options] per-path scenario valuation overrides
 * @returns {object} frozen Read
 */
export function computeRead(rawInputs, options = {}) {
  const opts = options && typeof options === 'object' ? options : {}
  try {
    return buildRead(rawInputs, opts)
  } catch {
    return buildRead({}, {})
  }
}

/** The canonical hero read: fractional CTO converting at pre-seed, offered 3%. */
export const EXAMPLE_READ = computeRead(EXAMPLE)

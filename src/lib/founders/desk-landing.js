/*
 * Everything the desk landing (/founders) shows, as plain data.
 *
 * SERVER ONLY. This runs the engine (`EXAMPLE_READ`, `computeAsk`) and reads
 * the benchmark sources, and none of that belongs in the browser. The page
 * calls `deskLanding()` in its server component and passes the result, which
 * is JSON-safe, to the small client islands (the gap slider, the copyable
 * ladder). The slider's own maths is the import-free `equity/position.js`.
 *
 * Every figure on the page comes from here, read off the engine rather than
 * typed, so the landing cannot disagree with the tools it advertises. The few
 * typed claims are marked where they are made.
 *
 * Relative imports only: the engine test project runs this under plain node.
 */

import { fmtMoney, fmtPct } from '../../components/founders/format.js'
import { SOURCES } from './equity/benchmarks.js'
import { SLIDER_TRACKS } from './equity/bounds.js'
import { EXAMPLE_READ } from './equity/engine.js'
import { computeAsk } from './equity/negotiation.js'
import { liveTools, soonTools } from './tools.js'

const LANDING_SOURCES = ['carta', 'index', 'yc']

/* The final sentence of the ladder note is a claim about this example, not a
   method statement, so it is only made while the engine agrees with it. */
// TODO(alec): confirm the wording "this offer does not need more salary".
const ABOVE_CEILING_EMPHASIS =
  'Reading them together is the point: this offer does not need more salary.'

const COPY_PREFIX = {
  ceiling: 'Open with',
  target: 'Aim for',
  floor: 'Minimum the market supports:',
}

const TOAST_PREFIX = {
  ceiling: 'Open with',
  target: 'Aim for',
  floor: 'Minimum',
}

/** What this example shows, read off the engine rather than typed. */
export function ladderNoteFor(read, ask) {
  const cash =
    ask.offer?.position === 'above_ceiling'
      ? 'the salary already clears the top of the band for this seat'
      : ask.offer?.position === 'below_floor'
      ? 'the salary sits below the band for this seat'
      : 'the salary sits inside the band for this seat'
  const gap = read.offer.gapPts
  const equity =
    gap && gap[0] > 0
      ? `the equity is ${gap[0]} to ${gap[1]} points short`
      : 'the equity holds up'
  return {
    lead: `Each rung prices the equity at its own cash, so the three read as one band sampled three times. Here ${cash} and ${equity}.`,
    emphasis:
      ask.offer?.position === 'above_ceiling'
        ? ABOVE_CEILING_EMPHASIS
        : ask.sentences?.offer ?? null,
  }
}

/**
 * The ladder rows, with each meter's share of the largest rung on its axis.
 * Equity is shared against the max, not the ceiling rung: when the engine
 * flags `equity_inverts`, the ceiling's equity can sit below the target's.
 */
export function rungsFor(ask, dominantId = 'target') {
  const cashMax = Math.max(...ask.order.map((id) => ask[id].cash || 0)) || 1
  const equityMax =
    Math.max(...ask.order.map((id) => ask[id].equityPct || 0)) || 1
  return ask.order.map((id) => {
    const rung = ask[id]
    const cashText = fmtMoney(rung.cash)
    const equityText = fmtPct(rung.equityPct)
    const copyLead = COPY_PREFIX[id] ?? rung.label
    const toastLead = TOAST_PREFIX[id] ?? rung.label
    return {
      id,
      label: rung.label,
      cash: rung.cash,
      equityPct: rung.equityPct,
      cashText,
      equityText,
      share: {
        cash: round3((rung.cash || 0) / cashMax),
        equity: round3((rung.equityPct || 0) / equityMax),
      },
      copyText: `${copyLead} ${cashText} cash and ${equityText} equity`,
      toastText: `Copied · ${toastLead} ${cashText} and ${equityText}`,
      dominant: id === dominantId,
    }
  })
}

const round3 = (n) => Math.round(n * 1000) / 1000

export function deskLanding() {
  const read = EXAMPLE_READ
  const ask = computeAsk(read)
  const { lo, hi, mid } = read.offer.range
  const classLabel = read.labels.class.toLowerCase()

  /* The panel shows cash figures as well as equity ones, so the citation
     under it names where the cash came from too. */
  const cashSource = `${ask.bands.cash.source.replace(
    /, derived.*$/,
    ', derived'
  )} ${ask.bands.cash.asOf}`

  const sources = LANDING_SOURCES.map((id) => SOURCES.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, name: s.name, asOf: s.asOf, url: s.url ?? null }))

  return {
    example: {
      offer: read.offer.pct,
      range: { lo, hi, mid },
      numberToSay: read.offer.numberToSay.value,
      classLabel,
      /* "Fractional" is typed: the engine's joining label is the longer
         "Converting from fractional or contract". Role and stage are read. */
      kicker: `Fractional ${read.labels.role} converting at ${read.labels.stage}`,
      track: {
        min: SLIDER_TRACKS.offeredEquityPct.min,
        max: SLIDER_TRACKS.offeredEquityPct.max,
        step: SLIDER_TRACKS.offeredEquityPct.step,
        ticks: SLIDER_TRACKS.offeredEquityPct.ticks.map((t) => ({
          value: t.value,
          label: t.label,
        })),
      },
    },
    rungs: rungsFor(ask),
    note: ladderNoteFor(read, ask),
    sources,
    cashSource,
    live: liveTools().map((tool) => ({
      id: tool.id,
      label: tool.label,
      href: tool.href,
      kicker: tool.kicker,
      blurb: tool.blurb,
      icon: tool.icon,
      cta: tool.cta,
    })),
    soon: soonTools().map((tool) => ({
      id: tool.id,
      label: tool.label,
      blurb: tool.blurb,
      art: `/images/founders/soon/${tool.id}.svg`,
    })),
  }
}

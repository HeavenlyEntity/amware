import { LABELS } from './equity/benchmarks.js'
import { fmtMoney, fmtPct } from './equity/brief.js'

/* Formatting only.
 *
 * This used to own a second sessionStorage key ('amw:offer-review') alongside
 * the shared store's 'amw:offer'. Two mechanisms holding the same six fields,
 * under names one character apart, is how a tool starts showing one number on
 * one page and a different number on the next. The store is now the single
 * source of truth for the user's answers; this file just turns a read into the
 * text of a message (design review D6).
 */

/**
 * The labelled lines of the brief, one per fact, in the order an advisor reads
 * them. The review page renders these as toggleable rows, and
 * `briefForContact()` joins them into its message, so the two can never
 * disagree. `label` is the brief's own label (what the owner receives);
 * `short` is the review board's row label.
 * @param {object} read a computeRead() result
 * @returns {Array<{ id: string, label: string, short: string, value: string, line: string }>}
 */
export function briefLines(read) {
  const { inputs, classification, offer, adjustments, leaver, brief } = read
  const hasOffer = offer.pct !== null
  const salary =
    inputs.offeredSalary !== null
      ? `${fmtMoney(inputs.offeredSalary)} offered vs ${fmtMoney(
          inputs.marketSalary
        )} market (${fmtMoney(Math.abs(adjustments.salary.gap))} ${
          adjustments.salary.gap >= 0 ? 'below' : 'above'
        })`
      : `not entered (market ${fmtMoney(inputs.marketSalary)})`
  const rows = [
    [
      'seat',
      'Role and seat',
      'Seat',
      `${LABELS.role[inputs.role]}, ${LABELS.joining[
        inputs.joining
      ].toLowerCase()}`,
    ],
    [
      'stage',
      'Stage (last closed round)',
      'Stage',
      LABELS.stage[inputs.stageKey],
    ],
    [
      'equity',
      'Offered equity',
      'Equity offered',
      hasOffer
        ? `${fmtPct(offer.pct)}% fully diluted${
            offer.mode === 'shares' ? ' (from option count / FD shares)' : ''
          }`
        : 'not entered',
    ],
    ['salary', 'Salary vs market', 'Salary', salary],
    [
      'path',
      'Company’s stated exit path',
      'Exit path',
      LABELS.path[inputs.path],
    ],
    [
      'read',
      'The read',
      'The read',
      `${
        classification.pending ? 'pending' : LABELS.class[classification.class]
      }, range ${fmtPct(offer.range.lo)}–${fmtPct(offer.range.hi)}%${
        hasOffer ? `, offer ${offer.position} the band` : ''
      }`,
    ],
    [
      'say',
      'The number to say',
      'Number to say',
      offer.numberToSay?.sentence ?? brief.numberToSay?.sentence ?? '',
    ],
  ]
  if (leaver) {
    rows.push([
      'ends',
      'If it ends',
      'If it ends',
      `${leaver.exercise.label}; acceleration ${
        LABELS.accelerationCoC[inputs.accelerationCoC]
      }, ${
        inputs.accelerationTerminationMonths
      } mo on termination; repurchase ${
        LABELS.repurchaseVested[inputs.repurchaseVested]
      }; severance ${inputs.severanceMonths} mo`,
    ])
  }
  return rows.map(([id, label, short, value]) => ({
    id,
    label,
    short,
    value,
    line: `${label}: ${value}`,
  }))
}

/** The subject line for a read: "Offer review: CTO at pre-seed". */
export function briefSubject(read) {
  return `Offer review: ${LABELS.role[read.inputs.role]} at ${
    LABELS.stage[read.inputs.stageKey]
  }`
}

/**
 * Build the subject and the filled message for the contact form from a
 * read: the seat, the offer, the read itself, the leaver terms, then the
 * full plain-text brief so nothing has to be retyped.
 * @param {object} read a computeRead() result
 * @returns {{ subject: string, message: string }}
 */
export function briefForContact(read) {
  const lines = briefLines(read).map((row) => row.line)
  lines.push(
    '',
    'What I want help with: ',
    '',
    '--- Full brief ---',
    read.brief.text
  )
  return {
    subject: briefSubject(read),
    message: lines.join('\n'),
  }
}

/**
 * The job offer ask as one message line: "The ask: $97k and 13.5%, floor
 * $80k". Empty when the ladder is malformed, so a caller can drop the line.
 * @param {object} ask a computeAsk() ladder
 * @returns {string}
 */
export function askLine(ask) {
  const target = ask?.target
  if (!target || !Number.isFinite(target.cash)) return ''
  const floor = Number.isFinite(ask.floor?.cash)
    ? `, floor ${fmtMoney(ask.floor.cash)}`
    : ''
  return `The ask: ${fmtMoney(target.cash)} and ${fmtPct(
    target.equityPct
  )}%${floor}`
}

/*
 * "Copy the ask" — the ladder as sentences someone can send.
 *
 * WHY THIS EXISTS. Both design reviewers rejected the results screen for the
 * same reason: it ended in a report. The reader arrives holding an offer and a
 * decision, reads a confident headline, and then has to translate three
 * numbers, two sources and a spread into their own words before anything
 * happens. This closes that gap. It is the primary action on the page.
 *
 * SENDABLE, NOT DUMPED. `briefForContact()` above is a labelled record for a
 * human advisor to read. This is prose the user can paste into a reply and
 * edit: every number carries the one sentence that defends it and the source
 * behind that sentence, because an ask without its reasoning is a demand.
 *
 * EXACT DOLLARS, NOT THE DISPLAY GRAIN. The screen says "$184k" because the
 * figures are tabular and scanned. A salary written down in a negotiation is
 * written in full.
 */

const exactMoney = (n) =>
  Number.isFinite(n) ? `$${Math.round(n).toLocaleString('en-US')}` : '—'

const noTrailingStop = (s) => String(s || '').replace(/\.\s*$/, '')

/** The oldest date behind a set of rows, so the age claim is the honest one. */
const oldestAsOf = (rows) => {
  /* Every asOf is 'YYYY' or 'YYYY-MM', so lexicographic order is chronological
     order. Anything else sorts harmlessly to the end and is not chosen. */
  const dates = rows
    .map((r) => r?.asOf)
    .filter(Boolean)
    .sort()
  return dates[0] || null
}

/**
 * Cite a band row. A derived row names the derivation rather than pointing at
 * a note the reader cannot see, since this text travels away from the page.
 */
const cite = (row) => {
  if (!row) return null
  const body = row.note ? `derived — ${noTrailingStop(row.note)}` : row.source
  return row.asOf
    ? `${noTrailingStop(body)} (${row.asOf})`
    : noTrailingStop(body)
}

/** "times 1.1 for AI and 1.12 for the Bay Area or New York", or nothing. */
function multiplierClause(ask, industryShort, geoShort) {
  const parts = []
  /* Two decimals and an x: "1.1" beside a dollar figure reads as a number in
     the same series, "1.10x" reads as the multiplier it is. */
  if (ask.bands.industry?.multiplier !== 1)
    parts.push(
      `${ask.bands.industry.multiplier.toFixed(2)}x for ${industryShort}`
    )
  if (ask.bands.geo?.multiplier !== 1)
    parts.push(`${ask.bands.geo.multiplier.toFixed(2)}x for ${geoShort}`)
  if (parts.length === 0) return ''
  return `, times ${parts.join(' and ')}`
}

/**
 * The ask as sendable sentences: the two numbers, one defensibility line each
 * with its source, the room either side, and how old the data is.
 *
 * Pure. Never throws: a malformed ladder returns an empty string and the UI
 * hides the control rather than putting a broken message on someone's
 * clipboard.
 *
 * @param {object} ask a computeAsk() ladder
 * @param {{ industryOptions?: Array, geoOptions?: Array }} [labels] short,
 *   mid-sentence names for the two multipliers, injected so this file stays
 *   free of a copy of the wizard's option list
 * @returns {string}
 */
export function askForClipboard(ask, labels = {}) {
  if (!ask?.target || !ask?.bands) return ''
  try {
    const { target, ceiling, floor, bands } = ask
    const shortFor = (options, key, fallback) =>
      options?.find((o) => o.value === key)?.short || fallback
    const industryShort = shortFor(
      labels.industryOptions,
      bands.industryKey,
      'this industry'
    )
    const geoShort = shortFor(labels.geoOptions, bands.geoKey, 'this location')

    const seat = `${ask.labels.role.toLowerCase()} at ${ask.labels.stage}`
    const range = target.read.offer.range
    const bandLabel = (target.read.band.label || 'this seat').toLowerCase()

    /* p50 is the national baseline; the multipliers carry it to this person's
       actual industry and city. Showing both makes the number checkable. */
    const cashWhy = multiplierClause(ask, industryShort, geoShort)
      ? `The median base for a ${seat} on the ${
          ask.labels.bucket
        } is ${exactMoney(bands.cash.p50)} nationally${multiplierClause(
          ask,
          industryShort,
          geoShort
        )}, which is ${exactMoney(target.cash)}.`
      : `The median base for a ${seat} on the ${
          ask.labels.bucket
        } is ${exactMoney(target.cash)}.`

    const equityWhy = `Computed at that same ${exactMoney(
      target.cash
    )} base: at that salary the defensible range for a ${bandLabel} is ${fmtPct(
      range.lo
    )}% to ${fmtPct(range.hi)}% fully diluted, and ${fmtPct(
      target.equityPct
    )}% is the middle of it.`

    /* The on-screen `est.` marks do not survive a copy, so the spread has to
       say what it is in words or the copied text overclaims (DD8). */
    const spread = ask.flags.find((f) => f.id === 'spread_derived')?.text

    const asOf = oldestAsOf([
      bands.cash,
      bands.industry?.multiplier !== 1 ? bands.industry : null,
      bands.geo?.multiplier !== 1 ? bands.geo : null,
      target.read.band,
    ])

    const lines = [
      `Ask: ${exactMoney(target.cash)} base and ${fmtPct(
        target.equityPct
      )}% fully diluted.`,
      '',
      `Why ${exactMoney(target.cash)}. ${cashWhy} Source: ${cite(bands.cash)}.`,
      '',
      `Why ${fmtPct(target.equityPct)}%. ${equityWhy} Source: ${cite(
        target.read.band
      )}.`,
      '',
      `Room either side: ${exactMoney(ceiling.cash)} and ${fmtPct(
        ceiling.equityPct
      )}% is the top of what the data supports; ${exactMoney(
        floor.cash
      )} and ${fmtPct(floor.equityPct)}% is the least it supports.${
        spread ? ` ${spread}` : ''
      }`,
      '',
      `${
        asOf
          ? `Market figures as of ${asOf}, the oldest source behind this ask. `
          : ''
      }Worked out with the AMWARE Founders' Desk job offer calculator.`,
    ]
    return lines.join('\n')
  } catch {
    return ''
  }
}

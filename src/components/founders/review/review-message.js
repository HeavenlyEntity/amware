import { LABELS } from '@/lib/founders/equity/benchmarks'
import { computeRead } from '@/lib/founders/equity/engine'
import { computeAsk } from '@/lib/founders/equity/negotiation'
import { askLine, briefLines, briefSubject } from '@/lib/founders/handoff'

/*
 * The offer review's data, as one pure module: the read the page renders and
 * the exact subject and message it POSTs. The preview drawer and the send
 * both call `composeReview()`, so what the visitor sees under "See exactly
 * what I receive" is byte for byte what arrives.
 *
 * Everything the board adds over the old textarea (the help chips, the
 * deadline, the source tool) is folded into `subject` and `message`, so the
 * contact collection, its columns and the server route are unchanged.
 */

export const SUBJECT = 'Offer review'

export const HELP_OPTIONS = Object.freeze([
  { id: 'fair', label: 'Is this offer fair?' },
  { id: 'counter', label: 'What to counter with' },
  { id: 'equity', label: 'Equity size' },
  { id: 'salary', label: 'Salary' },
  { id: 'vesting', label: 'Vesting and cliff' },
  { id: 'ends', label: 'If it ends' },
  { id: 'take', label: 'Whether to take it' },
])

/** With a read attached the counter is the obvious question; without one
    nothing is assumed. */
export const defaultHelp = (hasRead) => (hasRead ? ['counter'] : [])

export const DEADLINE_OPTIONS = Object.freeze([
  { id: 'this_week', label: 'This week' },
  { id: 'two_weeks', label: 'Within two weeks' },
  { id: 'none', label: 'No deadline' },
])

export const DEFAULT_DEADLINE = 'two_weeks'

export const URGENT_DEADLINE = 'this_week'

export const NOTE_MAX = 1200

/** The blanks a direct visitor fills in. The old template's "The read the
    calculator gave me" and "What I want help with" lines are gone: the help
    chips cover the second, and nobody without a read has the first. */
export const MANUAL_TEMPLATE = [
  'Role and seat: ',
  'Stage (last closed round): ',
  'Joining as (formation / converting from fractional / hired after): ',
  'Offered equity (% fully diluted, or option count / FD shares): ',
  'Salary vs market: ',
  'Company’s stated exit path: ',
].join('\n')

const fmt = (n) => {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** The band's right edge: 30% at least, so it matches the desk's GapFigure,
    and always room past the band and the offer. */
export const scaleMaxFor = (hi, offer) => {
  const top = Math.max(hi, Number.isFinite(offer) ? offer : 0)
  return Math.max(30, Math.ceil((top + 2) / 10) * 10)
}

/** Position on the band, as a CSS percentage, clamped to the track. */
export const pctOf = (value, max) =>
  `${Math.min(Math.max(value / max, 0), 1) * 100}%`

/**
 * Turn an ask (from `useOfferStore.getState().askedRead()`) into everything
 * the read card shows. Returns null when there is nothing to show or the
 * engine could not produce a brief, so the page falls back to the manual
 * state rather than rendering an empty card.
 *
 * @param {null | { from: string | null, inputs: object, options?: object | null }} asked
 */
export function buildReview(asked) {
  if (!asked?.inputs) return null
  try {
    const read = computeRead(asked.inputs, asked.options ?? undefined)
    const facts = briefLines(read)
    const isAsk = asked.from === 'job-offer'
    const ask = isAsk
      ? computeAsk(read, {
          industry: read.inputs.industry ?? asked.inputs.industry,
          geo: read.inputs.geo ?? asked.inputs.geo,
        })
      : null
    /* The ask carries the visitor's floor, so it is a row like any other and
       can be left out, rather than riding along unseen. */
    const line = ask ? askLine(ask) : ''
    if (line) {
      const value = line.replace(/^The ask: /, '')
      facts.push({ id: 'ask', label: 'The ask', short: 'The ask', value, line })
    }
    /* Fork 5: the job offer route draws the band at the salary it tells you
       to ask for, so the headline percent sits inside the band drawn. */
    const range =
      (isAsk ? ask?.target?.read?.offer?.range : null) ?? read.offer.range
    const offerPct = Number.isFinite(read.offer.pct) ? read.offer.pct : null
    const pending = read.classification.pending

    return {
      from: isAsk ? 'job-offer' : 'equity',
      read,
      ask,
      facts,
      subject: briefSubject(read),
      classLabel: pending
        ? LABELS.class.unknown
        : LABELS.class[read.classification.class],
      context: `${read.labels.role} · ${read.labels.stage}`,
      headline: headlineFor(read, ask),
      band: {
        lo: range.lo,
        hi: range.hi,
        offer: offerPct,
        max: scaleMaxFor(range.hi, offerPct),
        atAsk: Boolean(isAsk && ask?.target?.read),
      },
      askLine: line,
      briefText: read.brief?.text ?? '',
    }
  } catch {
    return null
  }
}

/* The big line on the card. The engine writes the sentence; this only splits
   off the figure so it can carry the accent. */
function headlineFor(read, ask) {
  if (ask) {
    const sentence = ask.sentences?.target ?? ''
    const match = /^Ask for (.+)\.$/.exec(sentence)
    return match
      ? { lead: 'Ask for ', figure: match[1], tail: '.' }
      : { lead: sentence, figure: null, tail: '' }
  }
  const value = read.offer.numberToSay?.value
  if (Number.isFinite(value)) {
    return {
      lead: 'The number to say: ',
      figure: `${fmt(value)}%`,
      tail: ' fully diluted.',
    }
  }
  /* No offer and a pending class: no single number, so the sentence. */
  const sentence =
    read.offer.numberToSay?.sentence ?? read.brief?.numberToSay?.sentence ?? ''
  return { lead: sentence, figure: null, tail: '' }
}

/** True when a manual line carries a value, or the visitor wrote their own. */
export function manualFilled(manual) {
  return String(manual ?? '')
    .split('\n')
    .some((line) => {
      const trimmed = line.trim()
      if (!trimmed) return false
      return /:\s*\S/.test(trimmed) || !trimmed.endsWith(':')
    })
}

/**
 * The exact subject and message the owner receives.
 *
 * @param {{
 *   review: ReturnType<typeof buildReview>,
 *   off?: string[],         fact ids left out
 *   briefOn?: boolean,      attach the full brief (read only)
 *   help?: string[],        HELP_OPTIONS ids
 *   deadline?: string,      DEADLINE_OPTIONS id
 *   note?: string,
 *   manual?: string,        the manual text, used when there is no read
 * }} parts
 * @returns {{ subject: string, message: string, includedCount: number, factCount: number }}
 */
export function composeReview({
  review,
  off = [],
  briefOn = true,
  help = [],
  deadline = DEFAULT_DEADLINE,
  note = '',
  manual = '',
}) {
  const left = new Set(off)
  const blocks = []
  let includedCount = 0
  let factCount = 0

  if (review) {
    factCount = review.facts.length
    const kept = review.facts.filter((fact) => !left.has(fact.id))
    includedCount = kept.length
    const lines = kept.map((fact) => fact.line)
    if (lines.length) blocks.push(lines.join('\n'))
  } else {
    const text = String(manual ?? '').trimEnd()
    if (text) blocks.push(text)
  }

  const deadlineLabel =
    DEADLINE_OPTIONS.find((option) => option.id === deadline)?.label ??
    DEADLINE_OPTIONS.find((option) => option.id === DEFAULT_DEADLINE).label
  const helpLabels = HELP_OPTIONS.filter((option) =>
    help.includes(option.id)
  ).map((option) => option.label)
  blocks.push(
    [
      `Answering by: ${deadlineLabel.toLowerCase()}`,
      `What I want help with: ${
        helpLabels.length ? helpLabels.join(', ') : '—'
      }`,
    ].join('\n')
  )

  const trimmedNote = String(note ?? '').trim()
  if (trimmedNote) blocks.push(trimmedNote)

  if (review && briefOn && review.briefText) {
    blocks.push(`--- Full brief ---\n${review.briefText}`)
  }

  /* Fork 9: urgency rides in the subject, so it shows in the inbox without a
     new column to filter on. */
  const base = review ? review.subject : SUBJECT
  const subject =
    deadline === URGENT_DEADLINE
      ? base.replace(SUBJECT, `${SUBJECT} (answering this week)`)
      : base

  return {
    subject,
    message: blocks.join('\n\n'),
    includedCount,
    factCount,
  }
}

const REPLY_TZ = 'America/Phoenix'

/**
 * The date the reply is promised by: two business days after today, today
 * being the date in Phoenix, where the replies are written. No holiday table,
 * so a holiday counts as a working day.
 * @param {Date} [now]
 * @param {string} [timeZone]
 * @returns {string} e.g. "Friday, Nov 6"
 */
export function replyByDate(now = new Date(), timeZone = REPLY_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const get = (type) => Number(parts.find((part) => part.type === type)?.value)
  /* Noon UTC on that calendar date, so stepping whole days never crosses a
     date line whatever the runtime's own zone is. */
  const day = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), 12))
  let added = 0
  while (added < 2) {
    day.setUTCDate(day.getUTCDate() + 1)
    const weekday = day.getUTCDay()
    if (weekday !== 0 && weekday !== 6) added += 1
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(day)
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const nameValid = (name) => String(name ?? '').trim().length > 1

export const emailValid = (email) => EMAIL_PATTERN.test(String(email ?? ''))

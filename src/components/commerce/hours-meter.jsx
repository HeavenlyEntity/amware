/**
 * How much of a month a retainer takes, read from its `commitment` text
 * ("about 20 to 25 hrs a month"). The bar compares the tiers with each
 * other: it runs to SCALE hours a month, the top of the largest retainer,
 * and claims no more than that. The solid fill reaches the low end, a
 * lighter band runs to the high end. The figure beside it carries the
 * meaning; the bar is decoration.
 *
 * Only monthly hours count: text that names no hours ("Near full-time"),
 * or hours per week or per day, returns null and the card falls back to
 * its headline and kicker line.
 */

const SCALE = 40

/** "about 20 to 25 hrs a month" → { low: 20, high: 25 }; otherwise null. */
export function parseHours(text) {
  const value = String(text ?? '')
  if (!/\b(?:a|per|\/)\s*mo(?:nth)?\b|\bmonthly\b/i.test(value)) return null
  const match =
    /(?<![\d.])(\d+)(?:\s*(?:to|-|–|—)\s*(\d+))?\s*(?:hrs?|hours?)\b/i.exec(
      value
    )
  if (!match) return null
  const low = Number(match[1])
  const high = match[2] ? Number(match[2]) : low
  if (!(low > 0) || high < low) return null
  return { low, high }
}

const pct = (hours) => `${Math.min(100, (hours / SCALE) * 100)}%`

export function HoursMeter({ commitment, tone }) {
  const hours = parseHours(commitment)
  if (!hours) return null
  const { low, high } = hours
  const figure = low === high ? `${low}` : `${low}–${high}`
  return (
    <div className="mt-5">
      <p className="flex items-baseline gap-2">
        <span
          className={`amw-mono text-2xl font-medium tabular-nums tracking-tight ${tone.strong}`}
        >
          {figure}
        </span>
        <span className={`text-sm ${tone.soft}`}>hrs a month</span>
      </p>
      <div
        aria-hidden="true"
        className="bg-[var(--amw-line)] relative mt-2.5 h-1.5 overflow-hidden rounded-full"
      >
        {/* The range band: a third of the accent, so it reads on white,
            on the dark card and on the popular card's teal (where the
            accent is white). */}
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: pct(high),
            background:
              'color-mix(in srgb, var(--amw-accent) 38%, transparent)',
          }}
        />
        <span
          className="bg-[var(--amw-accent)] absolute inset-y-0 left-0 rounded-full"
          style={{ width: pct(low) }}
        />
      </div>
    </div>
  )
}

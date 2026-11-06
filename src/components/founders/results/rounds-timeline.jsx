'use client'

import { fmtPct } from '@/components/founders/format'

/* "Your stake through the rounds" for one path (board `.eq-round`): two bars
   per round, the stake starting from the band middle (teal) and from the
   offer (grey). Widths are relative to the larger of the two stakes in the
   first round, so the shrink reads round over round. The bars grow in with a
   CSS animation that the site's motion switch turns off.

   With no offer the grey series, its legend and its figures are left out
   rather than drawn at zero. Each row states both figures in text. */

export function RoundsTimeline({ rounds, hasOffer, pathLabel }) {
  if (rounds.length === 0) {
    return (
      <div>
        <p className="amw-wz-kicker">Your stake through the rounds</p>
        <p className="text-[var(--amw-mut)] mt-3 text-sm">
          No further rounds on this path: your stake holds where it starts.
        </p>
      </div>
    )
  }
  const showOffer = hasOffer && rounds.some((r) => r.stakeOffer !== null)
  const first = rounds[0]
  const scale = Math.max(
    first.stakeMid,
    showOffer ? first.stakeOffer ?? 0 : 0,
    0.0001
  )
  const width = (v) => `${Math.min(1, Math.max(0, v / scale)) * 100}%`

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="amw-wz-kicker">
          Your stake through the rounds
          <span className="sr-only"> on the {pathLabel} path</span>
        </span>
        <span className="flex flex-wrap gap-3" aria-hidden="true">
          <span className="amw-wz-legend">
            <i className="bg-[var(--amw-accent)]" />
            At the band middle
          </span>
          {showOffer && (
            <span className="amw-wz-legend">
              <i className="bg-[var(--amw-mut)]" />
              As offered
            </span>
          )}
        </span>
      </figcaption>
      <ul role="list" className="mt-3 list-none p-0">
        {rounds.map((r, index) => (
          <li key={r.round} className="amw-wz-round">
            <span className="text-[var(--wz-ink-2)] text-[13px]">
              {r.label}
            </span>
            <div className="min-w-0">
              <div className="amw-wz-rbar" aria-hidden="true">
                <i
                  data-series="mid"
                  style={{
                    width: width(r.stakeMid),
                    '--d': `${index * 0.08}s`,
                  }}
                />
                {showOffer && r.stakeOffer !== null && (
                  <i
                    data-series="offer"
                    style={{
                      width: width(r.stakeOffer),
                      '--d': `${index * 0.08 + 0.04}s`,
                    }}
                  />
                )}
              </div>
              <p className="amw-mono text-[var(--amw-mut)] mt-1 text-[11px] tabular-nums">
                <span className="sr-only">At the band middle </span>
                {fmtPct(r.stakeMid)}
                {showOffer && (
                  <>
                    {' · '}
                    <span className="sr-only">as offered </span>
                    {fmtPct(r.stakeOffer)}
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  )
}

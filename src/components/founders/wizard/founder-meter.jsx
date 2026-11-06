'use client'

import '@/styles/founders-wizard.css'
import { Badge } from '@/components/founders/wizard/badge'

/*
 * "Founder-level work · {selected} of {total}" (board `.eq-meter`): how much
 * of the seat's founder-level work was yours, and the class it reads as.
 *
 * Every number is the engine's. The fill is `score / maxScore`, where
 * `maxScore` is the sum of the seat's chip weights, computed by the caller
 * with `maxScoreFor(chips)` rather than the board's hard-coded 8.5, so a
 * re-weighted chip set cannot leave the meter wrong.
 *
 * Not a live region: it would re-announce the count on every chip. The page's
 * LiveAnnouncer speaks the class when it changes.
 *
 * Props: { score, maxScore, selected, total, classLabel (null while
 *   pending), pendingHint, title, className }
 */

export function maxScoreFor(chips = []) {
  const sum = chips.reduce((total, chip) => total + (chip.weight ?? 0), 0)
  return Number(sum.toFixed(2))
}

export function FounderMeter({
  score,
  maxScore,
  selected,
  total,
  classLabel = null,
  pendingHint = null,
  title = 'Founder-level work',
  className = '',
}) {
  const ratio = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0
  return (
    <div className={`amw-wz-meter ${className}`}>
      <div className="amw-wz-meter-head">
        <span>
          {title}
          <span className="text-[var(--amw-mut)]">
            {` · ${selected} of ${total}`}
          </span>
        </span>
        {classLabel ? (
          <Badge>{classLabel}</Badge>
        ) : (
          <Badge quiet pop={false}>
            <span aria-hidden="true">?</span>
            <span className="sr-only">No read yet</span>
          </Badge>
        )}
      </div>
      <div
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={maxScore}
        aria-valuenow={score}
        aria-valuetext={`${selected} of ${total} picked`}
        className="amw-wz-meter-track"
      >
        <span
          className="amw-wz-meter-fill"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      {pendingHint && <p className="amw-wz-hint">{pendingHint}</p>}
    </div>
  )
}

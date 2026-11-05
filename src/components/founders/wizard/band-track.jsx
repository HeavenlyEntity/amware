import '@/styles/founders-wizard.css'

/*
 * The band figure (board `.eq-band-track`): an axis, the range as a soft
 * accent bar, and the offer as an ink mark with a dot. Used in the rail, under
 * the offer slider and on the verdict card, so the three can never disagree.
 * Decorative: the caller states the same facts in text.
 *
 * `axisMaxFor(...values)` is the one display rule for the axis: at least 30%,
 * and otherwise the next 10 above the largest value plus 2 (the boards'
 * `scaleMax`). It is a UI rule, not an engine figure, so it lives here once.
 *
 * Props: { lo, hi, offer (number | null), max, size: 'md' | 'lg', scale
 *   (show the 0 / mid / max ticks), scaleClassName, className }
 */

export const MIN_AXIS = 30

export function axisMaxFor(...values) {
  const finite = values.filter(
    (v) => typeof v === 'number' && Number.isFinite(v)
  )
  const top = finite.length ? Math.max(...finite) : 0
  return Math.max(MIN_AXIS, Math.ceil((top + 2) / 10) * 10)
}

const at = (value, max) => `${Math.min(Math.max(value / max, 0), 1) * 100}%`

const tickLabel = (n) => `${Number(n.toFixed(2))}%`

export function BandScale({ max, className = 'amw-wz-scale' }) {
  return (
    <div className={className} aria-hidden="true">
      <span>{tickLabel(0)}</span>
      <span>{tickLabel(max / 2)}</span>
      <span>{tickLabel(max)}</span>
    </div>
  )
}

export function BandTrack({
  lo,
  hi,
  offer = null,
  max,
  size = 'md',
  scale = true,
  scaleClassName,
  className = '',
}) {
  const hasOffer = typeof offer === 'number' && Number.isFinite(offer)
  const hit = hasOffer && offer >= lo && offer <= hi
  return (
    <div className={className} aria-hidden="true">
      <div className="amw-wz-band-track" data-size={size}>
        <span className="amw-wz-band-axis" />
        <span
          className="amw-wz-band"
          data-hit={hit ? 'true' : undefined}
          style={{ left: at(lo, max), width: at(Math.max(0, hi - lo), max) }}
        />
        {hasOffer && (
          <span className="amw-wz-mark" style={{ left: at(offer, max) }} />
        )}
      </div>
      {scale && <BandScale max={max} className={scaleClassName} />}
    </div>
  )
}

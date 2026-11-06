import { Check, ChevronDown } from 'lucide-react'

import { pctOf } from './review-message'

const fmtPct = (n) => {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function Band({ band }) {
  const { lo, hi, offer, max, atAsk } = band
  const hasOffer = Number.isFinite(offer)
  return (
    <>
      <div
        className="rv-band-wrap"
        role="img"
        aria-label={
          hasOffer
            ? `Benchmark band ${fmtPct(lo)} to ${fmtPct(
                hi
              )} percent; offered ${fmtPct(offer)} percent`
            : `Benchmark band ${fmtPct(lo)} to ${fmtPct(hi)} percent`
        }
      >
        {/* The offer's label has its own row above the bar, so it can never
            collide with the band's edge labels (gap-figure.jsx). */}
        <div className="rv-band-over" aria-hidden="true">
          {hasOffer && (
            <span style={{ left: pctOf(offer, max) }}>
              Offer {fmtPct(offer)}%
            </span>
          )}
        </div>
        <div className="rv-band" aria-hidden="true">
          <span
            className="rv-band-fill"
            style={{ left: pctOf(lo, max), width: pctOf(hi - lo, max) }}
          />
          {hasOffer && (
            <span
              className="rv-band-mark"
              style={{ left: pctOf(offer, max) }}
            />
          )}
        </div>
        <div className="rv-band-labels" aria-hidden="true">
          <span data-edge="start">0%</span>
          <span data-tone="accent" style={{ left: pctOf(lo, max) }}>
            {fmtPct(lo)}%
          </span>
          <span data-tone="accent" style={{ left: pctOf(hi, max) }}>
            {fmtPct(hi)}%
          </span>
          <span data-edge="end">{max}%</span>
        </div>
      </div>
      <p className="rv-band-cap">
        {atAsk
          ? 'Fully diluted. The bar is the band the market supports for this seat at the salary you would ask for; the dot is what is on the table.'
          : 'Fully diluted. The bar is the band the market supports for this seat; the dot is what is on the table.'}
      </p>
    </>
  )
}

/**
 * Section 1 with a read: the class, the number, the band, and the brief's
 * lines as rows that can each be left out. Lines can be dropped, not edited;
 * the note in section 2 covers corrections (fork 11).
 */
export function ReadCard({
  review,
  off,
  onToggle,
  briefOn,
  onBriefToggle,
  composed,
  previewOpen,
  onPreview,
}) {
  const { headline } = review
  const offSet = new Set(off)
  return (
    <div className="rv-read">
      <div className="rv-read-top">
        <div className="rv-read-row">
          <span className="rv-badge rv-pop">{review.classLabel}</span>
          <span className="amw-kicker">{review.context}</span>
        </div>
        <p className="rv-say">
          {headline.lead}
          {headline.figure && <em>{headline.figure}</em>}
          {headline.tail}
        </p>
        <Band band={review.band} />
      </div>

      <ul className="rv-facts" aria-label="What goes in the message">
        {review.facts.map((fact, i) => {
          const on = !offSet.has(fact.id)
          return (
            <li
              key={fact.id}
              style={{ '--d': `${0.15 + i * 0.06}s` }}
              className="rv-fact-li"
            >
              {/* The whole row is the control, so the target is 52px tall
                  rather than the board's 36px box. */}
              <button
                type="button"
                className="rv-fact"
                data-on={on}
                aria-pressed={on}
                onClick={() => onToggle(fact.id)}
              >
                <span className="rv-tick" aria-hidden="true">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {/* aria-pressed carries included / left out; the hidden colon
                    keeps the key and value apart when read aloud. */}
                <span className="rv-fact-key">
                  {fact.short}
                  <span className="sr-only">: </span>
                </span>
                <span className="rv-fact-val">{fact.value}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="rv-read-foot">
        <p className="rv-foot-count m-0">
          {composed.includedCount} of {composed.factCount} lines included
          {briefOn && review.briefText ? ' · full brief attached' : ''}
        </p>
        {/* The full brief repeats every line, so leaving one out means little
            while it is attached. Say so where the choice is made. */}
        {briefOn && review.briefText && off.length > 0 && (
          // TODO(alec): not on the board. Confirm the copy, or whether an
          // untick should detach the brief by itself.
          <p className="rv-brief-warn m-0" role="note">
            The full brief still repeats the lines you left out. Detach it to
            keep them to yourself.
          </p>
        )}
        <div className="rv-foot-actions">
          {review.briefText && (
            <button
              type="button"
              className="rv-textbtn"
              onClick={onBriefToggle}
            >
              {briefOn ? 'Detach full brief' : 'Attach full brief'}
            </button>
          )}
          <button
            type="button"
            className="rv-backbtn"
            aria-expanded={previewOpen}
            aria-controls="rv-preview"
            onClick={onPreview}
          >
            See exactly what I receive
            <ChevronDown
              className="rv-chev size-4"
              data-open={previewOpen}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div
        id="rv-preview"
        className="rv-drawer"
        data-open={previewOpen}
        aria-hidden={!previewOpen}
        inert={!previewOpen}
      >
        <div>
          <p className="amw-kicker rv-preview-subject">
            Subject · {composed.subject}
          </p>
          <pre
            className="rv-pre"
            role="region"
            aria-label="The message as sent"
            /* A scrolling box has to take focus, or a keyboard cannot scroll
               the long brief inside it. The drawer is inert while closed. */
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
          >
            {composed.message}
          </pre>
        </div>
      </div>
    </div>
  )
}

/** Fixed-geometry stand-in for section 1 until the store hydrates. */
export function ReadSkeleton() {
  return (
    <div className="rv-read rv-skel" aria-hidden="true">
      <div className="rv-read-top">
        <span className="rv-skel-bar" style={{ width: '9rem', height: 26 }} />
        <span
          className="rv-skel-bar"
          style={{ width: '70%', height: 34, marginTop: 12 }}
        />
        <span
          className="rv-skel-bar"
          style={{ width: '100%', height: 10, marginTop: 52 }}
        />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rv-skel-row">
          <span className="rv-skel-bar" style={{ width: '60%', height: 14 }} />
        </div>
      ))}
    </div>
  )
}

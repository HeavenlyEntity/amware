'use client'

import { useId, useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'

import '@/styles/founders-offer.css'
import { Segmented } from '@/components/founders/wizard/segmented'
import { fmtMoney } from '@/components/founders/format'
import { SOURCE_URL } from '@/lib/founders/equity/company-comp'

/*
 * Where the offer sits against named companies, in the Offer board's look.
 *
 * ONE COMPONENT, FULLY DATA-DRIVEN. The IC and leadership ladders differ in
 * domain, row count and exclusions. A seat prop would grow a branch per row, so
 * the ladder is chosen inside company-comp.js and everything here reads what
 * buildPlot() returned (design review DD12).
 *
 * TAP, NEVER HOVER. Every row is a button that expands its own breakdown. Hover
 * does not exist on a phone, and detail behind hover is detail a phone user
 * cannot reach at all. Making it a disclosure fixes touch, keyboard and print in
 * one move (DD10). The panel opens by animating its grid rows; while closed it
 * is `visibility: hidden`, so assistive tech skips it, and in print it is open.
 *
 * NO NEW COLOUR. The staleness warning gets a mono kicker and a glyph rather
 * than an amber that would exist for one banner and then spread. The user's
 * modeled equity is the teal hatch: their own row, not yet vested.
 *
 * PHONES (spec fork F11). Below 760px the bar takes its own line and the total
 * stays beside the label rather than being hidden.
 */

/* Segment ids from `plot.segments` to their bar classes. */
const SEGMENT_CLASS = {
  cash: 'amw-jo-seg--cash',
  liquid: 'amw-jo-seg--liquid',
  modeled: 'amw-jo-seg--modeled',
}

function Row({ row, domain, isUser, open, onToggle, panelId }) {
  const share = (n) => Math.min(100, Math.max(0, (n / domain) * 100))
  const cashW = share(row.cash)
  /* Never past the end of the bar: an off-scale row fills it and says so. */
  const equityW = Math.min(share(row.equity), 100 - cashW)
  const overflows = row.total > domain

  return (
    <li
      className="amw-plot-row amw-jo-prow"
      data-user={isUser ? 'true' : undefined}
      data-open={open ? 'true' : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="amw-jo-prow-btn"
      >
        <span className="amw-jo-prow-label">
          <span className="amw-jo-prow-name">{row.label}</span>
          {row.level && (
            <span className="amw-wz-kicker amw-jo-prow-level">{row.level}</span>
          )}
        </span>

        {/* Full width under the label on a phone, its own column on a larger
            screen. Never squeezed into 200px with a $1.4M domain. */}
        <span className="amw-jo-bar" aria-hidden="true">
          <i className={SEGMENT_CLASS.cash} style={{ width: `${cashW}%` }} />
          <i
            className={isUser ? SEGMENT_CLASS.modeled : SEGMENT_CLASS.liquid}
            style={{ width: `${equityW}%` }}
          />
          {overflows && <span className="amw-jo-over">Off scale →</span>}
        </span>

        <span className="amw-price amw-jo-total">
          {fmtMoney(row.total)}
          {overflows && <span className="sr-only">, off scale</span>}
          {row.confidence && row.confidence !== 'sourced' && (
            <span
              className="amw-jo-est"
              title={`This row is ${row.confidence}`}
            >
              est.
            </span>
          )}
        </span>

        <span className="amw-jo-prow-meta">
          <span className="amw-jo-liq" title={row.liquidity.detail}>
            {row.liquidity.label}
          </span>
          <ChevronDown aria-hidden="true" className="amw-jo-chev size-4" />
        </span>
      </button>

      {/* `print:block` keeps a collapsed panel on paper; hover is never the
          only path. */}
      <div id={panelId} className="amw-jo-panel print:block">
        <div>
          <div className="amw-jo-panel-body">
            <dl className="amw-jo-dl">
              {row.breakdown.map((b) => (
                <div key={b.label}>
                  <dt className="amw-wz-kicker">{b.label}</dt>
                  <dd className="amw-price">{fmtMoney(b.value)}</dd>
                </div>
              ))}
            </dl>
            {/* Only when the row has no note of its own; Netflix already
                explains itself and saying it twice reads as a bug. */}
            {row.allCash && !isUser && !row.note && (
              <p className="amw-wz-hint">
                No stock line: this package is all cash.
              </p>
            )}
            {row.note && <p className="amw-wz-hint">{row.note}</p>}
            <p className="amw-wz-hint">{row.liquidity.detail}</p>
          </div>
        </div>
      </div>
    </li>
  )
}

export function MarketPlot({ plot, onScenarioChange }) {
  const baseId = useId()
  const [openId, setOpenId] = useState(null)

  if (!plot) return null

  if (plot.withheld) {
    return (
      <section
        className="amw-wz-card mt-12"
        aria-labelledby={`${baseId}-title`}
      >
        <h2 id={`${baseId}-title`} className="amw-wz-kicker m-0">
          Against the market
        </h2>
        <p className="amw-jo-plot-copy mt-3">{plot.reason}</p>
      </section>
    )
  }

  const rows = [...plot.rows, plot.user]
  const toggle = (id) => setOpenId((current) => (current === id ? null : id))

  return (
    <section className="amw-wz-card mt-12" aria-labelledby={`${baseId}-title`}>
      <div className="max-w-[44rem]">
        <h2
          id={`${baseId}-title`}
          className="text-[var(--amw-ink)] m-0 text-[22px] font-semibold leading-[30px]"
        >
          Against the market
        </h2>
        {/* The thesis, before the bars. Without it the honest reading of this
            chart is "you are underpaid", which is true and useless. */}
        <p className="amw-jo-plot-copy mt-2">{plot.thesis}</p>
        <p className="amw-wz-kicker mt-2.5">{plot.axisLabel}</p>
      </div>

      {/* The control sits above the thing it drives. The $0 outcome is the most
          useful thing here and cannot live below the fold of its own chart. */}
      {plot.scenarios.length > 0 && (
        <Segmented
          label="If the company ends up worth"
          options={plot.scenarios.map((s) => ({ id: s.id, label: s.label }))}
          value={plot.scenarioId}
          onChange={(id) => onScenarioChange?.(id)}
          fold={false}
          className="mt-5 max-w-[34rem]"
        />
      )}

      {plot.stale && (
        <p className="amw-wz-kicker mt-5 flex items-center gap-2">
          <AlertTriangle aria-hidden="true" className="size-3.5" />
          These figures were retrieved {plot.asOf} and are due a refresh.
        </p>
      )}

      <ul role="list" className="amw-jo-plot">
        {rows.map((row) => (
          <Row
            key={row.id + row.kind}
            row={row}
            domain={plot.domain}
            isUser={row.kind === 'user'}
            open={openId === row.id + row.kind}
            onToggle={() => toggle(row.id + row.kind)}
            panelId={`${baseId}-${row.kind}-${row.id}`}
          />
        ))}
      </ul>

      <p className="amw-wz-kicker mt-3.5">
        Market reference · {plot.marketReference.label} ·{' '}
        {fmtMoney(plot.marketReference.total)}
      </p>

      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
        {Object.values(plot.segments).map((s) => (
          <span key={s.id} className="amw-wz-kicker amw-jo-legend">
            <i className={SEGMENT_CLASS[s.id]} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      <p className="amw-wz-hint mt-3.5 max-w-[52rem]">
        {plot.caveats.join(' ')} Figures from{' '}
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2"
        >
          {plot.source}
        </a>
        , rolling window, retrieved {plot.asOf}.
      </p>
    </section>
  )
}

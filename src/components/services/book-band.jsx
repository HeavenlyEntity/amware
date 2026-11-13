import { DepositRiskReversal } from '@/components/commerce/DepositRiskReversal'
import { GlassPanel } from '@/components/founders/desk/glass-panel'
import { SERVICES_PAGE } from '@/content/site/services-page'
import { StrategyCallCta } from './strategy-call-cta'

/*
 * The book band (design: Main.dc.html S2): for the visitor who reached the
 * bottom without picking a track. Copy and the strategy-call action on the
 * left, the FluidGlass lens on the right.
 *
 * The action sits inside DepositRiskReversal (F15), so the first-call value
 * and the refund line read here exactly as they do on every card that takes
 * the same deposit. Without a booking link it is the contact form, with no
 * deposit terms around it.
 *
 * The lens is the desk's GlassPanel: a static "Scope first." poster on the
 * server, on phones, touch screens and under reduced motion, and the WebGL
 * lens only once the band is near the viewport. No `crown` shape (F9): the
 * repo's FluidGlass has none.
 */

export const BOOK_LENS = {
  fontSize: 104,
  shape: 'diamond',
  shapes: ['diamond', 'torus', 'prism', 'cube'],
  size: 240,
  refraction: 1.1,
  dispersion: 0.45,
  reflection: 1.1,
  shadow: 0.6,
  elevation: 0.45,
  interaction: 'follow',
  smoothness: 0.55,
  wobble: 0.5,
  spin: 0.3,
  position: [0.5, 0.5],
}

export function BookBand({ booking }) {
  const { eyebrow, title, copy, glass, hint } = SERVICES_PAGE.band
  const row = (
    <div className="svc-book-row">
      <StrategyCallCta booking={booking} />
    </div>
  )

  return (
    <section
      id="book"
      aria-labelledby="book-title"
      className="svc-wrap svc-book"
    >
      <div className="svc-book-card">
        <div className="svc-book-copy">
          <p className="svc-eyebrow">
            <span aria-hidden="true">{`// SEC.${eyebrow.index} / `}</span>
            {eyebrow.label}
          </p>
          <h2 id="book-title" className="svc-book-title">
            {title}
          </h2>
          <p className="svc-book-lede">{copy}</p>
          {booking ? (
            <DepositRiskReversal className="svc-book-terms">
              {row}
            </DepositRiskReversal>
          ) : (
            <div className="svc-book-terms">{row}</div>
          )}
        </div>
        <GlassPanel
          className="svc-book-glass"
          lens={{ text: glass, ...BOOK_LENS }}
          lazy
        >
          <span className="amw-glass-tag amw-glass-br amw-glass-live-only">
            {hint}
          </span>
        </GlassPanel>
      </div>
    </section>
  )
}

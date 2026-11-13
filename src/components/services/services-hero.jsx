import { SERVICES_PAGE } from '@/content/site/services-page'
import { AsciiField } from './ascii-field'
import { StrategyCallCta } from './strategy-call-cta'
import { WorkWall } from './work-wall'

/*
 * The /services hero (design: Main.dc.html S0, HeroMobile.dc.html).
 *
 * One card, one copy column, two backdrops: from 768px the project work wall
 * behind a left-to-right scrim, below it a full-height card with the ASCII
 * field showing through the bottom third. Both are in the server HTML and the
 * breakpoint picks one in CSS, so there is no hydration fork, and each
 * backdrop only starts its own script where it is shown.
 *
 * The filled action opens the strategy-call popup directly (F8); "compare
 * engagements" scrolls to the tracks. No figure under the actions: the
 * advisory side quotes none, and the popup shows the deposit before it is
 * charged. Under them, the deposit's refund term when the call takes one,
 * and only the call's length when it is the contact form.
 *
 * Props: { booking: { link, namespace } | null }.
 */

export function ServicesHero({ booking }) {
  const { eyebrow, location, title, lede, compare, callNote, refundNote } =
    SERVICES_PAGE.hero
  return (
    <section aria-labelledby="hero-title" className="svc-wrap svc-hero-section">
      <div className="svc-hero">
        <WorkWall className="svc-hero-wall" />
        <AsciiField variant="hero" className="svc-hero-field" />
        <div aria-hidden="true" className="svc-hero-scrim" />

        <div className="svc-hero-copy">
          <div className="svc-hero-meta svc-rise" style={{ '--d': '.05s' }}>
            <p className="svc-eyebrow">
              <span aria-hidden="true">{`// SEC.${eyebrow.index} / `}</span>
              {eyebrow.label}
            </p>
            <span aria-hidden="true" className="svc-hero-rule" />
            <p className="svc-hero-location">{location}</p>
          </div>

          <h1
            id="hero-title"
            className="svc-hero-title svc-rise"
            style={{ '--d': '.1s' }}
          >
            {title}
          </h1>
          <p className="svc-hero-lede svc-rise" style={{ '--d': '.18s' }}>
            {lede}
          </p>

          <div className="svc-hero-ctas svc-rise" style={{ '--d': '.26s' }}>
            <StrategyCallCta booking={booking} />
            <a href="#engagements" className="svc-quiet">
              {compare} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p
            className="svc-price svc-hero-price svc-rise"
            style={{ '--d': '.3s' }}
          >
            {booking ? refundNote : callNote}
          </p>
        </div>
      </div>
    </section>
  )
}

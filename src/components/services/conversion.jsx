import { SERVICES_PAGE, faqItems } from '@/content/site/services-page'
import { StrategyCallCta } from './strategy-call-cta'

/*
 * The conversion pass on /services (design: ServicesConvert.dc.html,
 * 2026-11-12): the sections that turn a reader into a booked call.
 *
 * - PainPoints: "Sound familiar?", the buyer's problems in their own words,
 *   with the strategy call right under them.
 * - RiskReversal: the risk reversal, from the deposit's real terms.
 * - FitCheck: who this is for and who it isn't.
 * - ServicesFaq: the objections, answered. Native <details>, so it opens
 *   without JavaScript; the page publishes the same answers as FAQPage data.
 *
 * All server components. Copy lives in content/site/services-page.js.
 */

function EyebrowRow({ label, kicker }) {
  return (
    <div className="svc-eyebrow-row">
      <p className="svc-eyebrow">
        <span aria-hidden="true">{'// '}</span>
        {label}
      </p>
      {kicker ? (
        <>
          <span aria-hidden="true" className="svc-rule" />
          <p className="svc-price">{kicker}</p>
        </>
      ) : null}
    </div>
  )
}

function Mark({ kind }) {
  return (
    <span aria-hidden="true" className={`svc-mark svc-mark--${kind}`}>
      {kind === 'yes' ? '✓' : '×'}
    </span>
  )
}

export function PainPoints({ booking }) {
  const { eyebrow, kicker, title, items } = SERVICES_PAGE.pain
  return (
    <section aria-labelledby="pain-title" className="svc-wrap svc-pain">
      <EyebrowRow label={eyebrow} kicker={kicker} />
      <h2 id="pain-title" className="svc-h2 svc-cv-title">
        {title}
      </h2>
      <ul role="list" className="svc-cv-grid">
        {items.map((item) => (
          <li key={item} className="svc-cv-card svc-cv-item">
            <Mark kind="no" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="svc-cv-cta">
        <StrategyCallCta booking={booking} />
      </div>
    </section>
  )
}

export function RiskReversal() {
  const { eyebrow, kicker, title, copy } = SERVICES_PAGE.promise
  return (
    <section aria-labelledby="promise-title" className="svc-wrap svc-cv">
      <div className="svc-promise">
        <EyebrowRow label={eyebrow} kicker={kicker} />
        <h2 id="promise-title" className="svc-h2 svc-cv-title">
          {title}
        </h2>
        <p className="svc-cv-lede">{copy}</p>
      </div>
    </section>
  )
}

export function FitCheck() {
  const { eyebrow, kicker, title, forLabel, notForLabel, forYou, notForYou } =
    SERVICES_PAGE.fit
  const column = (label, items, kind) => (
    <div className="svc-cv-card">
      <h3 className="svc-eyebrow">
        <span aria-hidden="true">{'// '}</span>
        {label}
      </h3>
      <ul role="list" className="svc-cv-list">
        {items.map((item) => (
          <li key={item} className="svc-cv-item">
            <Mark kind={kind} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <section aria-labelledby="fit-title" className="svc-wrap svc-cv">
      <EyebrowRow label={eyebrow} kicker={kicker} />
      <h2 id="fit-title" className="svc-h2 svc-cv-title">
        {title}
      </h2>
      <div className="svc-cv-grid">
        {column(forLabel, forYou, 'yes')}
        {column(notForLabel, notForYou, 'no')}
      </div>
    </section>
  )
}

export function ServicesFaq({ hasDeposit }) {
  const { eyebrow, title } = SERVICES_PAGE.faq
  return (
    <section aria-labelledby="faq-title" className="svc-wrap svc-cv">
      <EyebrowRow label={eyebrow} />
      <h2 id="faq-title" className="svc-h2 svc-cv-title">
        {title}
      </h2>
      <div className="svc-faq">
        {faqItems(hasDeposit).map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

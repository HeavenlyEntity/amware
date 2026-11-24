import Link from 'next/link'
import {
  Braces,
  CreditCard,
  Database,
  DatabaseBackup,
  KeyRound,
  LogIn,
  Rocket,
  UserCog,
} from 'lucide-react'
import { StepsRail } from '@/components/blocks/how-it-works-10'
import { IntroCallTerms } from '@/components/commerce/IntroCallTerms'
import { SectionHeader } from '@/components/services/section-header'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'
import { DiagnosticCta } from './diagnostic-cta'

/*
 * The Codebase Diagnostic page below the hero (design:
 * boards/Diagnostic.dc.html): how it starts, what I read, what you get, the
 * promise, what comes next, and the closing band. Server components on the
 * /services classes; every word comes from content/site/codebase-diagnostic.js.
 *
 * Each numbered section is a plain `.svc-wrap` section on the page's normal
 * surface (the steps rail's colours assume it), labelled by its
 * SectionHeader title. The board rules every section off with a dashed
 * line; SectionHeader's own dashed rule is that line here, so only the
 * closing band, which has no SectionHeader, draws one of its own.
 */

/* `review.items[].icon` names a lucide-react export; only these eight. */
const ICONS = {
  Braces,
  CreditCard,
  Database,
  DatabaseBackup,
  KeyRound,
  LogIn,
  Rocket,
  UserCog,
}

const PROMISE_LABELS = { forYou: 'For you if', notForYou: 'Not for you if' }

/* An eyebrow written with its `// ` prefix: the slashes are decoration. */
export function SlashEyebrow({ text, className = '', style }) {
  const plain = text.replace(/^\/\/\s*/, '')
  return (
    <p className={`svc-eyebrow ${className}`.trim()} style={style}>
      {plain !== text ? <span aria-hidden="true">{'// '}</span> : null}
      {plain}
    </p>
  )
}

/* A link label written with a trailing arrow: the arrow is decoration. */
export function Arrowed({ text }) {
  const match = text.match(/^(.*?)\s*([→↓])$/)
  if (!match) return text
  return (
    <>
      {match[1]} <span aria-hidden="true">{match[2]}</span>
    </>
  )
}

function Mark() {
  return (
    <span aria-hidden="true" className="svc-mark svc-mark--yes">
      ✓
    </span>
  )
}

/* `split` puts the header in one column and the content beside it from
   `lg`, as the board draws "What you get"; stacked below that. */
function Section({ id, content, split = false, children }) {
  const header = (
    <SectionHeader
      id={id}
      index={content.index}
      eyebrow={content.eyebrow}
      meta={content.meta}
      title={content.title}
      copy={content.copy}
    />
  )
  return (
    <section className="svc-wrap dg-section" aria-labelledby={id}>
      {split ? (
        <div className="dg-split">
          {header}
          {children}
        </div>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
    </section>
  )
}

export function HowItStarts() {
  return (
    <Section id="dg-start" content={DIAGNOSTIC.start}>
      <StepsRail steps={DIAGNOSTIC.start.steps} className="mt-12 lg:mt-16" />
    </Section>
  )
}

export function ReviewGrid() {
  const { items } = DIAGNOSTIC.review
  return (
    <Section id="dg-review" content={DIAGNOSTIC.review}>
      <ul role="list" className="svc-cv-grid dg-review-grid">
        {items.map((item) => {
          const Icon = ICONS[item.icon]
          return (
            <li key={item.title} className="svc-cv-card">
              <div className="flex items-center gap-2.5">
                {Icon ? (
                  <Icon
                    aria-hidden="true"
                    className="text-[var(--amw-accent-ink)] h-5 w-5 shrink-0"
                    strokeWidth={1.5}
                  />
                ) : null}
                <span className="amw-kicker">{item.kicker}</span>
              </div>
              <h3 className="text-[var(--svc-head)] mt-3.5 text-[1.0625rem] font-medium leading-relaxed">
                {item.title}
              </h3>
              <p className="text-[var(--amw-mut)] mt-1.5 text-sm leading-relaxed">
                {item.copy}
              </p>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

export function ReportPanel() {
  const { items, specs } = DIAGNOSTIC.report
  return (
    <Section id="report" content={DIAGNOSTIC.report} split>
      <div className="svc-cv-card dg-report">
        <div className="svc-cv-grid">
          <ul role="list" className="svc-cv-list">
            {items.map((item) => (
              <li key={item} className="svc-cv-item">
                <Mark />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <dl className="m-0 self-start">
            {specs.map((spec) => (
              <div
                key={spec.term}
                className="border-[var(--amw-line)] flex items-baseline justify-between gap-4 border-b border-dashed py-3 first:pt-0"
              >
                <dt className="amw-kicker">{spec.term}</dt>
                <dd className="text-[var(--svc-head)] m-0 text-right text-[0.9375rem]">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}

/* The board draws the two columns differently: "For you if" is a filled
   card with an accent kicker and ticks; "Not for you if" has no fill, a
   dashed edge, muted text and a plain mono ×, so it reads as the quieter
   of the two. */
export function PromiseFit() {
  const { forYou, notForYou } = DIAGNOSTIC.promise
  return (
    <Section id="dg-promise" content={DIAGNOSTIC.promise}>
      <div className="svc-cv-grid">
        <div className="svc-cv-card">
          <h3 className="svc-eyebrow">
            <span aria-hidden="true">{'// '}</span>
            {PROMISE_LABELS.forYou}
          </h3>
          <ul role="list" className="svc-cv-list">
            {forYou.map((item) => (
              <li key={item} className="svc-cv-item">
                <Mark />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="svc-cv-card dg-fit-not">
          <h3 className="svc-eyebrow">
            <span aria-hidden="true">{'// '}</span>
            {PROMISE_LABELS.notForYou}
          </h3>
          <ul role="list" className="svc-cv-list">
            {notForYou.map((item) => (
              <li key={item} className="svc-cv-item">
                <span aria-hidden="true" className="dg-fit-x">
                  ×
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

export function NextSteps() {
  const { cards, link } = DIAGNOSTIC.next
  return (
    <Section id="dg-next" content={DIAGNOSTIC.next}>
      <ul role="list" className="svc-cv-grid">
        {cards.map((card) => (
          <li key={card.title} className="svc-cv-card">
            <span className="amw-kicker">{card.kicker}</span>
            <h3 className="text-[var(--svc-head)] mt-4 text-xl font-medium tracking-tight">
              {card.title}
            </h3>
            <p className="text-[var(--amw-mut)] mt-2 text-sm leading-relaxed">
              {card.copy}
            </p>
          </li>
        ))}
      </ul>
      <Link href={link.href} className="svc-quiet mt-6">
        <Arrowed text={link.label} />
      </Link>
    </Section>
  )
}

export function ClosingBand({ booking }) {
  const { eyebrow, title, copy, cta } = DIAGNOSTIC.band
  const action = <DiagnosticCta booking={booking} label={cta} />
  return (
    <section
      aria-labelledby="dg-band-title"
      className="svc-wrap svc-cv dg-band"
    >
      <div className="svc-promise">
        <SlashEyebrow text={eyebrow} />
        <h2 id="dg-band-title" className="svc-h2 svc-cv-title">
          {title}
        </h2>
        <p className="svc-cv-lede">{copy}</p>
        <div className="svc-book-terms">
          {booking ? <IntroCallTerms>{action}</IntroCallTerms> : action}
        </div>
      </div>
    </section>
  )
}

import { IntroCallTerms } from '@/components/commerce/IntroCallTerms'
import { AsciiField } from '@/components/services/ascii-field'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'
import { DiagnosticCta } from './diagnostic-cta'
import { Arrowed, SlashEyebrow } from './diagnostic-sections'

/*
 * The Codebase Diagnostic hero (design: boards/Diagnostic.dc.html, first
 * section): one rounded panel with the ASCII field running behind a scrim,
 * the copy on the left and the sample report card beside it (under it below
 * `lg`).
 *
 * The only action is the free intro call, inside IntroCallTerms so the
 * "Intro call · 15 min · free" line reads as it does on /services. No price
 * and no deposit checkout: the deposit is taken after the strategy call,
 * from a page of its own.
 *
 * The sample card is an illustration with made-up findings. Its caption
 * says so in visible text, as the figure's caption, so it is read with it.
 *
 * Props: { booking: { link, namespace } | null }.
 */

function SampleReport() {
  const { title, tag, findings, caption } = DIAGNOSTIC.sample
  return (
    <figure className="dg-sample svc-rise" style={{ '--d': '.34s' }}>
      <div className="dg-sample-bar">
        <p className="amw-kicker dg-sample-title">{title}</p>
        <span className="amw-chip">{tag}</span>
      </div>
      <ol role="list" className="dg-findings">
        {findings.map((finding) => (
          <li key={finding.level} className="dg-finding">
            <span className="dg-level">{finding.level}</span>
            <div className="dg-finding-body">
              <p className="dg-finding-title">{finding.title}</p>
              <p className="dg-finding-note">{finding.note}</p>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="dg-sample-caption">{caption}</figcaption>
    </figure>
  )
}

export function DiagnosticHero({ booking }) {
  const { eyebrow, chips, title, lede, cta, secondary, note } = DIAGNOSTIC.hero
  return (
    <section aria-labelledby="dg-title" className="svc-wrap dg-hero-section">
      <div className="dg-hero">
        <AsciiField variant="panel" className="dg-hero-field" />
        <div aria-hidden="true" className="dg-hero-scrim" />

        <div className="dg-hero-inner">
          <div className="dg-hero-copy">
            <SlashEyebrow
              text={eyebrow}
              className="svc-rise"
              style={{ '--d': '.05s' }}
            />
            <ul
              role="list"
              className="dg-chips svc-rise"
              style={{ '--d': '.08s' }}
            >
              {chips.map((chip) => (
                <li key={chip} className="amw-chip">
                  {chip}
                </li>
              ))}
            </ul>
            <h1
              id="dg-title"
              className="svc-hero-title svc-rise"
              style={{ '--d': '.1s' }}
            >
              {title}
            </h1>
            <p className="svc-hero-lede svc-rise" style={{ '--d': '.18s' }}>
              {lede}
            </p>

            <div className="dg-hero-terms svc-rise" style={{ '--d': '.26s' }}>
              {booking ? (
                <IntroCallTerms>
                  <DiagnosticCta booking={booking} label={cta} />
                </IntroCallTerms>
              ) : (
                <DiagnosticCta booking={null} label={cta} />
              )}
              <div className="dg-hero-more">
                <a href={secondary.href} className="svc-quiet">
                  <Arrowed text={secondary.label} />
                </a>
                <p className="svc-price">{note}</p>
              </div>
            </div>
          </div>

          <SampleReport />
        </div>
      </div>
    </section>
  )
}

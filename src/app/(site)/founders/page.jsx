import { withSocialImage } from '@/lib/social/metadata'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import { FoundersDeskDock } from '@/components/founders/desk-dock'
import { DeskBackdrop } from '@/components/founders/desk/desk-backdrop'
import { DeskComing } from '@/components/founders/desk/desk-coming'
import { DeskExample } from '@/components/founders/desk/desk-example'
import { DeskPath } from '@/components/founders/desk/desk-path'
import { GlassPanel } from '@/components/founders/desk/glass-panel'
import { TrackedLink } from '@/components/founders/desk/spotlight-link'
import { deskLanding } from '@/lib/founders/desk-landing'
import { ASK_HREF, EQUITY_HREF } from '@/lib/founders/tools'
import '@/styles/founders-desk.css'

export const metadata = withSocialImage(
  {
    title: 'Founders’ Desk',
    description:
      'Tools for the person who builds the thing. Find out whether you are being sized as a hire while doing founder work, then what to ask for instead, in cash and equity, with the market data behind each number.',
  },
  'founders'
)

/* The desk landing (design: the Founders' Desk board, Desk.dc.html).

   ONE FILLED ACTION, ONE PATH. The hero has exactly one primary button, "Read
   my offer". The second tool is never a rival button beside it: it is the
   second half of one path, reached by a text link for the reader who already
   knows where they stand, and drawn further down as "One path. Two stops.",
   two numbered cards joined by a line. Those cards are outlined surfaces with
   a text action, so the page still reads as one way in rather than a menu;
   the landing test holds it to exactly one filled CTA.

   EVERYTHING IS COMPUTED HERE, ON THE SERVER. `deskLanding()` runs the engine
   and reads the benchmark sources, then hands plain data to the two client
   islands (the gap slider and the copyable ladder). Doing it in the browser
   would ship the engine and the salary band table to every visitor for a
   handful of numbers. The figures are generated, never typed, so they cannot
   drift from the tools.

   STORE-FREE. The slider is a throwaway what-if; nothing on this page reads
   or writes the offer store, so it needs no hydration gate. */

/* Each has to stay true: analytics are value-free and answers live in this
   browser: sessionStorage, or localStorage once the visitor asks the desk to
   remember them (offer-store.js). */
const TICKS = [
  'No account',
  'Every number has a source',
  'Nothing leaves your browser',
]

export default function FoundersDeskPage() {
  const data = deskLanding()
  const { example } = data
  const lensText = `${example.offer}% → ${example.numberToSay}%`

  return (
    <div className="amw amw-dk relative isolate">
      <DeskBackdrop />

      <section
        className="amw-dk-wrap amw-dk-hero-section"
        aria-labelledby="desk-title"
      >
        <div className="amw-dk-hero">
          <div className="amw-dk-hero-copy">
            <div className="amw-dk-rise" style={{ '--d': '.1s' }}>
              <SectionEyebrow index="00" label="Founders’ Desk" />
            </div>
            <h1
              id="desk-title"
              className="amw-dk-h1 amw-dk-rise"
              style={{ '--d': '.2s' }}
            >
              Are you being sized as a hire while doing founder work?
            </h1>
            <p className="amw-dk-sub amw-dk-rise" style={{ '--d': '.45s' }}>
              Find the range to say out loud, then the number to ask for.
            </p>
            <div
              className="amw-dk-cta-row amw-dk-rise"
              style={{ '--d': '.6s' }}
            >
              <TrackedLink
                href={EQUITY_HREF}
                data-desk-primary=""
                className="amw-dk-cta"
              >
                <span>Read my offer</span>
                <span className="amw-dk-cta-dot" aria-hidden="true">
                  <ChevronRight className="size-4 relative left-px" />
                </span>
              </TrackedLink>
              {/* Not an alternative to the button: the stop after it, for
                  someone who already knows where they stand. */}
              <p className="amw-dk-secondary">
                Already know where you stand?{' '}
                <Link href={ASK_HREF} className="amw-dk-link">
                  Turn it into an ask{' '}
                  <span className="amw-dk-arr" aria-hidden="true">
                    →
                  </span>
                </Link>
              </p>
            </div>
            <ul className="amw-dk-ticks-list">
              {TICKS.map((tick, index) => (
                <li
                  key={tick}
                  className="amw-dk-rise"
                  style={{ '--d': `${0.75 + index * 0.1}s` }}
                >
                  <svg
                    className="amw-dk-tick"
                    style={{ '--d': `${0.9 + index * 0.1}s` }}
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {tick}
                </li>
              ))}
            </ul>
          </div>

          {/* Decorative: the worked example as a lens over its own numbers.
              The figures it shows are stated in text in the panel below. */}
          <div
            className="amw-dk-rise"
            style={{ '--d': '.5s' }}
            data-print="hide"
          >
            <GlassPanel
              className="amw-dk-glass"
              lens={{
                text: lensText,
                shape: 'lens',
                shapes: ['lens', 'pill', 'blob', 'prism'],
                size: 210,
                refraction: 1,
                dispersion: 0.5,
                reflection: 1,
                shadow: 0.55,
                elevation: 0.5,
                interaction: 'follow',
                smoothness: 0.5,
                wobble: 0.55,
                spin: 0.3,
                position: [0.3, 0.5],
              }}
            >
              <span className="amw-glass-tag amw-glass-tl">
                The worked example
              </span>
              <span className="amw-glass-tag amw-glass-bl">
                Offered <b>{example.offer}%</b> · the number to say is{' '}
                <b>{example.numberToSay}%</b>
              </span>
              <span className="amw-glass-tag amw-glass-br amw-glass-live-only">
                Move to look closer · click to reshape
              </span>
            </GlassPanel>
          </div>
        </div>
      </section>

      <DeskExample data={data} />
      <DeskPath live={data.live} />
      <DeskComing soon={data.soon} />

      <FoundersDeskDock current="desk" />
    </div>
  )
}

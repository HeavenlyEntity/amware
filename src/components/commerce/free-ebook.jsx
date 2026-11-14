import Image from 'next/image'
import { CalendarCheck, Mail, TrendingUp } from 'lucide-react'
import { FREE_EBOOK } from '@/content/site/free-ebook'
import cover from '@/images/ebooks/visitors-into-buyers-cover.jpg'
import '@/styles/free-ebook.css'

const ICON = { call: CalendarCheck, mail: Mail, grow: TrendingUp }

/**
 * The free ebook that comes with booking the intro call, as a small box
 * inside IntroCallTerms (design: HomePricing.dc.html, 2026-11-13): the
 * ebook's cover and name (the cover rebuilt in AMWARE teal from the
 * Entrepedia original; source in docs/design/2026-11-13-ai-search-checklist/
 * ebook-cover), then Book the call → Get the ebook → Win more buyers on a
 * rail that fills in turn. The rail and the steps' pulse are decoration:
 * they run three times and then rest on a full rail, and under reduced
 * motion they never run. The list itself carries the meaning.
 *
 * The ebook goes out with the intro call's booking confirmation, so only
 * IntroCallTerms shows this box; the deposit-only terms promise nothing.
 *
 * `tone` is IntroCallTerms' TONE entry, so the text reads on a regular card
 * and on a popular card's deep teal.
 */
export function FreeEbook({ tone, className = '' }) {
  const { kicker, title, steps } = FREE_EBOOK
  return (
    <div className={className ? `fe ${className}` : 'fe'}>
      <div className="fe-head">
        {/* The title beside it names the book, so the cover is decoration. */}
        <Image src={cover} alt="" sizes="48px" className="fe-cover" />
        <div>
          <p className="amw-kicker fe-kick text-(--amw-accent-ink)">{kicker}</p>
          <p className={`fe-name ${tone.lead}`}>{title}</p>
        </div>
      </div>
      <div className="fe-path">
        <span className="fe-line" aria-hidden="true">
          <span className="fe-line-lit" />
        </span>
        {/* role="list" keeps the list in Safari, which drops it under
            list-style: none. */}
        <ol className="fe-flow" role="list" aria-label="How you get the ebook">
          {steps.map((step) => {
            const Icon = ICON[step.icon]
            return (
              <li key={step.label} className="fe-step">
                <span className="fe-node" aria-hidden="true">
                  <Icon className="h-[15px] w-[15px]" />
                </span>
                <p className={`fe-label ${tone.lead}`}>{step.label}</p>
                <p className={`fe-sub ${tone.body}`}>{step.sub}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

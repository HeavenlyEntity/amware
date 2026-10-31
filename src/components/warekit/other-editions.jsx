import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { STANDARD_STACK } from '@/content/site/warekit'
import { Reveal } from './reveal'

/* One quiet card, so the NetSuite funnel keeps the focus. */
export function OtherEditions() {
  return (
    <section aria-labelledby="pr-oe-title" className="pj-wrap pj-section">
      <Reveal>
        <p className="pj-kicker">Other editions</p>
        <Link
          href="/products/standard"
          className="oe-card"
          aria-labelledby="pr-oe-title"
        >
          <span className="ed-badge">
            <i />
            In development
          </span>
          <span className="oe-main">
            <b id="pr-oe-title">Not on NetSuite? WareKit Standard edition.</b>
            <span className="oe-copy">
              For SaaS products and internal tools. Pick your data layer and get
              notified when that kit ships.
            </span>
            <span className="oe-stack">
              {STANDARD_STACK.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </span>
          </span>
          <span className="oe-go">
            Get notified
            <i aria-hidden="true">
              <ChevronRight width={14} height={14} strokeWidth={2.5} />
            </i>
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

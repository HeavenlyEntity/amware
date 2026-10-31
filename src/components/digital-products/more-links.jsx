import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { PackIcon } from '@/components/icon-pack'
import { NEXT_LINKS } from '@/content/site/digital-products'
import { Reveal } from '@/components/warekit/reveal'

export function MoreLinks() {
  return (
    <section aria-labelledby="gd-next-title" className="pj-wrap pj-section">
      <Reveal>
        <p className="pj-kicker">Need more than a guide?</p>
        <h2 id="gd-next-title" className="pj-h2 gd-next-title">
          A course, a codebase, or someone to do it.
        </h2>
        <div className="gd-next">
          {NEXT_LINKS.map(({ href, title, copy, icon }) => (
            <Link key={href} href={href} className="gd-link pi-host">
              <span className="pi-tile" aria-hidden="true">
                <PackIcon name={icon} size={30} />
              </span>
              <span>
                <b>{title}</b>
                <span className="gd-ls">{copy}</span>
              </span>
              <span className="gd-arr" aria-hidden="true">
                <ArrowUpRight width={18} height={18} />
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

import Link from 'next/link'
import { ArrowLeftRight, Percent } from 'lucide-react'

import { toolNumber } from '@/components/founders/desk-back-link'
import { Reveal } from '@/components/founders/desk/reveal'
import { SpotlightLink } from '@/components/founders/desk/spotlight-link'
import { REVIEW_HREF } from '@/lib/founders/tools'

/*
 * "One path. Two stops." The two live tools as the two halves of one path,
 * numbered and joined by a line, not as a menu to choose from: the hero still
 * has exactly one filled action, and these cards are outlined surfaces whose
 * action is a mono text link. Card 01 says "Read my offer" too, on purpose:
 * same action, same words.
 *
 * Server component; the only client part is the link's pointer spotlight.
 */

const ICONS = { Percent, ArrowLeftRight }

export function DeskPath({ live }) {
  return (
    <section className="amw-dk-wrap amw-dk-path" aria-labelledby="path-title">
      <Reveal>
        <p className="amw-eyebrow">
          <span aria-hidden="true">{'// SEC.01 / '}</span>At the desk
        </p>
        <h2 id="path-title" className="amw-dk-h2">
          One path. Two stops.
        </h2>
        <p className="amw-dk-lede">
          Find where your offer sits, then turn the gap into a number you can
          say out loud.
        </p>
      </Reveal>

      <Reveal className="amw-dk-steps-wrap" delay={0.1}>
        <ol className="amw-dk-steps">
          {live.map((tool) => {
            const Icon = ICONS[tool.icon] ?? Percent
            return (
              <li key={tool.id} className="amw-dk-step-item">
                <SpotlightLink href={tool.href} className="amw-dk-step">
                  <span className="amw-dk-step-top">
                    <span className="amw-dk-tile" aria-hidden="true">
                      <Icon className="size-[22px]" strokeWidth={2} />
                    </span>
                    <span className="amw-dk-num" aria-hidden="true">
                      {toolNumber(tool.id)}
                    </span>
                  </span>
                  <span className="amw-dk-step-body">
                    <span className="amw-kicker amw-dk-kicker-block">
                      {tool.kicker}
                    </span>
                    <span className="amw-dk-step-title">{tool.label}</span>
                    <span className="amw-dk-step-blurb">{tool.blurb}</span>
                  </span>
                  <span className="amw-dk-step-go">
                    {tool.cta} <span aria-hidden="true">→</span>
                  </span>
                </SpotlightLink>
              </li>
            )
          })}
        </ol>
        {live.length === 2 ? (
          <span
            className="amw-dk-link-line"
            aria-hidden="true"
            data-print="hide"
          />
        ) : null}
      </Reveal>

      <Reveal as="p" className="amw-dk-aside" delay={0.2}>
        Prefer a person to read it?{' '}
        <Link href={REVIEW_HREF} className="amw-dk-link">
          Have Alec review your offer{' '}
          <span className="amw-dk-arr" aria-hidden="true">
            →
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

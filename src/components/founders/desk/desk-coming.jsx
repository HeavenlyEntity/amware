import Image from 'next/image'
import { Lock } from 'lucide-react'

import { Reveal } from '@/components/founders/desk/reveal'

/*
 * "Coming to the desk": the tools still being built, from the registry, with
 * the same recoloured art the dock uses (public/images/founders/soon/). Locked
 * and dimmed at rest; hovering one wakes its art. Not links: there is nowhere
 * to go yet. The count is the registry's, never typed.
 */
export function DeskComing({ soon }) {
  if (!soon.length) return null
  return (
    <section
      className="amw-dk-wrap amw-dk-coming"
      aria-labelledby="coming-title"
    >
      <Reveal className="amw-dk-head">
        <h2 id="coming-title" className="amw-dk-h3">
          Coming to the desk
        </h2>
        <p className="amw-kicker amw-dk-kicker">{soon.length} in the works</p>
      </Reveal>
      <Reveal as="ul" className="amw-dk-soon-list" delay={0.1}>
        {soon.map((tool, index) => (
          <li
            key={tool.id}
            className="amw-dk-soon"
            style={{ '--d': `${index * 0.6}s` }}
          >
            <span className="amw-dk-soon-tile" data-locked="">
              <Image src={tool.art} alt="" width={34} height={34} unoptimized />
              <span className="amw-dk-soon-lock" aria-hidden="true">
                <Lock className="size-2.5" strokeWidth={3} />
              </span>
            </span>
            <span className="amw-dk-soon-body">
              <span className="amw-dk-soon-title">
                {tool.label}{' '}
                <span className="amw-dk-tag">
                  <i aria-hidden="true" />
                  Soon
                </span>
              </span>
              <span className="amw-dk-soon-blurb">{tool.blurb}</span>
            </span>
          </li>
        ))}
      </Reveal>
    </section>
  )
}

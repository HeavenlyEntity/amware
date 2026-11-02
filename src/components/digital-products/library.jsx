'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { FILTERS, LIB, NOT_ON_SALE } from '@/content/site/digital-products'
import { Reveal } from '@/components/warekit/reveal'
import { ChecklistCover, PlaybookCover } from './doc-covers'

const countFor = (id) =>
  id === 'all' ? LIB.length : LIB.filter((c) => c.for.includes(id)).length

/* Only the playbook's card depends on Payload. "One-time" is a claim that
   holds while it can be bought, so the price line says so when it can't. */
function cardView(card, guide) {
  if (card.id !== 'play') return card
  return {
    ...card,
    kicker: guide.pages ? `${card.kicker} · ${guide.pages} pages` : card.kicker,
    price: guide.price,
    priceSub: guide.onSale ? 'One-time' : NOT_ON_SALE,
  }
}

function Card({ card, guide, dim }) {
  const reduced = useReducedMotion()
  const spot = (e) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const {
    id,
    badge,
    dot,
    kicker,
    title,
    copy,
    tags,
    price,
    priceSub,
    cta,
    tone,
    target,
  } = cardView(card, guide)

  return (
    <article className="gd-card" data-dim={dim} onMouseMove={spot}>
      <div className="gd-card-art" aria-hidden="true">
        <span className="gd-badge" style={{ '--c': dot }}>
          <i />
          {badge}
        </span>
        {id === 'play' ? (
          <PlaybookCover pages={guide.pages} />
        ) : (
          <ChecklistCover />
        )}
      </div>
      <div className="gd-card-body">
        <p className="pj-kicker">{kicker}</p>
        <h3>{title}</h3>
        <p className="gd-copy">{copy}</p>
        <div className="gd-for">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="gd-card-foot">
          <div>
            {price && <span className="gd-price">{price}</span>}
            <span className="gd-price-sub">{priceSub}</span>
          </div>
          <a href={`#${target}`} className="gd-cta" data-tone={tone}>
            {cta}
            <i aria-hidden="true">
              <ChevronRight width={14} height={14} strokeWidth={2.5} />
            </i>
          </a>
        </div>
      </div>
    </article>
  )
}

export function Library({ guide }) {
  const [filter, setFilter] = useState('all')

  return (
    <section
      id="gd-lib"
      aria-labelledby="gd-lib-title"
      className="pj-wrap pj-section pr-first gd-anchor"
    >
      <Reveal className="gd-lib-top">
        <div>
          <p className="pj-kicker">01 · The library</p>
          <h2 id="gd-lib-title" className="pj-h2">
            Start with what you need this week.
          </h2>
          <p className="pj-lead">
            Every guide comes out of an engagement. Pick by who you are. Courses
            live on their own page.
          </p>
        </div>
        <div className="gd-seg" role="group" aria-label="Filter by reader">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              <em>{countFor(id)}</em>
            </button>
          ))}
        </div>
      </Reveal>
      <Reveal className="gd-lib" delay={0.1}>
        {LIB.map((card) => (
          <Card
            key={card.id}
            card={card}
            guide={guide}
            dim={filter !== 'all' && !card.for.includes(filter)}
          />
        ))}
      </Reveal>
    </section>
  )
}

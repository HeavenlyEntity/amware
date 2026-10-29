'use client'

import { ArrowDown } from 'lucide-react'

import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { ProjectMark } from './project-media'
import { useCountUp } from './motion-hooks'

export function ProjectsHero({ total, stats, years, onOpen }) {
  const reduced = useReducedMotion()
  const k = useCountUp(true, { duration: 1400, delay: 500 })
  const n = (value) => Math.round(value * k)

  /* Dock-style magnification after the React Bits Dock: chips near the
     pointer grow. Written straight to each chip's style. */
  const dockMove = (e) => {
    if (reduced) return
    e.currentTarget.querySelectorAll('.pj-chip').forEach((chip) => {
      const r = chip.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 120)
      chip.style.setProperty('--mag', (1 + 0.42 * near * near).toFixed(3))
    })
  }
  const dockLeave = (e) => {
    e.currentTarget
      .querySelectorAll('.pj-chip')
      .forEach((chip) => chip.style.setProperty('--mag', '1'))
  }

  return (
    <section aria-labelledby="pj-title" className="pj-wrap">
      <div className="pj-hero pj-dark">
        <div className="pj-dither" aria-hidden="true">
          <Dither
            {...HERO_DITHER}
            className="absolute inset-0"
            enableMouseInteraction={!reduced}
            intro={!reduced}
            disableAnimation={reduced}
          />
        </div>
        <div className="pj-veil" aria-hidden="true" />
        <div className="pj-hero-in">
          <div className="pj-top">
            <div>
              <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
                {'// Field evidence · AMWARE'}
              </p>
              <h1
                id="pj-title"
                className="pj-title pj-rise"
                style={{ '--d': '.12s' }}
              >
                Shipped, not staged.
              </h1>
              <p className="pj-intro pj-rise" style={{ '--d': '.2s' }}>
                {total} builds across products, platforms, open source and
                internal tools. Every one of them met real users.
              </p>
              <div className="pj-hero-acts pj-rise" style={{ '--d': '.28s' }}>
                <a href="#pj-bench" className="pj-btn">
                  <span>See what&apos;s on the bench</span>
                  <span className="pj-btn-dot">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </a>
                <a href="#pj-close" className="pj-ghost">
                  Build with me <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <div className="pj-stats pj-rise" style={{ '--d': '.3s' }}>
              {[
                [stats.live, 'Live today', 'live'],
                [stats.development, 'In development', 'development'],
                [stats.oss, 'Open source'],
                [stats.years, 'Years shipping'],
              ].map(([value, label, dot]) => (
                <div key={label} className="pj-stat">
                  {/* The counting number is decorative; readers get the
                      final value once. */}
                  <strong>
                    <span aria-hidden="true">{n(value)}</span>
                    <span className="sr-only">{value}</span>
                  </strong>
                  <span>
                    {dot && (
                      <i className="pj-dot" data-s={dot} aria-hidden="true" />
                    )}
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pj-line pj-rise" style={{ '--d': '.4s' }}>
            <ol
              className="pj-years m-0 list-none p-0"
              style={{ '--cols': years.length }}
              onMouseMove={dockMove}
              onMouseLeave={dockLeave}
              aria-label="Builds by year"
            >
              {years.map((y) => (
                <li key={y.year} className="pj-year">
                  <span className="pj-year-label">{y.year}</span>
                  <div className="pj-year-dots">
                    {y.items.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        className="pj-chip"
                        onClick={(e) => onOpen(p.key, e.currentTarget)}
                        aria-label={`${p.name}, open the case study`}
                      >
                        <ProjectMark project={p} />
                        <i className="pj-dot" data-s={p.status} />
                        <span className="pj-tip" aria-hidden="true">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}

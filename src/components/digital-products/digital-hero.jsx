'use client'

import { useRef } from 'react'
import { ArrowDown, Check } from 'lucide-react'

import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { ChecklistCover, PlaybookCover } from './doc-covers'

/* Resting tilt of the fan; the pointer steers it from here. */
const TILT = { rx: 6, ry: -16 }

/* Decorative: both documents are in the library below. The tilt is written
   straight to the fan's style, so moving the pointer renders nothing.
   TODO(alec): "more on the way" is the board's; confirm it still holds. */
function DocumentFan({ pages }) {
  const reduced = useReducedMotion()
  const fan = useRef(null)
  const setTilt = ({ rx, ry }) => {
    fan.current.style.setProperty('--rx', `${rx}deg`)
    fan.current.style.setProperty('--ry', `${ry}deg`)
  }
  const tilt = (e) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    setTilt({
      rx: Math.round((TILT.rx - y * 14) * 10) / 10,
      ry: Math.round((TILT.ry + x * 24) * 10) / 10,
    })
  }

  return (
    <div
      className="gd-stage pj-rise"
      style={{ '--d': '.25s' }}
      aria-hidden="true"
      onMouseMove={tilt}
      onMouseLeave={() => setTilt(TILT)}
    >
      <div ref={fan} className="gd-fan">
        <ChecklistCover className="gd-d1" style={{ '--fd': '-2s' }} />
        <PlaybookCover className="gd-d3" pages={pages} />
      </div>
      <span className="pr-stage-tag">Two guides · more on the way</span>
    </div>
  )
}

function HeroChip({ children }) {
  return (
    <span className="pr-chip">
      <Check width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
      {children}
    </span>
  )
}

/* TODO(alec): the board says each guide "comes out of a real engagement",
   here and in the library lead. Confirm that holds for both. */
export function DigitalHero({ pages }) {
  const reduced = useReducedMotion()
  return (
    <section aria-labelledby="gd-title" className="pj-wrap">
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
        <div className="pr-hero-grid gd-hero-grid">
          <div className="relative z-[1]">
            <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
              {'// Digital products · by AMWARE'}
            </p>
            <h1
              id="gd-title"
              className="pr-title gd-title pj-rise"
              style={{ '--d': '.12s' }}
            >
              Playbooks from real client work.
            </h1>
            <p className="pj-intro pj-rise" style={{ '--d': '.2s' }}>
              Short, practical guides for founders and the engineers who work
              with them. Each one comes out of a real engagement.
            </p>
            <div className="pj-hero-acts pj-rise" style={{ '--d': '.28s' }}>
              <a href="#gd-lib" className="pj-btn">
                <span>Browse the library</span>
                <span className="pj-btn-dot">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
              <a href="#gd-flags" className="pj-ghost">
                Score your contract free <span aria-hidden="true">→</span>
              </a>
            </div>
            <div
              className="pr-chips gd-chips pj-rise"
              style={{ '--d': '.36s' }}
            >
              <HeroChip>Free checklist to start</HeroChip>
              <HeroChip>Written by a working fractional CTO</HeroChip>
            </div>
          </div>
          <DocumentFan pages={pages} />
        </div>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, Camera, Check, Github, Users } from 'lucide-react'

import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { FACTS } from '@/content/site/warekit'
import { COVERS } from './covers'
import { Reveal } from './reveal'

const FACT_ICONS = { github: Github, camera: Camera, users: Users }

/* Resting tilt of the fan; the pointer steers it from here. */
const TILT = { rx: 8, ry: -14 }

/* Decorative: the same editions are in the grid below. The tilt is written
   straight to the fan's style, so moving the pointer renders nothing. */
function CoverFan() {
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
      ry: Math.round((TILT.ry + x * 22) * 10) / 10,
    })
  }

  return (
    <div
      className="pr-stage pj-rise"
      style={{ '--d': '.25s' }}
      aria-hidden="true"
      onMouseMove={tilt}
      onMouseLeave={() => setTilt(TILT)}
    >
      <div ref={fan} className="pr-fan">
        <div className="pr-cover pr-c1" style={{ '--fd': '-2s' }}>
          <Image src={COVERS['react-lite']} alt="" sizes="420px" />
        </div>
        <div className="pr-cover pr-c2" style={{ '--fd': '-4s' }}>
          <Image src={COVERS['next-team']} alt="" sizes="420px" />
        </div>
        <div className="pr-cover pr-c3">
          <Image src={COVERS['next-pro']} alt="" sizes="420px" priority />
        </div>
      </div>
      <span className="pr-stage-tag">Concept covers · six editions</span>
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

/* The two chips are claims, so each shows only while it is true. */
export function EditionHero({ sale }) {
  const reduced = useReducedMotion()
  return (
    <section aria-labelledby="pr-title" className="pj-wrap">
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
        <div className="pr-hero-grid">
          <div className="relative z-[1]">
            <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
              {'// WareKit · NetSuite edition'}
            </p>
            <h1
              id="pr-title"
              className="pr-title pj-rise"
              style={{ '--d': '.12s' }}
            >
              Build the NetSuite app your team needs.
            </h1>
            <p className="pj-intro pj-rise" style={{ '--d': '.2s' }}>
              Choose a React app inside NetSuite or a Next.js app connected to
              it. Start with a working foundation.
            </p>
            <div className="pj-hero-acts pj-rise" style={{ '--d': '.28s' }}>
              <a href="#pr-run" className="pj-btn">
                <span>Find your edition</span>
                <span className="pj-btn-dot">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
              <Link href="/services" className="pj-ghost">
                Need it built instead <span aria-hidden="true">→</span>
              </Link>
            </div>
            {(sale.free || sale.paid) && (
              <div className="pr-chips pj-rise" style={{ '--d': '.36s' }}>
                {sale.free && (
                  <HeroChip>Free Lite editions to evaluate</HeroChip>
                )}
                {sale.paid && <HeroChip>One-time purchase</HeroChip>}
              </div>
            )}
          </div>
          <CoverFan />
        </div>
      </div>

      <Reveal className="pr-facts">
        {FACTS.map(({ icon, title, copy }) => {
          const Icon = FACT_ICONS[icon]
          return (
            <div key={title} className="pr-fact">
              <span className="pr-fact-ico">
                <Icon width={16} height={16} aria-hidden="true" />
              </span>
              <div>
                <b>{title}</b>
                <span>{copy}</span>
              </div>
            </div>
          )
        })}
      </Reveal>
    </section>
  )
}

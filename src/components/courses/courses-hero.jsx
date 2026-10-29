'use client'

import { useRef } from 'react'
import { ArrowDown, Check, Lock } from 'lucide-react'

import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { COURSE, MODULES } from '@/content/site/courses'

function Crown() {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 28 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M2 18h24M3 14 2 3l7 5 5-7 5 7 7-5-1 11z" />
    </svg>
  )
}

const tick = <Check width={7} height={7} strokeWidth={4} />
const lock = <Lock width={6} height={6} strokeWidth={2.5} />
const CHECKLIST_ROWS = [82, 64, 74, 58, 70]

/* The fan: Module 1, its first project (OrbitDesk) and the course cover.
   Decorative; the same facts are in the sections below. */
function DocumentFan() {
  const first = MODULES[0]
  return (
    <>
      <div className="co-doc cv-mod co-d1" style={{ '--fd': '-2s' }}>
        <div className="cv-brand">
          <Crown />
          AMWARE
        </div>
        <p className="cv-kick">Module 1 · Built</p>
        <p className="cv-title">Security Foundations</p>
        <ul className="cv-mods">
          {[
            'The AppSec mindset',
            'OWASP Top 10, mapped',
            'Threat modeling',
            'Your testing lab',
          ].map((week, i) => (
            <li key={week}>
              <i>{tick}</i>Week {i + 1} · {week}
            </li>
          ))}
        </ul>
        <div className="cv-bar mt-auto">
          <span />
        </div>
        <div className="cv-foot">
          <span>{first.weeks.length} weeks · 1 project</span>
          <span>Quiz each week</span>
        </div>
      </div>
      <div className="co-doc cv-find co-d2" style={{ '--fd': '-4s' }}>
        <div className="cv-brand">
          <Crown />
          AMWARE
        </div>
        <p className="cv-kick">Project · Module 1</p>
        <p className="cv-title">OrbitDesk</p>
        <ul className="cv-rows">
          {CHECKLIST_ROWS.map((width, n) => (
            <li key={n} style={{ '--n': n }}>
              <span>
                <i>
                  <Check width={8} height={8} strokeWidth={4} />
                </i>
                <b style={{ width: `${width}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <div className="cv-big">
          <strong>12</strong>
          <span>planted findings</span>
        </div>
        <div className="cv-foot">
          <span>Find · rate · fix</span>
          <span>Next.js</span>
        </div>
      </div>
      <div className="co-doc co-d3">
        <div className="cv-brand">
          <Crown />
          AMWARE
        </div>
        <p className="cv-kick">Course · Pre-launch</p>
        <p className="cv-title">{COURSE.name}</p>
        <div className="cv-stack">
          {COURSE.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <ul className="cv-mods">
          {[
            'Foundations',
            'Auth and sessions',
            'Row-level security',
            'Injection',
            'Server actions',
            'Frontend',
          ].map((title, i) => (
            <li key={title}>
              <i>{i === 0 ? tick : lock}</i>
              {title}
            </li>
          ))}
        </ul>
        <div className="cv-bar mt-[10px]">
          <span />
        </div>
        <div className="cv-foot">
          <span>Module 1 of {MODULES.length} built</span>
          <span>amware.dev</span>
        </div>
      </div>
    </>
  )
}

export function CoursesHero() {
  const reduced = useReducedMotion()
  const fanRef = useRef(null)

  /* The fan tilts toward the pointer; written straight to its style. */
  const tilt = (e) => {
    if (reduced || !fanRef.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    fanRef.current.style.setProperty('--rx', `${(6 - y * 14).toFixed(1)}deg`)
    fanRef.current.style.setProperty('--ry', `${(-16 + x * 24).toFixed(1)}deg`)
  }
  const untilt = () => {
    fanRef.current?.style.setProperty('--rx', '6deg')
    fanRef.current?.style.setProperty('--ry', '-16deg')
  }

  return (
    <section aria-labelledby="co-title" className="pj-wrap">
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
        <div className="co-hero-grid">
          <div className="relative z-[1]">
            <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
              {'// AMWARE · Courses'}
            </p>
            <h1
              id="co-title"
              className="co-title pj-rise"
              style={{ '--d': '.12s' }}
            >
              Learn the systems, not just the syntax.
            </h1>
            <p className="pj-intro pj-rise" style={{ '--d': '.2s' }}>
              Build-along courses pulled from production work: the patterns,
              trade-offs and plumbing that tutorials skip.
            </p>
            <div className="pj-hero-acts pj-rise" style={{ '--d': '.28s' }}>
              <a href="#co-join" className="pj-btn">
                <span>Join the waitlist</span>
                <span className="pj-btn-dot">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
              <a href="#co-course" className="pj-ghost">
                See the curriculum <span aria-hidden="true">→</span>
              </a>
            </div>
            <ul
              className="co-chips pj-rise m-0 list-none p-0"
              style={{ '--d': '.36s' }}
            >
              <li className="co-chip">
                <i className="co-dot" aria-hidden="true" />1 course in
                pre-launch
              </li>
              <li className="co-chip">
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                Self-paced
              </li>
              <li className="co-chip">
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                A quiz every week
              </li>
            </ul>
          </div>
          <div
            className="co-stage co-ticks pj-rise"
            style={{ '--d': '.25s' }}
            aria-hidden="true"
            onMouseMove={tilt}
            onMouseLeave={untilt}
          >
            <div ref={fanRef} className="co-fan">
              <DocumentFan />
            </div>
            <span className="co-stage-tag">Course · module · project</span>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowUpRight, Check, RotateCw, X } from 'lucide-react'

import { PackIcon } from '@/components/icon-pack'
import { DIGITAL_PRODUCTS_HREF, DIGITAL_PRODUCTS_LIVE } from '@/lib/site-nav'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import {
  ASSESSMENT,
  CALLBACK_NOTE,
  OUTCOMES,
  PREREQUISITES,
} from '@/content/site/courses'
import { CoursesHero } from './courses-hero'
import { CourseCore } from './course-core'
import { TrackFinder } from './track-finder'
import { TrackCards, useTrackEffects } from './track-cards'
import { CourseWaitlist } from './course-waitlist'

const EASE = [0.16, 1, 0.3, 1]
const INITIAL_TRACK = 'dev'

/* The Digital products cross-link (which names the key rotation playbook
   and the red-flags checklist) follows the same flag as the site menu's
   row, so it stays off until that page is live. */
const DIGITAL_PRODUCTS = DIGITAL_PRODUCTS_LIVE ? DIGITAL_PRODUCTS_HREF : null

const CROSS_LINKS = [
  DIGITAL_PRODUCTS && {
    href: DIGITAL_PRODUCTS,
    title: 'Digital products',
    copy: 'The key rotation playbook and the free contract red-flags checklist.',
    icon: 'tasks',
  },
  {
    href: '/services',
    title: 'Fractional CTO services',
    copy: 'A security audit of your own app, or ongoing technical leadership.',
    icon: 'rocket',
  },
].filter(Boolean)

function Reveal({ children, className, delay = 0 }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.8, delay, ease: EASE }
      }
    >
      {children}
    </motion.div>
  )
}

/* The Secure the Stack landing: hero, the course core, outcomes,
   prerequisites, then the track finder, the two track cards and the
   waitlist, and cross-links. Track and pace are shared: the quiz can set
   both, and the waitlist subject records them. Styles: styles/courses.css. */
export function SecureTheStack() {
  const reduced = useReducedMotion()
  const [track, setTrack] = useState(INITIAL_TRACK)
  const [pace, setPace] = useState('standard')
  const [quizPick, setQuizPick] = useState(null)
  const tracksRef = useRef(null)
  const effects = useTrackEffects(INITIAL_TRACK)

  const pickTrack = (next) => {
    if (next === track) return
    effects.select(track, next)
    setTrack(next)
  }
  /* "Use this track": select the card (its reveal plays), set the pace in
     section 01, badge the card, then bring the cards into view. */
  const applyQuiz = (result) => {
    pickTrack(result.key)
    setPace(result.pace)
    setQuizPick(result.key)
    setTimeout(() => {
      tracksRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
      })
    }, 380)
  }

  return (
    <>
      <CoursesHero />
      <CourseCore pace={pace} onPace={setPace} />

      <section aria-labelledby="co-out-title" className="pj-wrap co-section">
        <Reveal>
          <p className="pj-kicker">02 · By the end</p>
          <h2 id="co-out-title" className="pj-h2">
            What you&apos;ll be able to do.
          </h2>
          <p className="pj-lead">
            Four outcomes, and every module works toward at least one of them.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="co-out">
            {OUTCOMES.map((outcome, i) => (
              <li key={outcome.t} className="co-host">
                <span className="co-tile" aria-hidden="true">
                  <PackIcon name={outcome.icon} size={30} />
                </span>
                <span className="co-out-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <b>{outcome.t}</b>
                <span className="co-out-copy">{outcome.d}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section aria-labelledby="co-pre-title" className="pj-wrap co-section">
        <Reveal>
          <p className="pj-kicker">03 · Before you start</p>
          <h2 id="co-pre-title" className="pj-h2">
            Built for builders who are new to security.
          </h2>
        </Reveal>
        <Reveal className="co-pre" delay={0.1}>
          <div className="co-panel">
            <h3 className="pj-kicker">You&apos;ll need</h3>
            <ul className="co-list">
              {PREREQUISITES.need.map((item) => (
                <li key={item}>
                  <Check
                    className="h-4 w-4"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <h3 className="pj-kicker" style={{ marginTop: 24 }}>
              You won&apos;t need
            </h3>
            <ul className="co-list co-list--no">
              {PREREQUISITES.wontNeed.map((item) => (
                <li key={item}>
                  <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="co-panel">
            <h3 className="pj-kicker">How it&apos;s assessed</h3>
            <ol className="co-flow">
              {ASSESSMENT.map((step, i) => (
                <li key={step.t}>
                  <span className="co-flow-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <b>{step.t}</b>
                  <span className="co-flow-d">{step.d}</span>
                </li>
              ))}
            </ol>
            <p className="co-callback">
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              <span>{CALLBACK_NOTE}</span>
            </p>
          </div>
        </Reveal>
      </section>

      <section
        id="co-join"
        aria-labelledby="co-join-title"
        className="pj-wrap co-section"
      >
        <Reveal>
          <p className="pj-kicker">04 · Join the first cohort</p>
          <h2 id="co-join-title" className="pj-h2">
            Pick the track that fits where you are.
          </h2>
          <p className="pj-lead">
            Same curriculum, two paces. Join the waitlist and you&apos;ll hear
            first when the cohort opens.
          </p>
        </Reveal>
        <Reveal className="qz" delay={0.05}>
          <TrackFinder
            appliedKey={quizPick}
            track={track}
            pace={pace}
            onApply={applyQuiz}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <div ref={tracksRef}>
            <TrackCards
              track={track}
              quizPick={quizPick}
              effects={effects}
              onPick={pickTrack}
            />
          </div>
          <CourseWaitlist track={track} pace={pace} />
        </Reveal>
      </section>

      <motion.section
        className="pj-wrap pj-section"
        aria-labelledby="co-next-title"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={reduced ? { duration: 0 } : { duration: 0.8, ease: EASE }}
      >
        <p className="pj-kicker">Not ready for a course?</p>
        <h2 id="co-next-title" className="pj-h2 co-next-title">
          {CROSS_LINKS.length > 1
            ? 'Start with a guide, or bring me in.'
            : 'Bring me in instead.'}
        </h2>
        <div className="co-next">
          {CROSS_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="co-link co-host">
              <span className="co-tile" aria-hidden="true">
                <PackIcon name={link.icon} size={30} />
              </span>
              <span>
                <b>{link.title}</b>
                <span className="co-link-d">{link.copy}</span>
              </span>
              <ArrowUpRight
                className="co-arr h-[18px] w-[18px]"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </motion.section>
    </>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ChevronRight,
  Crown,
  Database,
  Mail,
  Rocket,
} from 'lucide-react'

import { EmailCapture } from '@/components/commerce/EmailCapture'
import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { COMMON, STACKS, STANDARD_STEPS } from '@/content/site/warekit'
import { kitWaitlistSubject } from '@/lib/contact-intents'
import { Reveal } from './reveal'

const STEP_ICONS = { database: Database, mail: Mail, rocket: Rocket }

/* The shared files wrap the layer's own: two above, the rest below. Only the
   layer's files are marked new. */
function planned(stack) {
  const above = COMMON.slice(0, 2).map((path) => ({ path, isNew: false }))
  const own = stack.files.map((path) => ({ path, isNew: true }))
  const below = COMMON.slice(2).map((path) => ({ path, isNew: false }))
  return [...above, ...own, ...below]
}

/* The picker and the planned structure it shows. The tree is keyed by the
   pick, so its lines rise in again on every change. */
function LayerCard({ stack, onPick }) {
  const reduced = useReducedMotion()
  const spot = (e) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    /* The entrance sits on a wrapper: its forwards fill would otherwise hold
       the card's transform and stop the hover lift. */
    <div className="pj-rise" style={{ '--d': '.25s' }}>
      <article className="ed-card st-card" onMouseMove={spot}>
        <span className="ed-badge">
          <i />
          In development
        </span>
        <h2 className="st-card-title">Pick your data layer.</h2>
        <p className="ed-copy">The rest of the foundation stays the same.</p>
        <div className="ed-pick" role="group" aria-label="Data layer">
          {STACKS.map(({ id, label, sub, glyph }) => (
            <button
              key={id}
              type="button"
              aria-pressed={stack.id === id}
              onClick={() => onPick(id)}
            >
              <span className="ed-pick-ico" aria-hidden="true">
                {glyph}
              </span>
              <span className="ed-pick-name">{label}</span>
              <span className="ed-pick-sub">{sub}</span>
            </button>
          ))}
        </div>
        <div className="ed-tree" aria-live="polite">
          <div className="ed-tree-bar">
            <i />
            <i />
            <i />
            <span>your-app/ · planned structure</span>
          </div>
          <ul className="ed-files" key={stack.id}>
            {planned(stack).map(({ path, isNew }, i) => (
              <li key={path} data-new={isNew} style={{ '--i': i }}>
                <b aria-hidden="true">{isNew ? '+' : ''}</b>
                {isNew && <span className="sr-only">Added: </span>}
                {path}
              </li>
            ))}
          </ul>
          <p className="ed-cap">
            <b>{stack.label}</b> · {stack.cap}
          </p>
        </div>
      </article>
    </div>
  )
}

function Hero({ anyOnSale, stack, onPick }) {
  const reduced = useReducedMotion()
  return (
    <section aria-labelledby="st-title" className="pj-wrap">
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
        <div className="pr-hero-grid st-grid">
          <div className="relative z-[1]">
            <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
              {'// WareKit · Standard edition'}
            </p>
            <h1
              id="st-title"
              className="pr-title st-title pj-rise"
              style={{ '--d': '.12s' }}
            >
              Vote for the kit we build first.
            </h1>
            <p className="pj-intro pj-rise" style={{ '--d': '.2s' }}>
              WareKit for SaaS products and internal tools on a modern
              TypeScript stack. Pick a data layer and join the waitlist. The
              most-requested one ships first.
            </p>
            <div className="pj-hero-acts pj-rise" style={{ '--d': '.28s' }}>
              <a href="#st-join" className="pj-btn">
                <span>Join the waitlist</span>
                <span className="pj-btn-dot">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
              <Link href="/products" className="pj-ghost">
                {anyOnSale
                  ? 'On NetSuite? Available now'
                  : 'On NetSuite? See that edition'}{' '}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <LayerCard stack={stack} onPick={onPick} />
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section
      aria-labelledby="st-how-title"
      className="pj-wrap pj-section pr-first"
    >
      <Reveal>
        <p className="pj-kicker">01 · How it works</p>
        <h2 id="st-how-title" className="pj-h2">
          Your signup decides the build order.
        </h2>
        <ol className="pr-steps">
          {STANDARD_STEPS.map(({ icon, title, copy }, i) => {
            const Icon = STEP_ICONS[icon]
            return (
              <li
                key={title}
                className="pr-step"
                style={{ '--d': `${i * 0.15}s` }}
              >
                <span className="pr-step-ico">
                  <Icon width={20} height={20} aria-hidden="true" />
                </span>
                <b>{title}</b>
                <span>{copy}</span>
              </li>
            )
          })}
        </ol>
      </Reveal>
    </section>
  )
}

/* The capture is keyed by the pick, so an address or confirmation left on one
   layer doesn't carry over to the next. */
function Join({ stack }) {
  const { id, label } = stack
  return (
    <section
      id="st-join"
      aria-labelledby="st-join-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <div className="st-join pj-dark">
          <div>
            <p className="pj-kicker">02 · Join the waitlist</p>
            <h2 id="st-join-title" className="pj-h2 st-join-title">
              Get the {label} kit first.
            </h2>
            <p className="pj-lead st-join-lead">
              Your pick: <b>{label}</b>. Change it in the picker above.
            </p>
          </div>
          <div>
            <EmailCapture
              key={id}
              subject={kitWaitlistSubject('Standard', label)}
              message={`Notify me when the WareKit Standard edition ${label} kit ships.`}
              cta="Notify me"
              note={`One email when the ${label} kit ships. Nothing else.`}
              successMessage={(address) => (
                <>
                  We’ll email <b>{address}</b> when the {label} kit ships.
                </>
              )}
              idPrefix="st-join"
            />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* Back to the NetSuite edition. The kicker is a claim that holds while any
   edition is on sale; the free-Lite line holds only while a free edition is. */
function NetsuiteCard({ anyOnSale, liteFree }) {
  return (
    <section aria-labelledby="st-ns-title" className="pj-wrap pj-section">
      <Reveal>
        <Link href="/products" className="ns-card">
          <span className="ns-crown" aria-hidden="true">
            <Crown width={26} height={26} strokeWidth={1.8} />
          </span>
          <span className="oe-main">
            <span className="pj-kicker pj-kicker--accent">
              {anyOnSale ? 'Available now' : 'NetSuite edition'}
            </span>
            <b id="st-ns-title" className="ns-title">
              Building on NetSuite? WareKit NetSuite edition.
            </b>
            <span className="oe-copy">
              React apps inside NetSuite or Next.js apps connected to it.
              {liteFree && ' Lite is free.'}
            </span>
          </span>
          <span className="oe-go">
            See the NetSuite edition
            <i aria-hidden="true">
              <ChevronRight width={14} height={14} strokeWidth={2.5} />
            </i>
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

/* The WareKit Standard waitlist, from the approved board
   (docs/design/2026-10-27-portfolio-upgrade): the vote, the data-layer picker
   with its planned file tree, how signups set the build order, the waitlist,
   and the way back to NetSuite. Styles: styles/products.css.

   `anyOnSale` and `liteFree` are the only product data allowed this far:
   whether any NetSuite edition can be reached today, and whether one of them
   is free. Both are false when the read fails. */
export function StandardEdition({ anyOnSale, liteFree = false }) {
  const [pick, setPick] = useState(STACKS[0].id)
  const stack = STACKS.find(({ id }) => id === pick)

  return (
    <>
      <Hero anyOnSale={anyOnSale} stack={stack} onPick={setPick} />
      <HowItWorks />
      <Join stack={stack} />
      <NetsuiteCard anyOnSale={anyOnSale} liteFree={liteFree} />
    </>
  )
}

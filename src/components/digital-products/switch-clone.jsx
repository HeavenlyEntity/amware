'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'

import { DigitalBuyButton } from '@/components/commerce/DigitalBuyButton'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import {
  GUIDE_NAME,
  INCLUDED,
  NOT_ON_SALE,
  SC,
} from '@/content/site/digital-products'
import { Reveal } from '@/components/warekit/reveal'

const CYCLE_MS = 2800

/* The method as a picture: the app's traffic moves from the old key to the
   new one. The stylesheet does all of it from `data-step`. Decorative: the
   stepper beside it says the same in words. Stays dark in both themes. */
function KeyDiagram({ step }) {
  return (
    <div className="gd-diagram pj-dark" data-step={step} aria-hidden="true">
      <svg viewBox="0 0 440 260">
        <path
          className="k-line k-flow k-line-old"
          d="M150 118 C 230 118, 220 70, 286 70"
        />
        <path
          className="k-line k-flow k-line-new"
          d="M150 142 C 230 142, 220 190, 286 190"
        />
        <g className="k-box">
          <rect
            x="24"
            y="94"
            width="126"
            height="72"
            rx="14"
            fill="#141419"
            stroke="rgba(255,255,255,.18)"
          />
          <text
            x="87"
            y="126"
            textAnchor="middle"
            fill="#fafafa"
            fontSize="14"
            fontWeight="600"
          >
            Your app
          </text>
          <text
            className="k-mono"
            x="87"
            y="146"
            textAnchor="middle"
            fill="#71717a"
            fontSize="9"
            letterSpacing="1.2"
          >
            PRODUCTION
          </text>
        </g>
        <g className="k-box k-old">
          <rect
            x="286"
            y="38"
            width="132"
            height="64"
            rx="14"
            fill="#141419"
            stroke="rgba(255,255,255,.18)"
          />
          <text x="304" y="66" fill="#fafafa" fontSize="13" fontWeight="600">
            Old key
          </text>
          <text className="k-mono" x="304" y="86" fill="#71717a" fontSize="9">
            sk_live_…a41f
          </text>
          <line
            className="k-strike"
            x1="298"
            y1="70"
            x2="406"
            y2="70"
            stroke="#f87171"
            strokeWidth="2"
          />
        </g>
        <g className="k-box k-new">
          <rect
            x="286"
            y="158"
            width="132"
            height="64"
            rx="14"
            fill="rgba(60,232,206,.1)"
            stroke="#3ce8ce"
          />
          <text x="304" y="186" fill="#5eead4" fontSize="13" fontWeight="600">
            New key
          </text>
          <text className="k-mono" x="304" y="206" fill="#71717a" fontSize="9">
            sk_live_…9c0e
          </text>
        </g>
        <text
          className="k-mono k-tag k-tag-live k-tag-old-live"
          x="418"
          y="28"
          textAnchor="end"
          fill="#5eead4"
          fontSize="9"
          letterSpacing="1.2"
        >
          ● SERVING
        </text>
        <text
          className="k-mono k-tag k-tag-off k-tag-old-off"
          x="418"
          y="28"
          textAnchor="end"
          fill="#f87171"
          fontSize="9"
          letterSpacing="1.2"
        >
          REVOKED
        </text>
        <text
          className="k-mono k-tag k-tag-new-idle"
          x="418"
          y="240"
          textAnchor="end"
          fill="#71717a"
          fontSize="9"
          letterSpacing="1.2"
        >
          STANDING BY
        </text>
        <text
          className="k-mono k-tag k-tag-live k-tag-new-live"
          x="418"
          y="240"
          textAnchor="end"
          fill="#5eead4"
          fontSize="9"
          letterSpacing="1.2"
        >
          ● SERVING
        </text>
      </svg>
      <div className="gd-cap">
        <span>
          Step <b>{step + 1}</b> of 3 · {SC[step].title}
        </span>
        <span>
          Users notice: <b>nothing</b>
        </span>
      </div>
    </div>
  )
}

/* No route means nothing to deliver yet, so there is no button and no
   "one-time" claim, only the line saying so. The price still shows when the
   row was read; a failed read leaves it out. */
function BuyBlock({ guide }) {
  const { amount, onSale, pages, price, slug } = guide
  return (
    <Reveal className="gd-buy">
      <div>
        <p className="pj-kicker">
          What&apos;s in the PDF{pages ? ` · ${pages} pages` : ''}
        </p>
        <ul className="gd-incl">
          {INCLUDED.map((item) => (
            <li key={item}>
              <Check
                width={16}
                height={16}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="gd-buy-act">
        <div>
          {price && <span className="gd-price">{price}</span>}
          <span className="gd-price-sub">
            {onSale ? 'One-time · PDF' : NOT_ON_SALE}
          </span>
        </div>
        {onSale && (
          <DigitalBuyButton
            slug={slug}
            name={GUIDE_NAME}
            price={amount}
            className="gd-buy-form"
          >
            <span>Buy the guide</span>
            <span className="pj-btn-dot">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </DigitalBuyButton>
        )}
      </div>
    </Reveal>
  )
}

export function SwitchClone({ guide }) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const [manual, setManual] = useState(false)
  const auto = !manual && !reduced

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setStep((n) => (n + 1) % SC.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [auto])

  const pick = (i) => {
    setStep(i)
    setManual(true)
  }

  return (
    <section
      id="gd-switch"
      aria-labelledby="gd-sc-title"
      className="pj-wrap pj-section pr-first gd-anchor"
    >
      <Reveal>
        <p className="pj-kicker">02 · {GUIDE_NAME}</p>
        <h2 id="gd-sc-title" className="pj-h2">
          Rotate a leaked key without breaking production.
        </h2>
        <p className="pj-lead">
          The Switch Clone method runs the new key beside the old one, so
          nothing breaks while you switch. Here it is in three steps.
        </p>
      </Reveal>
      <Reveal className="gd-split" delay={0.1}>
        <ol
          className={auto ? 'gd-steps gd-auto' : 'gd-steps'}
          aria-label="The Switch Clone method"
        >
          {SC.map(({ title, copy }, i) => (
            <li key={title}>
              <button
                type="button"
                className="gd-step"
                aria-pressed={step === i}
                onClick={() => pick(i)}
              >
                <span className="gd-step-n">0{i + 1}</span>
                <span>
                  <span className="gd-step-t">{title}</span>
                  <span className="gd-step-d">{copy}</span>
                  <span className="gd-step-bar" aria-hidden="true">
                    <b />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <KeyDiagram step={step} />
      </Reveal>
      <BuyBlock guide={guide} />
    </section>
  )
}

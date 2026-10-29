'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, X } from 'lucide-react'

import { PackIcon } from '@/components/icon-pack'
import { PACES, QUIZ } from '@/content/site/courses'
import { scoreQuiz } from '@/lib/courses/track-finder'

const HOLD_MS = 420
const INTRO = -1
const RESULT = QUIZ.length

function Tick() {
  return <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
}

/* Track finder: four questions, one at a time, then a recommendation.
   State lives in React only; answers are never stored or sent. Focus moves
   to each new question's heading (and to the result's), so the quiz reads
   in order with a keyboard or a screen reader. */
export function TrackFinder({ appliedKey, track, pace: currentPace, onApply }) {
  const [step, setStep] = useState(INTRO)
  const [answers, setAnswers] = useState([])
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef(null)
  const headingRef = useRef(null)
  const statusRef = useRef(null)
  const applying = useRef(false)
  const startRef = useRef(null)
  const optionRefs = useRef([])
  const moved = useRef(false)

  useEffect(() => () => clearTimeout(holdTimer.current), [])
  /* "Use this track" swaps for a status line; focus follows it rather
     than dropping to the page. */
  useEffect(() => {
    if (!applying.current) return
    applying.current = false
    statusRef.current?.focus({ preventScroll: true })
  })
  useEffect(() => {
    if (!moved.current) return
    if (step === INTRO) startRef.current?.focus()
    else headingRef.current?.focus()
  }, [step])

  const go = (next) => {
    clearTimeout(holdTimer.current)
    setHolding(false)
    moved.current = true
    setStep(next)
  }
  const start = () => {
    setAnswers([])
    go(0)
  }
  /* Hold the pick for a beat so it registers (the icon wiggles), then
     slide in the next question. */
  const pick = (i) => {
    if (holding) return
    setAnswers((a) => [...a.slice(0, step), i])
    setHolding(true)
    holdTimer.current = setTimeout(() => go(step + 1), HOLD_MS)
  }
  /* Arrow keys move between options; Space or Enter picks one. */
  const onOptionKey = (e, i, count) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
      e.key
    ]
    if (!delta) return
    e.preventDefault()
    optionRefs.current[(i + delta + count) % count]?.focus()
  }

  if (step === INTRO) {
    return (
      <div className="qz-intro co-pop co-host">
        <span className="co-tile" aria-hidden="true">
          <PackIcon name="workflow" size={30} />
        </span>
        <div className="qz-intro-txt">
          <b>Not sure which track fits?</b>
          <span>
            Answer four quick questions and get a recommended track and pace.
          </span>
        </div>
        <span className="qz-meta">4 questions · about a minute</span>
        <button
          ref={startRef}
          type="button"
          className="pj-btn pj-btn--across"
          onClick={start}
        >
          <span>Find my track</span>
          <span className="pj-btn-dot">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>
    )
  }

  if (step === RESULT) {
    const result = scoreQuiz(answers)
    const pace = PACES[result.pace]
    /* Applied only after "Use this track", and only while it still holds:
       a retake with another pace, or a manual change below, shows the
       button again. */
    const applied =
      appliedKey === result.key &&
      track === result.key &&
      currentPace === result.pace
    return (
      <div className="qz-panel qz-result" role="group" aria-labelledby="qz-res">
        <div>
          <p className="pj-kicker pj-kicker--accent">Your path</p>
          <h3
            id="qz-res"
            ref={headingRef}
            tabIndex={-1}
            className="qz-res-name"
          >
            {result.track.name}
          </h3>
          <div className="qz-chips">
            <span className="qz-chip qz-chip--on">{result.matchLabel}</span>
            <span className="qz-chip">
              {pace.label} pace · {pace.total}
            </span>
            <span className="qz-chip">
              {result.track.price} · {result.track.priceSub}
            </span>
          </div>
          <p className="qz-meter-k">How your answers lean</p>
          <div
            className="qz-meter"
            role="img"
            aria-label={`Your answers lean ${result.devPct} percent toward Security-First Engineer and ${result.changePct} percent toward Secure Builder Accelerator`}
          >
            {[
              ['Security-First Engineer', result.devPct, 'dev'],
              ['Secure Builder Accelerator', result.changePct, 'change'],
            ].map(([name, pct, key]) => (
              <div key={key} className="qz-meter-row">
                <span>{name}</span>
                <span className="qz-meter-track">
                  <i
                    style={{ '--w': `${pct}%` }}
                    data-win={result.key === key}
                  />
                </span>
              </div>
            ))}
          </div>
          {result.close && (
            <p className="qz-note">
              It&apos;s a close call. Both tracks cover the same nine modules,
              so either works; this one fits your answers a little better.
            </p>
          )}
        </div>
        <div>
          <p className="pj-kicker">Why this track</p>
          <ul className="qz-why">
            {result.why.map((reason, i) => (
              <li key={reason} style={{ '--i': i }}>
                <span className="qz-why-ico" aria-hidden="true">
                  <Tick />
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <div className="qz-acts">
            {applied ? (
              <p
                ref={statusRef}
                tabIndex={-1}
                className="qz-applied co-pop"
                role="status"
              >
                <span className="qz-why-ico" aria-hidden="true">
                  <Tick />
                </span>
                Selected below, with the {pace.label} pace.
              </p>
            ) : (
              <button
                type="button"
                className="pj-btn pj-btn--across"
                onClick={() => {
                  applying.current = true
                  onApply(result)
                }}
              >
                <span>Use this track</span>
                <span className="pj-btn-dot">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            )}
            <button type="button" className="qz-text" onClick={start}>
              Retake the quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  const question = QUIZ[step]
  const chosen = answers[step]
  const focusIndex = chosen ?? 0
  return (
    <div className="qz-panel" role="group" aria-label="Track finder">
      <div className="qz-top">
        <button
          type="button"
          className="qz-ghost"
          onClick={() => go(step - 1)}
          aria-label={step === 0 ? 'Exit the quiz' : 'Previous question'}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{step === 0 ? 'Exit' : 'Back'}</span>
        </button>
        <p className="qz-step">
          Question <b>{step + 1}</b> of {QUIZ.length}
        </p>
        <button
          type="button"
          className="qz-ghost"
          onClick={() => go(INTRO)}
          aria-label="Close the quiz"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="qz-bar" aria-hidden="true">
        {QUIZ.map((q, i) => (
          <i
            key={q.q}
            data-s={i < step ? 'done' : i === step ? 'now' : 'todo'}
          />
        ))}
      </div>
      <div key={step} className="qz-q">
        <h3 id="qz-q" ref={headingRef} tabIndex={-1}>
          <span className="sr-only">
            Question {step + 1} of {QUIZ.length}:{' '}
          </span>
          {question.q}
        </h3>
        {question.hint && <p className="qz-hint">{question.hint}</p>}
        <div
          className="qz-opts"
          role="radiogroup"
          aria-labelledby="qz-q"
          data-n={question.opts.length}
        >
          {question.opts.map((option, i) => (
            <button
              key={option.t}
              ref={(el) => {
                optionRefs.current[i] = el
              }}
              type="button"
              role="radio"
              className="qz-opt"
              aria-checked={chosen === i}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => pick(i)}
              onKeyDown={(e) => onOptionKey(e, i, question.opts.length)}
              style={{ '--i': i }}
            >
              <span className="qz-ico" aria-hidden="true">
                <PackIcon name={option.icon} size={26} />
              </span>
              <span className="qz-opt-txt">
                <b>{option.t}</b>
                <span>{option.d}</span>
              </span>
              <span className="qz-radio" aria-hidden="true">
                <Tick />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, ChevronRight, CircleHelp } from 'lucide-react'

import { recommendEdition } from '@/lib/commerce/kitEditions'
import { QUESTIONS } from '@/content/site/warekit'

const chevron = (
  <i aria-hidden="true">
    <ChevronRight width={14} height={14} strokeWidth={2.5} />
  </i>
)

/* Nothing here is saved or sent: answers stay in this component. */
export function HelpMeChoose({ states, onFamily, onAction }) {
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState({})
  /* Re-keys the recommendation so it pops on every answer. */
  const [pop, setPop] = useState(0)
  const rec = recommendEdition(answers, states)
  const questions = QUESTIONS.filter(
    (q) => !(q.skipInside && answers.where === 'inside')
  )

  const pick = (k, value) => {
    setAnswers({ ...answers, [k]: value })
    setPop((n) => n + 1)
    if (k === 'where') onFamily(value === 'inside' ? 'inside' : 'connected')
    if (k === 'who' && value === 'build') onFamily('built')
  }
  const reset = () => {
    setAnswers({})
    setPop((n) => n + 1)
  }

  return (
    <div className="pr-help" data-open={open}>
      <button
        type="button"
        className="pr-help-btn"
        aria-expanded={open}
        aria-controls="pr-quiz"
        onClick={() => setOpen(!open)}
      >
        <span>
          <span className="pr-help-title">
            <CircleHelp
              className="pr-help-ico"
              width={18}
              height={18}
              aria-hidden="true"
            />
            Not sure? Help me choose
          </span>
          <small>Four quick questions. No email, nothing saved.</small>
        </span>
        <ChevronDown
          className="pr-chev"
          width={18}
          height={18}
          aria-hidden="true"
        />
      </button>
      {/* Inert while closed: the collapsed rows still hold live buttons. */}
      <div className="pr-drawer" id="pr-quiz" inert={!open}>
        <div>
          <div className="pr-quiz">
            <div>
              {questions.map((q, i) => (
                <div
                  key={q.k}
                  className="pr-q"
                  data-done={Boolean(answers[q.k])}
                >
                  <p className="pr-q-label">
                    <span className="pr-q-n">{i + 1}</span>
                    {q.label}
                  </p>
                  <div className="pr-opts" role="group" aria-label={q.label}>
                    {q.opts.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className="pr-opt"
                        aria-pressed={answers[q.k] === value}
                        onClick={() => pick(q.k, value)}
                      >
                        <Check height={16} strokeWidth={3} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="pr-rec" aria-live="polite">
              <p className="pj-kicker pj-kicker--accent">{rec.kicker}</p>
              <div className="pr-rec-pop" key={pop}>
                <p className="pr-rec-name">{rec.name}</p>
                <p className="pr-rec-why">{rec.why}</p>
              </div>
              <div className="pr-rec-acts">
                {rec.action.type === 'link' ? (
                  <Link href={rec.action.href} className="pr-cta">
                    {rec.cta}
                    {chevron}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="pr-cta"
                    onClick={() => onAction(rec.action)}
                  >
                    {rec.cta}
                    {chevron}
                  </button>
                )}
                <button type="button" className="pr-rec-reset" onClick={reset}>
                  Change answers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

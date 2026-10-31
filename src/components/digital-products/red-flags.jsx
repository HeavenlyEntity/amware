'use client'

import { useState } from 'react'

import { EmailCapture } from '@/components/commerce/EmailCapture'
import { PackIcon } from '@/components/icon-pack'
import { CLAUSES } from '@/content/site/digital-products'
import { RED_FLAGS_SUBJECT } from '@/lib/contact-intents'
import { contractVerdict } from '@/lib/digital-products/contract-score'
import { Reveal } from '@/components/warekit/reveal'

function Clause({ clause, n, mark, onMark }) {
  const { title, look, green } = clause
  return (
    <li className="gd-clause" data-v={mark ?? 'none'}>
      <div className="gd-clause-row">
        <span className="gd-n">{n}</span>
        <div>
          <b className="gd-ct">{title}</b>
          <span className="gd-cd">{look}</span>
        </div>
        <div className="gd-pf" role="group" aria-label={title}>
          <button
            type="button"
            data-k="pass"
            aria-pressed={mark === 'pass'}
            onClick={() => onMark('pass')}
          >
            Pass
          </button>
          <button
            type="button"
            data-k="fail"
            aria-pressed={mark === 'fail'}
            onClick={() => onMark('fail')}
          >
            Fail
          </button>
        </div>
      </div>
      <div className="gd-green" aria-hidden={mark !== 'fail'}>
        <div>
          <p>
            <b>Green flag:</b> {green}
          </p>
        </div>
      </div>
    </li>
  )
}

/* The scorer. Marks live in this state and nowhere else, as the verdict tells
   the visitor. The meter stays dark in both themes: EmailCapture styles itself
   for a dark panel. Only the score and verdict are a live region, so typing in
   the form announces nothing. Keying the verdict on the mark count replays its
   entrance on every change. */
export function RedFlags() {
  const [marks, setMarks] = useState(() => CLAUSES.map(() => null))
  const [changes, setChanges] = useState(0)
  const { title, copy, tone, fails, checked } = contractVerdict(marks)

  const mark = (index, value) => {
    setMarks((current) =>
      current.map((flag, i) =>
        i === index ? (flag === value ? null : value) : flag
      )
    )
    setChanges((n) => n + 1)
  }

  return (
    <section
      id="gd-flags"
      aria-labelledby="gd-rf-title"
      className="pj-wrap pj-section pr-first gd-anchor"
    >
      <Reveal className="gd-rf-top">
        <span className="pi-tile" aria-hidden="true">
          <PackIcon name="checklist" size={30} />
        </span>
        <div>
          <p className="pj-kicker">03 · Free · Dev Shop Contract Red Flags</p>
          <h2 id="gd-rf-title" className="pj-h2">
            Score your dev-shop contract before you sign it.
          </h2>
          <p className="pj-lead">
            Seven clauses, checked in order, about twenty minutes. Mark each one
            as it reads in your contract.
          </p>
        </div>
      </Reveal>
      <Reveal className="gd-rf" delay={0.1}>
        <div className="gd-meter pj-dark">
          <p className="pj-kicker">Your contract</p>
          <div aria-live="polite">
            <div className="gd-dots" aria-hidden="true">
              {marks.map((flag, i) => (
                <i key={i} data-v={flag ?? 'none'} />
              ))}
            </div>
            <div className="gd-score">
              <strong>{fails}</strong>
              <span>
                {fails === 1 ? 'fail' : 'fails'} · {checked} of {CLAUSES.length}{' '}
                checked
              </span>
            </div>
            <div key={changes} className="gd-verdict gd-pop" data-tone={tone}>
              <b>{title}</b>
              <span>{copy}</span>
            </div>
          </div>
          <div className="gd-get">
            <p className="gd-get-t">Get the full checklist</p>
            <p className="gd-get-d">
              Two pages with the green-flag fix for each clause, free.
            </p>
            <EmailCapture
              subject={RED_FLAGS_SUBJECT}
              message="Send me the Dev Shop Contract Red Flags checklist."
              cta="Send it"
              note="One email with the PDF. No newsletter unless you ask."
              successMessage={(address) => (
                <>
                  On its way to <b>{address}</b>.
                </>
              )}
              idPrefix="gd-rf"
            />
          </div>
        </div>
        <ol className="gd-clauses" aria-label="The seven clauses">
          {CLAUSES.map((clause, i) => (
            <Clause
              key={clause.title}
              clause={clause}
              n={i + 1}
              mark={marks[i]}
              onMark={(value) => mark(i, value)}
            />
          ))}
        </ol>
      </Reveal>
    </section>
  )
}

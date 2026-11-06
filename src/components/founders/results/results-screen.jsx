'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { Segmented } from '@/components/founders/wizard/segmented'
import { MonoLink, NextButton } from '@/components/founders/wizard/buttons'
import { Verdict } from '@/components/founders/results/verdict'
import { Evidence } from '@/components/founders/results/evidence'
import { RoundsTimeline } from '@/components/founders/results/rounds-timeline'
import { ScenarioTable } from '@/components/founders/results/scenario-table'
import { ShowTheMath } from '@/components/founders/results/show-the-math'
import { BriefActions } from '@/components/founders/results/brief-actions'
import { IfItEnds } from '@/components/founders/results/if-it-ends'
import { useOfferStore } from '@/lib/founders/offer-store'
import { trackCta } from '@/components/founders/analytics'
import { ASK_HREF, REVIEW_HREF } from '@/lib/founders/tools'
import { LABELS } from '@/lib/founders/equity/benchmarks'
import { useMounted } from '@/hooks/use-client-value'

/* Step 4 as the board draws it: the verdict card, the "What it becomes" card
   (stake through the rounds and exit values on a path), and the action row.
   Under them, in the same style, everything the board leaves out and the
   brief still needs: the evidence rows and flags, if it ends, the print /
   copy / math utilities, the questions to ask, and the sources with the
   disclaimer. Wrapped in .amw-brief so the print sheet can force it visible.

   TWO ACTIONS, ONE PRIMARY. The teal button is the business ask. Beside it,
   quietly, is the hand-off to the other tool: this screen answers "is this
   fair", and the next question is "so what do I say". The hand-off is a text
   link, not a second button, because two buttons side by side is a menu. */

const PATH_OPTIONS = ['bootstrap', 'acquisition', 'ipo'].map((id) => ({
  id,
  label: LABELS.path[id],
}))

export function ResultsScreen({
  read,
  inputs,
  overrides,
  onOverride,
  focusHeading = false,
}) {
  const markAsked = useOfferStore((s) => s.markAsked)
  const declared = read.preselectedPath
  const [path, setPath] = useState(declared)
  const [mathOpen, setMathOpen] = useState(false)

  /* Follow the engine's preselected path when the read changes, during render
     rather than from an effect. */
  const [prevDeclared, setPrevDeclared] = useState(declared)
  if (declared !== prevDeclared) {
    setPrevDeclared(declared)
    setPath(declared)
  }

  /* Only the print header uses this, and it does not exist on the server. */
  const mounted = useMounted()
  const href = mounted ? window.location.host + window.location.pathname : ''

  const hasOffer = read.offer.pct !== null
  const today = new Date().toISOString().slice(0, 10)
  const flags = read.brief.flags ?? []

  return (
    <div className="amw-brief">
      <p className="amw-print-only amw-kicker mb-6">
        AMWARE // Founders’ Desk · Offer read · {today} · {href} · not legal or
        financial advice
      </p>

      <Verdict read={read} focusHeading={focusHeading} />

      <section
        aria-labelledby="results-consequences"
        className="amw-wz-card mt-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="results-consequences"
            className="text-[var(--amw-ink)] text-xl font-semibold leading-7"
          >
            What it becomes
          </h2>
          <Segmented
            label="Exit path"
            labelId="exit-path-label"
            hideLabel
            options={PATH_OPTIONS}
            value={path}
            onChange={setPath}
            fold={false}
            className="w-full sm:w-auto sm:min-w-[24rem]"
          />
        </div>
        <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-8">
          <RoundsTimeline
            rounds={read.rounds[path] ?? []}
            hasOffer={hasOffer}
            pathLabel={LABELS.path[path]}
          />
          <ScenarioTable read={read} path={path} />
        </div>
      </section>

      <div
        className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4"
        data-print="hide"
      >
        <NextButton
          href={REVIEW_HREF}
          block
          onClick={() => {
            /* Snapshot the wizard's full inputs and overrides, so the review
               reads exactly what this screen shows. The shared store alone
               lacks the path, founders and fractional fields. */
            markAsked(
              inputs
                ? {
                    from: 'equity',
                    inputs,
                    options: { valuations: overrides?.valuations ?? {} },
                  }
                : undefined
            )
            trackCta()
          }}
        >
          Have AMWARE review this offer
        </NextButton>
        <MonoLink href={ASK_HREF} onClick={trackCta}>
          Next stop: turn this into an ask →
        </MonoLink>
      </div>
      <p className="amw-wz-hint" data-print="hide">
        Your read is carried into the form on this device only; nothing goes
        into the link or leaves your browser.
      </p>

      <section
        aria-labelledby="results-fine-print"
        className="amw-wz-card mt-10"
      >
        <h2
          id="results-fine-print"
          className="text-[var(--amw-ink)] text-xl font-semibold leading-7"
        >
          The fine print
        </h2>
        <div className="mt-6">
          <Evidence read={read} />
        </div>
        {flags.length > 0 && (
          <ul
            role="list"
            className="text-[var(--wz-ink-2)] mt-6 list-none space-y-1 p-0 text-sm"
          >
            {flags.map((flag) => (
              <li key={flag.text ?? flag} className="flex gap-2">
                <span
                  className="text-[var(--amw-accent-ink)]"
                  aria-hidden="true"
                >
                  ▸
                </span>
                {flag.text ?? flag}
              </li>
            ))}
          </ul>
        )}

        <section
          aria-labelledby="results-if-it-ends"
          className="border-[var(--wz-edge)] mt-10 border-t pt-8"
        >
          <IfItEnds read={read} />
        </section>

        <div className="border-[var(--wz-edge)] mt-10 border-t pt-6">
          <BriefActions
            text={read.brief.text}
            mathOpen={mathOpen}
            onToggleMath={() => setMathOpen((open) => !open)}
          />
          <ShowTheMath
            read={read}
            path={path}
            open={mathOpen}
            overrides={overrides}
            onOverride={onOverride}
          />
        </div>

        {read.brief.questionsToAsk?.length > 0 && (
          <section className="border-[var(--wz-edge)] mt-10 border-t pt-6">
            <h3 className="amw-wz-kicker">Questions to ask</h3>
            <ol className="text-[var(--wz-ink-2)] mt-3 list-decimal space-y-1 pl-5 text-sm">
              {read.brief.questionsToAsk.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>
        )}

        <details className="amw-wz-details border-[var(--wz-edge)] text-[var(--amw-mut)] print:[&>summary]:hidden [&[open]>summary]:mb-2 mt-10 border-t pt-4 text-xs">
          <summary className="min-h-11 flex select-none items-center gap-2 underline-offset-4 hover:underline">
            <ChevronRight
              className="amw-wz-details-chevron size-3.5"
              aria-hidden="true"
            />
            Sources and disclaimer
          </summary>
          <p>
            {read.sources.map((s, i) => (
              <span key={s.id ?? s.name}>
                {i > 0 && ' · '}
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--amw-accent-ink)] underline decoration-dotted underline-offset-4"
                  >
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}{' '}
                ({s.asOf})
              </span>
            ))}
            .{' '}
            {read.band.confidence === 'inferred'
              ? 'The band for this seat is inferred from adjacent data, not a published table. '
              : ''}
            This is not legal or financial advice.
          </p>
        </details>
      </section>
    </div>
  )
}

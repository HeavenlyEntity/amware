'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { FileText, Sparkle, User, Wrench } from 'lucide-react'

import '@/styles/founders-wizard.css'
import { DeskBackLink, ToolEyebrow } from '@/components/founders/desk-back-link'
import { DeskBackdrop } from '@/components/founders/desk/desk-backdrop'
import { FoundersDeskDock } from '@/components/founders/desk-dock'
import { announceDesk } from '@/components/founders/desk-toast'
import { DeskWizardShell } from '@/components/founders/wizard/desk-wizard-shell'
import { BackButton, TextButton } from '@/components/founders/wizard/buttons'
import { ResultsRail } from '@/components/founders/results-rail'
import {
  RailSummaryBar,
  SUMMARY_BAR_HEIGHT,
} from '@/components/founders/rail-summary-bar'
import { LiveAnnouncer } from '@/components/founders/live-announcer'
import { WhoYouAre } from '@/components/founders/steps/who-you-are'
import { TheWork } from '@/components/founders/steps/the-work'
import { SalaryAndOffer } from '@/components/founders/steps/salary-and-offer'
import { ResultsScreen } from '@/components/founders/results/results-screen'
import { CLASS_LABELS } from '@/components/founders/format'
import { trackCompleted, trackStep } from '@/components/founders/analytics'
import {
  ENGINE_KEYS,
  hasHydrated,
  onHydrated,
  useOfferStore,
} from '@/lib/founders/offer-store'
import { computeRead } from '@/lib/founders/equity/engine'
import { STEPS } from '@/lib/founders/steps'
import { TOOLS } from '@/lib/founders/tools'
import {
  examplePatchFor,
  exampleStorePatch,
} from '@/lib/founders/worked-example'

/* One reducer holds the inputs, the step, and the "show the math"
   overrides; `computeRead` derives everything else on every change and
   feeds the rail, the announcer, the steps' hints, and the results.

   THE REDUCER IS LOCAL, THE SHARED FIELDS ARE NOT. This page used to reset on
   reload by design. Decision D3 changed that: the shared store persists to
   sessionStorage (localStorage when answers are remembered), so answers
   survive a reload and cross to the job offer
   calculator. The traffic runs both ways now. Out: the effect below, once the
   user has touched something. In: `seed`, once, on hydration, so the "See how
   the equity band was sized" hand-off lands on the user's own answers instead
   of an empty wizard. Only ENGINE_KEYS cross; the step, the overrides and the
   fractional sliders stay here. */

const INITIAL_INPUTS = {
  role: 'cto',
  joining: 'fractional_conversion',
  founders: 2,
  stage: 'preseed',
  path: 'ipo',
  fullTimeOnSigning: true,
  finalTechnicalSay: true,
  responsibilities: [],
  months: 6,
  hoursPerWeek: 10,
  ratePerHour: 150,
  feesBilled: 0,
  marketSalary: null,
  offeredSalary: null,
  offerMode: 'percent',
  offeredEquityPct: null,
  optionCount: null,
  fullyDilutedShares: null,
  strikePrice: null,
  instrument: 'unsure',
  vestingYears: 4,
  cliffMonths: 12,
  roundsBeforeExit: {},
  exerciseWindow: 'days_90',
  accelerationCoC: 'none',
  accelerationTerminationMonths: 0,
  repurchaseVested: 'none',
  severanceMonths: 0,
}

const INITIAL_STATE = {
  step: 1,
  /* Which way the last step change went, for the board's side slide. */
  dir: 'none',
  inputs: INITIAL_INPUTS,
  touched: false,
  viaExample: false,
  overrides: { valuations: {} },
}

function reducer(state, action) {
  switch (action.type) {
    /* Answers arriving from the shared store on hydration. Deliberately does
       NOT set `touched`: these values arrived, the user did not type them, and
       marking them touched would arm the live announcer and start the
       write-back effect against a store that already holds them. */
    case 'seed':
      /* Never land on top of something the user is part-way through typing.
         The guard lives here because the reducer always sees current state;
         mirroring `touched` into a ref meant writing that ref during render,
         which breaks under concurrent rendering. */
      if (state.touched) return state
      return { ...state, inputs: { ...state.inputs, ...action.patch } }
    /* Back to a blank wizard. The caller empties the shared store first; this
       drops the local half, which the store never held. */
    case 'reset':
      return { ...INITIAL_STATE }
    /* The worked example, from the dock or `?example`: a fresh wizard holding
       the example, opened on the results. Marked touched, so the write-back
       below carries the shared half into the store (a reload keeps it) and the
       hydration `seed` cannot land on top of it. The step-1 link passes
       `step: 1` to fill it in place instead, so the visitor can walk through
       it (spec fork F3). */
    case 'example':
      return {
        ...INITIAL_STATE,
        step: action.step ?? STEPS.length,
        dir: action.step ? 'none' : 'fwd',
        touched: true,
        /* Reaching the results this way is not someone completing the
           wizard; the funnel events skip it. */
        viaExample: true,
        inputs: { ...INITIAL_INPUTS, ...action.patch },
      }
    case 'change': {
      const patch = { ...action.patch }
      let picksByRole = state.picksByRole ?? {}
      /* A role switch invalidates the role-specific chips, but the seat cards
         are a radiogroup: arrowing across them changes the role on every
         press. So the picks are put aside under the role being left and
         restored when it comes back, rather than lost to a keypress. */
      if (patch.role && patch.role !== state.inputs.role) {
        picksByRole = {
          ...picksByRole,
          [state.inputs.role]: state.inputs.responsibilities,
        }
        patch.responsibilities = picksByRole[patch.role] ?? []
      }
      return {
        ...state,
        touched: true,
        picksByRole,
        inputs: { ...state.inputs, ...patch },
      }
    }
    case 'next':
      return {
        ...state,
        viaExample: false,
        dir: 'fwd',
        step: Math.min(STEPS.length, state.step + 1),
      }
    case 'back':
      return {
        ...state,
        viaExample: false,
        dir: 'back',
        step: Math.max(1, state.step - 1),
      }
    /* The stepper's click-back: only ever to a step already done. */
    case 'goto': {
      const target = Math.max(1, Math.min(state.step, action.step))
      if (target === state.step) return state
      return { ...state, viaExample: false, dir: 'back', step: target }
    }
    case 'override': {
      if (action.key === 'valuation') {
        const { path, id, value } = action.value
        return {
          ...state,
          overrides: {
            ...state.overrides,
            valuations: {
              ...state.overrides.valuations,
              [path]: {
                ...(state.overrides.valuations[path] ?? {}),
                [id]: value,
              },
            },
          },
        }
      }
      if (action.key === 'roundsBeforeExit') {
        const { path, value } = action.value
        return {
          ...state,
          inputs: {
            ...state.inputs,
            roundsBeforeExit: {
              ...(state.inputs.roundsBeforeExit ?? {}),
              [path]: value,
            },
          },
        }
      }
      return state
    }
    default:
      return state
  }
}

/* Stable identity: `useSyncExternalStore` compares snapshots, so this must not
   be a fresh closure on every render. */
const serverNotHydrated = () => false

/* The wizard card's geometry, held while persisted answers land, so a chip row
   never flips under someone a beat after it renders: the stepper row, the
   kicker, the heading and three fields, with the rail beside it. */
function WizardSkeleton() {
  const block = 'rounded-md bg-[var(--wz-fill-3)]'
  return (
    <div aria-hidden="true" className="amw-wz-grid animate-pulse">
      <div className="amw-wz-main amw-wz-card">
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="size-8 bg-[var(--wz-fill-3)] shrink-0 rounded-full" />
              <div className="bg-[var(--wz-fill-3)] h-0.5 flex-1" />
            </div>
          ))}
        </div>
        <div className={`${block} mt-8 h-3 w-40`} />
        <div className={`${block} mt-4 h-8 w-3/4`} />
        <div className="mt-8 space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className={`${block} h-4 w-36`} />
              <div className={`${block} mt-3 h-12 w-full rounded-xl`} />
            </div>
          ))}
        </div>
      </div>
      <div className="amw-wz-rail hidden md:block">
        <div className="amw-wz-railcard h-80" />
      </div>
    </div>
  )
}

const STEP_ICONS = { seat: User, work: Wrench, offer: FileText, read: Sparkle }

const EQUITY_TOOL = TOOLS.find((tool) => tool.id === 'equity')

/* "Three questions": the steps before the read, counted, not typed. */
const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
const QUESTION_COUNT = STEPS.filter((s) => s.pending).length
const LEAD = `${
  COUNT_WORDS[QUESTION_COUNT] ?? QUESTION_COUNT
} questions, then your range, the number to say, and what it is worth.`

/* The tool header, in every state: the question the tool answers is the page
   h1, as the board draws it. */
function ToolHeader() {
  return (
    <header className="mt-4">
      <div className="amw-wz-rise" style={{ '--d': '.05s' }}>
        <ToolEyebrow id="equity" />
      </div>
      <h1 className="amw-wz-h1 amw-wz-rise" style={{ '--d': '.12s' }}>
        {EQUITY_TOOL.blurb}
      </h1>
      <p className="amw-wz-lead amw-wz-rise" style={{ '--d': '.2s' }}>
        {LEAD}
      </p>
    </header>
  )
}

export default function EquityCalculator() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const { step, dir, inputs, overrides, touched, viaExample } = state
  /* The phone summary sheet owns the bottom of the screen while it is open,
     so the dock steps aside. */
  const [sheetOpen, setSheetOpen] = useState(false)
  /* Gate the render so a chip row cannot flip under the user a beat after it
     paints (DD5). `useSyncExternalStore` is the API for a value that differs
     between the server and the client: React renders `getServerSnapshot`
     first so the hydrating render matches the server HTML, then re-renders
     with the client value. Reading `hasHydrated()` during render instead is
     what caused the hydration mismatch this replaced. */
  const hydrated = useSyncExternalStore(
    onHydrated,
    hasHydrated,
    serverNotHydrated
  )

  /* Pull the shared fields in, once, when persisted state lands. Guarded on
     `isPristine()` so an untouched store never overwrites this wizard's own
     defaults with the same values under a different name, and on `touched` so
     it can never land on top of something the user is part-way through
     typing. */
  useEffect(() => {
    if (!hydrated) return
    const store = useOfferStore.getState()
    if (store.isPristine()) return
    const patch = {}
    for (const key of ENGINE_KEYS) {
      if (key in INITIAL_INPUTS) patch[key] = store[key]
    }
    /* The reducer drops this on the floor once the user has typed anything,
       so the guard lives with the state it guards rather than in a ref
       mirrored during render. */
    dispatch({ type: 'seed', patch })
  }, [hydrated])

  /* Push the shared fields into the store so the job offer calculator and the
     contact form see the same answers. Only the keys both tools own; the step,
     the overrides and the fractional sliders stay local. Nothing is written
     until the user has actually touched something, so landing on the wizard
     and leaving cannot resurrect defaults over a store the user just cleared
     (design review D6, D15 #9). */
  useEffect(() => {
    if (!touched) return
    const patch = {}
    for (const key of ENGINE_KEYS) {
      if (key in inputs) patch[key] = inputs[key]
    }
    useOfferStore.getState().set(patch)
  }, [inputs, touched])

  const read = useMemo(
    () => computeRead(inputs, { valuations: overrides.valuations }),
    [inputs, overrides]
  )

  /* Every step change goes back to the top, as the board does; the first
     paint does not. */
  const lastStep = useRef(step)
  useEffect(() => {
    if (!viaExample) {
      trackStep(step)
      if (step === STEPS.length) trackCompleted()
    }
    if (lastStep.current !== step) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      lastStep.current = step
    }
  }, [step, viaExample])

  const onChange = (patch) => dispatch({ type: 'change', patch })
  /* The store is reset to the example as a whole first, so the visitor's own
     industry, geo or review request cannot survive into it; the write-back
     then lays the wizard's half over the same values. */
  const loadExample = useCallback(() => {
    useOfferStore.getState().set(exampleStorePatch())
    dispatch({
      type: 'example',
      patch: examplePatchFor(Object.keys(INITIAL_INPUTS)),
    })
  }, [])
  /* Step 1's "Fill in the worked example": the same example, filled in place
     so the visitor can step through it. The dock and `?example` still open
     on the results (spec fork F3). */
  const fillExample = () => {
    useOfferStore.getState().set(exampleStorePatch())
    dispatch({
      type: 'example',
      step: 1,
      patch: examplePatchFor(Object.keys(INITIAL_INPUTS)),
    })
    announceDesk('Worked example filled in')
  }
  /* Both halves: the shared store, then this wizard's own reducer. */
  const clearAll = useCallback(() => {
    useOfferStore.getState().clear()
    dispatch({ type: 'reset' })
  }, [])
  /* The page's own control says so through the dock's toast; the dock's bin
     says it itself. */
  const clearFromPage = () => {
    clearAll()
    announceDesk('Answers cleared')
  }
  const onOverride = (key, value) => dispatch({ type: 'override', key, value })

  const announcement = read.classification.pending
    ? null
    : `${CLASS_LABELS[read.classification.class]}.${
        read.offer.pct !== null ? ` Offer ${read.offer.position} the band.` : ''
      }`

  const isResults = step === STEPS.length
  const stepProps = { inputs, read, onChange }

  return (
    <div className="amw relative isolate">
      <DeskBackdrop />
      {/* Below md the summary bar covers the bottom of the wizard, so the
          page reserves its height there; wider screens have no bar. */}
      <section
        className={`pt-6 md:pb-16 ${
          isResults
            ? 'pb-12'
            : 'pb-[calc(var(--summary-bar)_+_env(safe-area-inset-bottom)_+_3rem)]'
        }`}
        style={{ '--summary-bar': `${SUMMARY_BAR_HEIGHT}px` }}
      >
        <div className="mx-auto max-w-[72rem] px-[clamp(16px,3vw,32px)]">
          <DeskBackLink />
          <ToolHeader />

          <div className="mt-8">
            {!hydrated ? (
              <WizardSkeleton />
            ) : isResults ? (
              <div className="amw-wz-step" data-dir={dir}>
                <div data-print="hide">
                  <BackButton onClick={() => dispatch({ type: 'back' })}>
                    Change an answer
                  </BackButton>
                </div>
                <div className="mt-5">
                  <ResultsScreen
                    read={read}
                    inputs={inputs}
                    overrides={overrides}
                    onOverride={onOverride}
                    focusHeading={!viaExample}
                  />
                </div>
              </div>
            ) : (
              <div className="amw-wz-grid">
                <div
                  className="amw-wz-main amw-wz-card amw-wz-rise"
                  style={{ '--d': '.28s' }}
                >
                  <DeskWizardShell
                    steps={STEPS}
                    step={step}
                    dir={dir}
                    icons={STEP_ICONS}
                    onBack={() => dispatch({ type: 'back' })}
                    onNext={() => dispatch({ type: 'next' })}
                    onGo={(target) => dispatch({ type: 'goto', step: target })}
                    footerStart={
                      <TextButton onClick={fillExample}>
                        Fill in the worked example
                      </TextButton>
                    }
                  >
                    {step === 1 && <WhoYouAre {...stepProps} />}
                    {step === 2 && <TheWork {...stepProps} />}
                    {step === 3 && <SalaryAndOffer {...stepProps} />}
                  </DeskWizardShell>
                </div>
                {/* Phones get the summary bar and its sheet instead. */}
                <div
                  className="amw-wz-rail amw-wz-rise hidden md:block"
                  style={{ '--d': '.36s' }}
                >
                  <ResultsRail read={read} step={step} />
                </div>
              </div>
            )}
          </div>

          {/* Decision D3: the shared answers now persist to web storage, so
              "nothing stored" would be false. Say the true thing instead, in
              the same words the job offer calculator uses, and put the control
              that makes the claim keepable beside it. */}
          <p className="amw-wz-kicker mt-10" data-print="hide">
            No account. Nothing leaves your browser.{' '}
            <button
              type="button"
              onClick={clearFromPage}
              className="amw-wz-kicker amw-wz-kicker--link min-h-11 inline-flex items-center underline underline-offset-4"
            >
              Clear my answers
            </button>
          </p>
        </div>
      </section>

      {hydrated && !isResults && (
        <div className="md:hidden">
          <RailSummaryBar read={read} step={step} onOpenChange={setSheetOpen} />
        </div>
      )}

      <LiveAnnouncer message={announcement} armed={touched} />

      <FoundersDeskDock
        current="equity"
        readReady={hydrated && isResults}
        onExample={loadExample}
        onClear={clearAll}
        aboveSummaryBar={hydrated && !isResults}
        hidden={sheetOpen && !isResults}
      />
    </div>
  )
}

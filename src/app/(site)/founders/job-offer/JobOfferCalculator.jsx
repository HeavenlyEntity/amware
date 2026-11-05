'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { ArrowLeftRight, Building2, FileText, UserRound } from 'lucide-react'

import '@/styles/founders-wizard.css'
import '@/styles/founders-offer.css'
import { DeskBackLink, ToolEyebrow } from '@/components/founders/desk-back-link'
import { DeskBackdrop } from '@/components/founders/desk/desk-backdrop'
import { FoundersDeskDock } from '@/components/founders/desk-dock'
import { announceDesk } from '@/components/founders/desk-toast'
import { DeskWizardShell } from '@/components/founders/wizard/desk-wizard-shell'
import { TextButton } from '@/components/founders/wizard/buttons'
import { LiveAnnouncer } from '@/components/founders/live-announcer'
import { SUMMARY_BAR_HEIGHT } from '@/components/founders/rail-summary-bar'
import { CLASS_LABELS } from '@/components/founders/format'
import { trackCompleted, trackStep } from '@/components/founders/analytics'
import { AskActions } from '@/components/founders/ladder/ask-actions'
import { AskLadder } from '@/components/founders/ladder/ask-ladder'
import { OfferRail } from '@/components/founders/ladder/offer-rail'
import { OfferSummaryBar } from '@/components/founders/ladder/offer-summary-bar'
import { MarketPlot } from '@/components/founders/market-plot'
import {
  CompanyStep,
  OfferStep,
  SeatStep,
} from '@/components/founders/ladder/wizard-steps'
import { computeRead } from '@/lib/founders/equity/engine'
import { computeAsk } from '@/lib/founders/equity/negotiation'
import { buildPlot } from '@/lib/founders/equity/plot'
import { INDUSTRY_OPTIONS, OFFER_STEPS } from '@/lib/founders/offer-steps'
import {
  hasHydrated,
  onHydrated,
  useOfferStore,
} from '@/lib/founders/offer-store'
import { TOOLS } from '@/lib/founders/tools'
import { exampleStorePatch } from '@/lib/founders/worked-example'

/*
 * The job offer calculator, in the Offer board's look: the wizard card with a
 * live rail beside it, then the ask, its actions and the market plot.
 *
 * WHY THE HYDRATION GATE EXISTS. The store persists to web storage
 * (sessionStorage, or localStorage when answers are remembered), and
 * `persist` hydrates AFTER mount. Without a gate the server paints the store's
 * defaults, which are CTO at pre-seed, and a moment later the real answers
 * arrive and the numbers change. Because arriving numbers count up in this
 * design system, an engineer at Series A would watch a CTO's pre-seed figures
 * animate on screen and then jump. On a page about someone's salary, the first
 * frame would be a confident wrong answer. So: gate the render, show a
 * fixed-geometry skeleton, and suppress the count-up on the first real paint,
 * because those values arrived rather than changed (design review DD5).
 *
 * The store is the state. There is no local reducer for inputs, because the
 * equity calculator writes the same fields and the two must never disagree.
 * The step, its direction, and the per-seat picks are local, since they are
 * nobody else's business.
 */

/* Stable identity: `useSyncExternalStore` compares snapshots, so this must not
   be a fresh closure on every render. */
const serverNotHydrated = () => false

const STEP_ICONS = {
  seat: UserRound,
  company: Building2,
  offer: FileText,
  ask: ArrowLeftRight,
}

const ASK_STEP = OFFER_STEPS.length
const JOB_OFFER_TOOL = TOOLS.find((tool) => tool.id === 'job-offer')

/* "Three questions": the steps before the ask, counted, not typed. */
const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
const QUESTION_COUNT = OFFER_STEPS.filter((s) => s.pending).length
const LEAD = `${
  COUNT_WORDS[QUESTION_COUNT] ?? QUESTION_COUNT
} questions, then the number to open with, the one to aim for, and the floor.`

/* The tool header, in every state including the skeleton, so nothing above
   the fold moves when the answers land. The page's one h1. */
function ToolHeader() {
  return (
    <header className="mt-4">
      <div className="amw-wz-rise" style={{ '--d': '.05s' }}>
        <ToolEyebrow id="job-offer" />
      </div>
      <h1 className="amw-wz-h1 amw-wz-rise" style={{ '--d': '.12s' }}>
        {JOB_OFFER_TOOL.blurb}
      </h1>
      <p className="amw-wz-lead amw-wz-rise" style={{ '--d': '.2s' }}>
        {LEAD}
      </p>
    </header>
  )
}

/* The wizard card's geometry, held while persisted answers land: the stepper
   row, the kicker, the heading and three fields, with the rail beside it. We
   cannot know yet whether this person lands on the wizard or the ask, so this
   is the neutral shape of the page. */
function OfferSkeleton() {
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

/* "CTO · pre-seed · AI · Converting from fractional or contract": the
   industry by its short label, and not at all when it applies no
   adjustment. */
function askContext(read, industryKey) {
  const industry =
    industryKey === 'saas' || industryKey === 'other'
      ? null
      : INDUSTRY_OPTIONS.find((o) => o.value === industryKey)?.short ?? null
  return [read.labels.role, read.labels.stage, industry, read.labels.joining]
    .filter(Boolean)
    .join(' · ')
}

export default function JobOfferCalculator() {
  /* null means "wherever the answers say"; a number means the reader moved. */
  const [stepOverride, setStepOverride] = useState(null)
  /* Which way the last step change went, for the board's side slide. */
  const [dir, setDir] = useState('none')
  /* Set only by "See my ask", so the verdict takes focus when the reader
     walks there, and not on a prefilled arrival or the dock's example. */
  const [focusVerdict, setFocusVerdict] = useState(false)
  /* Arms the class announcer once the reader has answered something. */
  const [touched, setTouched] = useState(false)
  /* The phone sheet owns the bottom of the screen while it is open, so the
     dock steps aside. */
  const [sheetOpen, setSheetOpen] = useState(false)
  /* `useSyncExternalStore` is the API for exactly this shape of problem: a
     value that differs between the server and the client, where the hydrating
     render MUST use the server's answer. React renders `getServerSnapshot`
     first, matches the server HTML, then re-renders with the client value.
     Doing it by hand with `useState` + an effect is what caused the hydration
     mismatch this replaced, and setting state from an effect to track an
     external store is what `react-hooks/set-state-in-effect` warns about. */
  const hydrated = useSyncExternalStore(
    onHydrated,
    hasHydrated,
    serverNotHydrated
  )
  /* The outcome the plot models. Conservative by default: the reader should
     meet the modest case first, not the one that flatters the offer.
     TODO(alec): the store has no `path`, so the plot models an IPO and the
     conservative case is a $400M IPO; a cold start's own bar is off scale.
     Should this tool default to the acquisition path instead? */
  const [scenarioId, setScenarioId] = useState('conservative')

  const store = useOfferStore()
  const setInputs = useOfferStore((s) => s.set)
  const clear = useOfferStore((s) => s.clear)

  /* Someone arriving from the equity read lands straight on the ask, and
     their numbers do not count up: those values arrived, they did not change
     (DD5).

     THIS HAS TO BE LATCHED, NOT DERIVED. `!isPristine()` is true the moment the
     reader answers the first question too, so deriving it during render would
     teleport a first-time user to the results as soon as they tapped a chip.
     What matters is whether answers were ALREADY there when hydration finished,
     which is a one-shot observation of an external event.

     `set-state-in-effect` is disabled for exactly that reason: the rule's
     alternatives are "derive during render" (wrong, see above) and
     `useSyncExternalStore` (wrong too, because the snapshot would keep changing
     as the reader types). Latching an external one-shot in a mount effect is
     the correct pattern here, and it runs once. */
  /* null until hydration has been observed: the page holds the skeleton until
     then, so a prefilled arrival never paints a frame of the wizard first. */
  const [arrivedPrefilled, setArrivedPrefilled] = useState(null)
  const ready = hydrated && arrivedPrefilled !== null
  useEffect(() => {
    if (!hydrated) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArrivedPrefilled(!useOfferStore.getState().isPristine())
  }, [hydrated])

  const step = stepOverride ?? (arrivedPrefilled ? ASK_STEP : 1)
  const isAsk = step === ASK_STEP

  /* `store` changes identity on every write, so it is the dependency;
     `inputs()` reads the engine keys out of it. */
  const read = useMemo(() => computeRead(store.inputs()), [store])
  const ask = useMemo(
    () => computeAsk(read, { industry: store.industry, geo: store.geo }),
    [read, store.industry, store.geo]
  )
  const plot = useMemo(
    () => (isAsk ? buildPlot(read, ask, { scenarioId }) : null),
    [isAsk, read, ask, scenarioId]
  )

  /* A seat change invalidates the seat's responsibility chips, but the seat
     cards are a radiogroup: arrowing across them changes the seat on every
     press. So the picks are put aside under the seat being left and restored
     when it comes back, rather than lost to a keypress the reader cannot see
     the consequence of. */
  const picksBySeat = useRef({})
  const answer = useCallback(
    (patch) => {
      const current = useOfferStore.getState()
      const next = { ...patch }
      if (patch.role && patch.role !== current.role) {
        picksBySeat.current[current.role] = {
          responsibilities: current.responsibilities,
          workAnswered: current.workAnswered,
        }
        const back = picksBySeat.current[patch.role]
        next.responsibilities = back?.responsibilities ?? []
        next.workAnswered = back?.workAnswered ?? false
      }
      setTouched(true)
      setInputs(next)
    },
    [setInputs]
  )

  /* Every move the reader makes; value-free funnel events, as the equity
     page sends. */
  const goTo = useCallback((target, direction) => {
    setDir(direction)
    setStepOverride(target)
    trackStep(target)
    if (target === ASK_STEP) trackCompleted()
  }, [])

  /* After Edit answers or Clear, the ask (and the focused control) unmount;
     focus goes to the first question rather than falling to the page. */
  const focusFirstStep = useRef(false)
  useEffect(() => {
    if (!focusFirstStep.current || isAsk || !ready) return
    focusFirstStep.current = false
    document.getElementById(`wizard-step-${OFFER_STEPS[0].id}`)?.focus()
  })

  /* The worked example, from the dock or `?example`: the store is this page's
     state, so filling it and jumping to the ask is the whole job. */
  const loadExample = useCallback(() => {
    picksBySeat.current = {}
    setInputs(exampleStorePatch())
    setFocusVerdict(false)
    setDir('fwd')
    setStepOverride(ASK_STEP)
  }, [setInputs])
  /* Step 1's "Fill in the worked example": the same example, filled in place
     so the visitor can walk through it (spec fork F6). */
  const fillExample = () => {
    picksBySeat.current = {}
    setInputs(exampleStorePatch())
    setTouched(true)
    setStepOverride(1)
    announceDesk('Worked example filled in')
  }
  const clearAll = useCallback(() => {
    picksBySeat.current = {}
    clear()
    /* Values entered after a clear are changes, not arrivals: count them. */
    setArrivedPrefilled(false)
    setFocusVerdict(false)
    setDir('none')
    setStepOverride(1)
  }, [clear])
  /* The page's own control says so through the dock's toast; the dock's bin
     says it itself (and keeps focus, since the dock stays put). */
  const clearFromPage = () => {
    clearAll()
    focusFirstStep.current = true
    announceDesk('Answers cleared')
  }
  const editAnswers = () => {
    setFocusVerdict(false)
    setDir('back')
    setStepOverride(1)
    focusFirstStep.current = true
  }

  const classification = read.classification
  const announcement = classification.pending
    ? null
    : `${CLASS_LABELS[classification.class]}.`

  const stepProps = { inputs: store, read, onChange: answer }
  const wizardOn = ready && !isAsk

  /* One tree for every state, so the dock keeps its place and never remounts
     when hydration lands: its entrance does not replay, and a toast or an
     open menu survives. */
  return (
    <div className="amw relative isolate">
      <DeskBackdrop />
      {/* Below md the summary bar covers the bottom of the wizard, so the
          page reserves its height there; wider screens have no bar. */}
      <section
        className={`pt-6 md:pb-16 ${
          wizardOn
            ? 'pb-[calc(var(--summary-bar)_+_env(safe-area-inset-bottom)_+_3rem)]'
            : 'pb-12'
        }`}
        style={{ '--summary-bar': `${SUMMARY_BAR_HEIGHT}px` }}
      >
        <div className="mx-auto max-w-[72rem] px-[clamp(16px,3vw,32px)]">
          <DeskBackLink />
          <ToolHeader />

          <div className="mt-8">
            {!ready ? (
              <OfferSkeleton />
            ) : isAsk ? (
              <div className="amw-wz-step" data-dir={dir}>
                <AskLadder
                  ask={ask}
                  suppressCount={Boolean(arrivedPrefilled)}
                  focusHeading={focusVerdict}
                  context={askContext(read, store.industry)}
                />

                {/* Actions before the plot, not after it. The plot is
                    evidence the reader may or may not scroll to; the action
                    on the ask cannot sit below it (DD3, screen order). */}
                <AskActions
                  ask={ask}
                  onEdit={editAnswers}
                  onClear={clearFromPage}
                />

                <MarketPlot plot={plot} onScenarioChange={setScenarioId} />
              </div>
            ) : (
              <div className="amw-wz-grid">
                <div
                  className="amw-wz-main amw-wz-card amw-wz-rise"
                  style={{ '--d': '.28s' }}
                >
                  <DeskWizardShell
                    steps={OFFER_STEPS}
                    step={step}
                    dir={dir}
                    icons={STEP_ICONS}
                    onBack={() => goTo(Math.max(1, step - 1), 'back')}
                    onNext={() => {
                      const target = Math.min(ASK_STEP, step + 1)
                      if (target === ASK_STEP) setFocusVerdict(true)
                      goTo(target, 'fwd')
                    }}
                    onGo={(target) => {
                      if (target < step) goTo(target, 'back')
                    }}
                    footerStart={
                      <TextButton onClick={fillExample}>
                        Fill in the worked example
                      </TextButton>
                    }
                  >
                    {step === 1 && <SeatStep {...stepProps} />}
                    {step === 2 && <CompanyStep {...stepProps} />}
                    {step === 3 && <OfferStep {...stepProps} />}
                  </DeskWizardShell>
                </div>
                {/* Phones get the summary bar and its sheet instead. */}
                <div
                  className="amw-wz-rail amw-wz-rise hidden md:block"
                  style={{ '--d': '.36s' }}
                >
                  <OfferRail read={read} ask={ask} store={store} step={step} />
                </div>
              </div>
            )}
          </div>

          <p className="amw-wz-kicker mt-10">
            No account. Nothing leaves your browser. Clear it any time.
          </p>
        </div>
      </section>

      {wizardOn && (
        <div className="md:hidden">
          <OfferSummaryBar
            read={read}
            ask={ask}
            store={store}
            step={step}
            onOpenChange={setSheetOpen}
          />
        </div>
      )}

      <LiveAnnouncer message={announcement} armed={touched} />

      <FoundersDeskDock
        current="job-offer"
        readReady={ready && isAsk}
        onExample={loadExample}
        onClear={clearAll}
        aboveSummaryBar={wizardOn}
        hidden={sheetOpen && wizardOn}
      />
    </div>
  )
}

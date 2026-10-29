'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Lock, X } from 'lucide-react'

import { PackIcon } from '@/components/icon-pack'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { KINDS, STATUS_LABELS } from '@/content/site/projects'
import { isPublicLink, privateNoteFor, yearOf } from '@/lib/projects/archive'
import { ProjectCover, ProjectLogo } from './project-media'
import { countText, useCountUp } from './motion-hooks'
import { SHOW_ACTIVITY } from './project-archive'

const EASE = [0.16, 1, 0.3, 1]
const TABS = [
  ['journey', 'Journey', 'workflow'],
  ['results', 'Results', 'gauge'],
  ['team', 'Team & stack', 'programmer'],
]
const MAX_SEATS = 5
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function activityPoints(values, w = 320, h = 64, pad = 6) {
  return values
    .map(
      (v, i) =>
        `${Math.round((i / (values.length - 1)) * w * 10) / 10},${
          Math.round((h - pad - (v / 100) * (h - pad * 2)) * 10) / 10
        }`
    )
    .join(' ')
}

function Journey({ project }) {
  return (
    <ol className="cs-steps">
      {project.story.chapters.map((c, i) => (
        <li key={c.t} style={{ '--i': i }}>
          <span className="pj-ico" aria-hidden="true">
            <PackIcon name={c.i} />
          </span>
          <div>
            <b>{c.t}</b>
            <p>{c.b}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Results({ project }) {
  const k = useCountUp(true, { key: project.key, duration: 900 })
  const line = activityPoints(project.activity)
  return (
    <>
      <dl className="cs-stats m-0">
        {project.story.results.map((r, i) => (
          <div
            key={r.l}
            className="cs-stat flex flex-col-reverse"
            style={{ '--i': i }}
          >
            <dt>
              <span>{r.l}</span>
            </dt>
            <dd className="m-0">
              <strong>
                <span aria-hidden="true">{countText(r.v, k)}</span>
                <span className="sr-only">{r.v}</span>
              </strong>
            </dd>
          </div>
        ))}
      </dl>
      <p className="pj-out">
        <b>Where it stands</b>
        {project.whatHappened}
      </p>
      {SHOW_ACTIVITY && (
        <div className="pj-act">
          <div className="pj-act-head">
            <span>Activity</span>
            <span>Over time</span>
          </div>
          <svg
            viewBox="0 0 320 64"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pj-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#3ce8ce" stopOpacity=".28" />
                <stop offset="1" stopColor="#3ce8ce" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,64 ${line} 320,64`} fill="url(#pj-grad)" />
            <polyline points={line} />
          </svg>
        </div>
      )}
    </>
  )
}

function TeamStack({ project }) {
  const { team, stack, netsuite } = project.story
  const seats = Math.min(team.size, MAX_SEATS)
  return (
    <>
      <div className="cs-team" data-seats={seats > 0}>
        {seats > 0 && (
          <div className="cs-seats" aria-hidden="true">
            {Array.from({ length: seats }, (_, i) => (
              <span key={i} className="cs-seat" style={{ '--i': i }}>
                <PackIcon name="programmer" />
              </span>
            ))}
          </div>
        )}
        <div>
          <b>{team.label}</b>
          <p>{team.note}</p>
        </div>
      </div>
      <p className="cs-sub">Stack</p>
      <ul className="cs-stack m-0 list-none p-0">
        {stack.map((item, i) => (
          <li key={item} className="contents">
            <span style={{ '--i': i }}>{item}</span>
          </li>
        ))}
      </ul>
      {netsuite && (
        <>
          <p className="cs-sub">How it ships</p>
          <ol className="cs-ship">
            <li>
              <b>SuiteCloud SDK</b>
              <span>Project set up and deployed</span>
            </li>
            <li>
              <b>SuiteApp</b>
              <span>Packaged as a managed app</span>
            </li>
            <li>
              <b>Bundles</b>
              <span>Distributed to customer accounts</span>
            </li>
          </ol>
        </>
      )}
    </>
  )
}

/* The story body re-mounts per project (keyed by the parent), so the tab
   resets to Journey and every entrance replays. */
function StoryBody({ project }) {
  const [tab, setTab] = useState('journey')
  const tabIndex = TABS.findIndex(([key]) => key === tab)
  const publicLink = isPublicLink(project.link.href)

  const onTabKey = (e) => {
    const moves = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: -tabIndex,
      End: TABS.length - 1 - tabIndex,
    }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = (tabIndex + moves[e.key] + TABS.length) % TABS.length
    setTab(TABS[next][0])
    e.currentTarget.parentElement
      ?.querySelectorAll('[role="tab"]')
      [next]?.focus()
  }

  return (
    <>
      <div className="cs-head">
        <ProjectLogo project={project} size="lg" />
        <div>
          <h2 id="pj-drawer-title">{project.name}</h2>
          <div className="pj-meta">
            <span>
              <i className="pj-dot" data-s={project.status} />
              {STATUS_LABELS[project.status]}
            </span>
            <span className="pj-sep" aria-hidden="true" />
            <span>{yearOf(project.date)}</span>
            <span className="pj-sep" aria-hidden="true" />
            <span>{KINDS[project.kind]}</span>
            {project.org && (
              <>
                <span className="pj-sep" aria-hidden="true" />
                <span>{project.org}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="cs-lede">{project.story.lede}</p>

      <div
        className="cs-tabs"
        role="tablist"
        aria-label="Case study sections"
        style={{ '--ti': tabIndex }}
      >
        <span className="cs-tab-ink" aria-hidden="true" />
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`cs-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`cs-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onTabKey}
          >
            <span className="pj-kicon-wrap">
              <PackIcon name={icon} size={20} />
            </span>
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`cs-panel-${tab}`}
        aria-labelledby={`cs-tab-${tab}`}
        tabIndex={0}
        key={tab}
      >
        {tab === 'journey' && <Journey project={project} />}
        {tab === 'results' && <Results project={project} />}
        {tab === 'team' && <TeamStack project={project} />}
      </div>

      <div className="cs-cta">
        {publicLink ? (
          <a
            href={project.link.href}
            className="pj-visit"
            target="_blank"
            rel="noreferrer"
          >
            Visit {project.link.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <p className="pj-private">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {privateNoteFor(project)}
          </p>
        )}
      </div>
    </>
  )
}

export function CaseStudyDrawer({
  projects,
  index,
  returnFocusRef,
  onClose,
  onStep,
}) {
  const reduced = useReducedMotion()
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const project = projects[index]
  const n = projects.length
  const prev = projects[(index - 1 + n) % n]
  const next = projects[(index + 1) % n]

  /* Lock the page behind, send focus in, and give it back on close. */
  useEffect(() => {
    const returnTo = returnFocusRef?.current ?? document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = overflow
      if (returnTo instanceof HTMLElement && returnTo.isConnected) {
        returnTo.focus({ preventScroll: true })
      }
    }
  }, [returnFocusRef])

  /* Focus trap, owned by the window so it holds even when focus has
     fallen out of the drawer (a click on plain text, or a step that
     removed the focused node): Tab always lands inside. */
  const trapTab = (e) => {
    const panel = panelRef.current
    if (!panel) return
    const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0
    )
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (!panel.contains(active) || active === panel) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    } else if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /* Esc closes; ← and → step through every project, except while focus
     is in the tab list (its own arrows) or a text field. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Tab') {
        trapTab(e)
        return
      }
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target
      if (
        target instanceof Element &&
        target.closest('[role="tablist"], input, textarea, select')
      )
        return
      onStep(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* Stepping re-mounts the story body; if focus was inside it, keep it in
     the drawer instead of letting it drop to the page. */
  useEffect(() => {
    const panel = panelRef.current
    panel?.scrollTo({ top: 0 })
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true })
    }
  }, [index])

  const slide = reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }

  return (
    <>
      <motion.div
        className="pj-scrim"
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3 }}
      />
      <motion.aside
        ref={panelRef}
        className="pj-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pj-drawer-title"
        tabIndex={-1}
        initial={{ x: '104%' }}
        animate={{ x: 0 }}
        exit={{ x: '104%' }}
        transition={slide}
      >
        <div className="pj-drawer-cover">
          <ProjectCover project={project} sizes="640px" />
          <svg
            className="cs-crown"
            viewBox="0 0 28 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 18h24M3 14 2 3l7 5 5-7 5 7 7-5-1 11z" />
          </svg>
          <span className="cs-kicker">
            Case study · {index + 1} of {n}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="pj-x"
            onClick={onClose}
            aria-label="Close case study"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="pj-drawer-body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={project.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                transition: { duration: reduced ? 0 : 0.15 },
              }}
              transition={
                reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }
              }
            >
              <StoryBody project={project} />
            </motion.div>
          </AnimatePresence>

          {/* Outside the keyed body so focus stays put while stepping. */}
          <nav className="pj-nav" aria-label="Other case studies">
            <button
              type="button"
              onClick={() => onStep(-1)}
              title={prev.name}
              aria-label={`Previous: ${prev.name}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>
                <small>Previous</small>
                <span>{prev.name}</span>
              </span>
            </button>
            <button
              type="button"
              className="cs-next"
              onClick={() => onStep(1)}
              title={next.name}
              aria-label={`Next: ${next.name}`}
            >
              <span>
                <small>Next</small>
                <span>{next.name}</span>
              </span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </motion.aside>
    </>
  )
}

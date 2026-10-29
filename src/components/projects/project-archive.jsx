'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsUpDown,
  SearchX,
  Search,
  X,
} from 'lucide-react'

import BorderGlow from '@/components/BorderGlow'
import { PackIcon } from '@/components/icon-pack'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { KINDS, KINDS_SHORT, STATUS_LABELS } from '@/content/site/projects'
import { countByKind, filterArchive, yearOf } from '@/lib/projects/archive'
import { ProjectCover, ProjectLogo } from './project-media'
import { useSegmentInk } from './motion-hooks'

/* TODO(alec): the per-project activity series has no defined meaning yet.
   The card sparklines, the list's Activity column and the drawer chart
   stay off until it does. */
export const SHOW_ACTIVITY = false

const KIND_ICON = {
  all: 'blocks',
  venture: 'rocket',
  client: 'network',
  oss: 'code',
  internal: 'system',
}
const KIND_OPTIONS = [['all', 'All'], ...Object.entries(KINDS)]

/* BorderGlow colours follow status. The tint stays near the edges (fill
   about 0.35) so it never washes over the text. */
const GLOW = {
  live: { colors: ['#3ce8ce', '#0b756c', '#38bdf8'], glowColor: '171 79 62' },
  development: {
    colors: ['#fbbf24', '#f59e0b', '#fde68a'],
    glowColor: '43 96 62',
  },
  archived: {
    colors: ['#d4d4d8', '#71717a', '#a1a1aa'],
    glowColor: '240 5 72',
  },
}
const SWEEP_CARDS = 9
const SWEEP_STAGGER = 140
const SWEEP_MS = 4000

/* The view choice persists per browser. A tiny external store keeps the
   server render on "cards" and swaps in the saved view without an effect. */
const VIEW_KEY = 'amw:projects-view'
const viewListeners = new Set()
let viewMemory = null
function readView() {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}
function writeView(view) {
  try {
    window.localStorage.setItem(VIEW_KEY, view)
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
  viewMemory = view
  viewListeners.forEach((fn) => fn())
}
function subscribeView(fn) {
  viewListeners.add(fn)
  return () => viewListeners.delete(fn)
}
const getView = () => viewMemory ?? readView()
const getServerView = () => 'cards'

function sparkPoints(values, w = 72, h = 24, pad = 3) {
  return values
    .map(
      (v, i) =>
        `${Math.round((i / (values.length - 1)) * w * 10) / 10},${
          Math.round((h - pad - (v / 100) * (h - pad * 2)) * 10) / 10
        }`
    )
    .join(' ')
}

function Spark({ values, className = 'pj-spark' }) {
  return (
    <svg className={className} viewBox="0 0 72 24" aria-hidden="true">
      <polyline points={sparkPoints(values)} />
    </svg>
  )
}

function ArchiveCard({ project, index, sweep, onOpen }) {
  /* The intro sweep arms per card on a stagger, once. */
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!sweep) return
    const timer = setTimeout(() => setArmed(true), index * SWEEP_STAGGER)
    return () => clearTimeout(timer)
  }, [sweep, index])
  const glow = GLOW[project.status] || GLOW.archived

  return (
    <li className="pj-card-item" style={{ '--i': index }}>
      <BorderGlow
        {...glow}
        animated={sweep && armed}
        backgroundColor="var(--pj-panel)"
        borderRadius={20}
        glowRadius={40}
        edgeSensitivity={30}
        coneSpread={25}
        fillOpacity={0.35}
        shadow="none"
        className="h-full"
      >
        <button
          type="button"
          className="pj-card"
          data-s={project.status}
          onClick={(e) => onOpen(project.key, e.currentTarget)}
          aria-label={`Open ${project.name}`}
        >
          <span className="pj-card-cover">
            <ProjectCover
              project={project}
              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 360px"
            />
            <span className="pj-state">
              <i className="pj-dot" data-s={project.status} />
              {STATUS_LABELS[project.status]}
            </span>
          </span>
          <span className="pj-card-body">
            <ProjectLogo project={project} />
            <span className="pj-card-title">
              <b>{project.name}</b>
              <i>{yearOf(project.date)}</i>
            </span>
            <span className="pj-card-desc">{project.description}</span>
            <span className="pj-card-foot">
              <span className="pj-tags">
                {project.tags.slice(0, 2).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </span>
              {SHOW_ACTIVITY && <Spark values={project.activity} />}
            </span>
          </span>
        </button>
      </BorderGlow>
    </li>
  )
}

/* Inactive columns show both arrows; the active one shows its direction. */
function SortIcon({ active, dir }) {
  const Icon = !active ? ChevronsUpDown : dir === 1 ? ArrowUp : ArrowDown
  return <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
}

function ArchiveList({ items, sort, onSort, onOpen }) {
  const dirWord = (key) =>
    sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'
  return (
    <div className="pj-list" data-activity={SHOW_ACTIVITY}>
      <div className="pj-lhead">
        <span aria-hidden="true" />
        <button
          type="button"
          className="pj-sort"
          data-on={sort.key === 'name'}
          onClick={() => onSort('name')}
          aria-label={`Sort by build name (now ${dirWord('name')})`}
        >
          Build
          <SortIcon active={sort.key === 'name'} dir={sort.dir} />
        </button>
        <span className="pj-lc-kind">Kind</span>
        <button
          type="button"
          className="pj-sort pj-lc-year"
          data-on={sort.key === 'year'}
          onClick={() => onSort('year')}
          aria-label={`Sort by year (now ${dirWord('year')})`}
        >
          Year
          <SortIcon active={sort.key === 'year'} dir={sort.dir} />
        </button>
        <span className="pj-lc-status">Status</span>
        {SHOW_ACTIVITY && <span className="pj-lc-act">Activity</span>}
        <span aria-hidden="true" />
      </div>
      <ul className="pj-rows">
        {items.map((p, i) => (
          <li key={p.key} style={{ '--i': i }}>
            <button
              type="button"
              className="pj-row"
              data-s={p.status}
              onClick={(e) => onOpen(p.key, e.currentTarget)}
              aria-label={`Open ${p.name}`}
            >
              <ProjectLogo project={p} size="sm" />
              <span className="pj-row-main">
                <b>{p.name}</b>
                <span>{p.description}</span>
              </span>
              <span className="pj-lc-kind pj-row-kind">{KINDS[p.kind]}</span>
              <span className="pj-lc-year pj-row-year">{yearOf(p.date)}</span>
              <span className="pj-lc-status pj-row-status">
                <i className="pj-dot" data-s={p.status} />
                {STATUS_LABELS[p.status]}
              </span>
              {SHOW_ACTIVITY && (
                <Spark values={p.activity} className="pj-spark pj-lc-act" />
              )}
              <span className="pj-row-go" aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProjectArchive({ list, onOpen }) {
  const reduced = useReducedMotion()
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'year', dir: -1 })
  const view = useSyncExternalStore(subscribeView, getView, getServerView)
  const kindRef = useRef(null)
  const viewRef = useRef(null)
  const resultsRef = useRef(null)
  useSegmentInk(kindRef, kind)
  useSegmentInk(viewRef, view)

  const counts = countByKind(list, query)
  const items = filterArchive(list, {
    kind,
    query,
    sortKey: sort.key,
    sortDir: sort.dir,
  })
  const resultsKey = `${kind}-${view}`

  /* The intro sweep plays once, the first time the grid scrolls into
     view. It is tied to the results key it started on, so a kind or view
     change (which remounts the cards) never replays it. */
  /* Triggers once the top of the results is a quarter of the way up the
     viewport. A ratio of the whole grid would never be reached on a phone,
     where the single column is several screens tall. */
  const inView = useInView(resultsRef, {
    once: true,
    margin: '0px 0px -25% 0px',
  })
  const [sweep, setSweep] = useState({ key: null, done: false })
  /* Latch it done as soon as the results key moves on, so switching away
     and back mid-sweep cannot replay it. */
  if (sweep.key !== null && !sweep.done && sweep.key !== resultsKey) {
    setSweep({ ...sweep, done: true })
  }
  useEffect(() => {
    if (!inView || reduced || sweep.key !== null) return
    const start = setTimeout(
      () => setSweep({ key: resultsKey, done: false }),
      450
    )
    return () => clearTimeout(start)
  }, [inView, reduced, sweep.key, resultsKey])
  useEffect(() => {
    if (sweep.key === null || sweep.done) return
    const end = setTimeout(
      () => setSweep((s) => ({ ...s, done: true })),
      SWEEP_MS + SWEEP_CARDS * SWEEP_STAGGER + 200
    )
    return () => clearTimeout(end)
  }, [sweep.key, sweep.done])
  const sweeping =
    !sweep.done && sweep.key === resultsKey && view === 'cards' && !reduced

  const onSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: -s.dir }
        : { key, dir: key === 'year' ? -1 : 1 }
    )
  const clearFilters = () => {
    setQuery('')
    setKind('all')
  }
  const trimmed = query.trim()

  return (
    <section aria-labelledby="pj-arch-title" className="pj-wrap pj-section">
      <motion.div
        className="pj-arch-head"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={
          reduced ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
      >
        <div>
          <p className="pj-kicker">02 · The archive</p>
          <h2 id="pj-arch-title" className="pj-h2">
            Every build on record.
          </h2>
          <p className="pj-lead">
            Open any build for the full story and how it turned out.
          </p>
        </div>
        <div ref={viewRef} className="pj-view" role="group" aria-label="View">
          <span className="seg-ink" aria-hidden="true" />
          <button
            type="button"
            aria-pressed={view === 'cards'}
            onClick={() => writeView('cards')}
            data-v="cards"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            Cards
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => writeView('list')}
            data-v="list"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
              <path d="M3 6h.01" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M8 6h13" />
            </svg>
            List
          </button>
        </div>
      </motion.div>

      <div className="pj-ctrl">
        <div
          ref={kindRef}
          className="pj-seg"
          role="group"
          aria-label="Filter by kind"
        >
          <span className="seg-ink" aria-hidden="true" />
          {KIND_OPTIONS.map(([key, label]) => {
            const count = counts[key]
            return (
              <button
                key={key}
                type="button"
                aria-pressed={kind === key}
                onClick={(e) => {
                  setKind(key)
                  /* On phones the row can scroll; keep the pick in view. */
                  e.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                  })
                }}
                aria-label={`${label}, ${count} ${
                  count === 1 ? 'build' : 'builds'
                }`}
                title={label}
              >
                <span className="pj-kicon-wrap">
                  <PackIcon
                    name={KIND_ICON[key]}
                    size={18}
                    className="pj-kicon"
                  />
                </span>
                <span className="pj-klabel">
                  <span className="pj-kl-full">{label}</span>
                  <span className="pj-kl-short">{KINDS_SHORT[key]}</span>
                </span>
                <em>{count}</em>
              </button>
            )
          })}
        </div>
        <label className="pj-search">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search builds, tags or stack"
            aria-label="Search builds"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="pj-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <p className="pj-count" aria-live="polite">
        Showing{' '}
        <b key={`${items.length}-${kind}`} className="pj-countn">
          {items.length}
        </b>{' '}
        of {list.length} builds
      </p>

      <div ref={resultsRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={resultsKey}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
          >
            {items.length === 0 ? null : view === 'cards' ? (
              <ul className="pj-arch">
                {items.map((p, i) => (
                  <ArchiveCard
                    key={p.key}
                    project={p}
                    index={i}
                    sweep={sweeping && i < SWEEP_CARDS}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            ) : (
              <ArchiveList
                items={items}
                sort={sort}
                onSort={onSort}
                onOpen={onOpen}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div className="pj-empty">
          <span className="pj-empty-ico" aria-hidden="true">
            <SearchX className="h-5 w-5" />
          </span>
          <b>No builds match {trimmed ? `“${trimmed}”` : 'this filter'}.</b>
          <span>
            Try another word, or clear the filters to see every build.
          </span>
          <button type="button" className="pj-quiet" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  )
}

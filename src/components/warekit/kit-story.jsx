import {
  IconBrandGithub,
  IconBrandVercel,
  IconBrowser,
  IconFile,
  IconFolder,
  IconServer,
} from '@tabler/icons-react'

import { inlineCode } from '@/components/site/inline-code'
import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import {
  CopyButton,
  InView,
  Rise,
  TypedCommands,
} from '@/components/warekit/kit-motion'

/*
 * The illustrated sections of a kit's product page, drawn from `kitStory` in
 * content/site/warekit.js. A product with no story never gets here; the page
 * falls back to its plain features list.
 *
 *   sec.01  how it fits together  -- every kit with a story
 *   sec.02  why it's pro          -- only where the story has `layers`
 *   sec.03  what's in the repo    -- the tree and the quick start
 *   sec.04  what's included       -- the row's own features
 *
 * Numbers follow what is shown, so a Lite page reads 01, 02, 03 with no gap.
 */

const ICON = { size: 20, stroke: 1.5, 'aria-hidden': true }
const NODE_ICONS = {
  browser: IconBrowser,
  vercel: IconBrandVercel,
  restlet: IconServer,
}

const H2 =
  'text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-zinc-900 dark:text-zinc-50 sm:text-[2rem]'
const LEAD =
  'mt-3.5 max-w-[40rem] text-base leading-[1.75] text-[var(--amw-mut)]'

function Eyebrow({ n, label }) {
  return <SectionEyebrow index={String(n).padStart(2, '0')} label={label} />
}

function Flow({ n, flow }) {
  return (
    <Rise className="mt-[4.5rem]" aria-labelledby="kit-flow">
      <Eyebrow n={n} label="how it fits together" />
      <h2 id="kit-flow" className={H2}>
        {flow.title}
      </h2>
      <p className={LEAD}>{inlineCode(flow.copy)}</p>

      <ol className="amw-kit-panel mt-7 flex flex-col p-5 sm:flex-row sm:items-center sm:px-6 sm:py-7">
        {flow.nodes.map((node, i) => {
          const Icon = NODE_ICONS[node.icon] ?? IconServer
          return (
            <li
              key={node.name}
              className="flex min-w-0 flex-col sm:flex-1 sm:flex-row sm:items-center"
            >
              {i > 0 && (
                <span aria-hidden="true" className="amw-kit-wire">
                  <span
                    className="amw-kit-packet"
                    style={{ '--d': `${(i - 1) * 1.2}s` }}
                  />
                </span>
              )}
              <div
                className="amw-kit-card amw-kit-lift flex min-w-0 flex-1 flex-col gap-2.5 p-[18px] sm:min-w-[150px]"
                /* The inner card is the page's card colour on the muted
                   panel. The middle node's teal edge is an outline, so the
                   hover rim (a box-shadow) can still land on top of it. */
                style={{
                  background: 'var(--amw-card)',
                  ...(node.accent && {
                    outline:
                      '1px solid color-mix(in srgb, var(--amw-accent) 30%, transparent)',
                    outlineOffset: '-1px',
                  }),
                }}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    node.accent
                      ? 'bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)]'
                      : 'bg-[var(--amw-card-2)] text-[var(--amw-ink)]'
                  }`}
                >
                  <Icon {...ICON} />
                </span>
                <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                  {node.name}
                </span>
                <span className="text-[var(--amw-mut)] text-[13px] leading-normal">
                  {inlineCode(node.note)}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </Rise>
  )
}

function Layers({ n, layers }) {
  return (
    <Rise className="mt-[4.5rem]" aria-labelledby="kit-layers">
      <Eyebrow n={n} label="why it’s pro" />
      <h2 id="kit-layers" className={H2}>
        {layers.title}
      </h2>
      <p className={LEAD}>{layers.copy}</p>

      <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {layers.items.map((layer, i) => (
          <li
            key={layer.name}
            className="amw-kit-card amw-kit-layer flex flex-col gap-2.5 p-5"
            style={{ '--d': `${i * 2}s` }}
          >
            <span
              aria-hidden="true"
              className="amw-kit-layer-num grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold"
              style={{ '--d': `${i * 2}s` }}
            >
              {i + 1}
            </span>
            <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
              {layer.name}
            </span>
            <span className="text-[var(--amw-mut)] text-[13px] leading-[1.55]">
              {layer.note}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[var(--amw-mut)] mt-3.5 text-[13px] leading-relaxed">
        {layers.trade}
      </p>
    </Rise>
  )
}

function Repo({ n, repo, quickStart }) {
  return (
    <Rise className="mt-[4.5rem]" aria-labelledby="kit-repo">
      <Eyebrow n={n} label="what’s in the repo" />
      <h2 id="kit-repo" className={H2}>
        {quickStart.title}
      </h2>
      <p className={LEAD}>{quickStart.copy}</p>

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="amw-kit-card overflow-hidden">
          <div className="border-[var(--amw-line)] flex items-center gap-2.5 border-b px-[18px] py-3.5">
            <IconBrandGithub
              size={18}
              stroke={1.5}
              aria-hidden="true"
              className="text-[var(--amw-mut)] shrink-0"
            />
            <span className="text-[var(--amw-ink)] min-w-0 truncate text-[13px] font-medium">
              {repo.name}
            </span>
            <span className="ring-[var(--amw-line-strong)] text-[var(--amw-mut)] ml-auto rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset">
              Private
            </span>
          </div>
          <ul className="py-2 text-[13px]" aria-label="Repository layout">
            {repo.tree.map((row) => {
              const Icon = row.dir ? IconFolder : IconFile
              return (
                <li
                  key={`${row.depth}-${row.name}`}
                  className="amw-kit-row flex min-h-[38px] items-center gap-2.5 py-2 pr-[18px]"
                  style={{ paddingLeft: `${18 + row.depth * 22}px` }}
                >
                  <Icon
                    size={16}
                    stroke={1.5}
                    aria-hidden="true"
                    className={`shrink-0 ${
                      row.dir
                        ? 'text-[var(--amw-accent-ink)]'
                        : 'text-[var(--amw-mut)]'
                    }`}
                  />
                  <span className="amw-mono text-[var(--amw-ink)] whitespace-nowrap text-xs">
                    {row.name}
                  </span>
                  {row.note && (
                    <span className="amw-kit-row-note text-[var(--amw-mut)] min-w-0 truncate text-xs">
                      <span className="sr-only">: </span>
                      {row.note}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="amw-kit-inset flex flex-col">
          <div className="border-[var(--amw-line)] flex items-center justify-between gap-2.5 border-b py-1.5 pl-[18px] pr-2">
            <span className="amw-kicker">quick start</span>
            <CopyButton text={quickStart.commands.join('\n')} />
          </div>
          <TypedCommands
            commands={quickStart.commands}
            start={0.6}
            className="text-[var(--amw-ink)] p-[18px] text-[13px]"
          />
          <p className="border-[var(--amw-line)] text-[var(--amw-mut)] mt-auto border-t border-dashed px-[18px] py-3.5 text-[13px] leading-[1.55]">
            {inlineCode(quickStart.note)}
          </p>
        </div>
      </div>
    </Rise>
  )
}

/**
 * The features list with checks that draw in one by one. Used with and
 * without a story: only the eyebrow's number depends on one.
 *
 * @param {{ features: { feature?: string | null }[], n?: number | null,
 *   roadmap?: string | null }} props
 */
export function IncludedList({ features, n = null, roadmap = null }) {
  if (features.length === 0) return null
  return (
    <Rise className="mt-[4.5rem]" aria-labelledby="kit-included">
      {n ? (
        <Eyebrow n={n} label="what’s included" />
      ) : (
        <p className="amw-eyebrow mb-4">{'// what’s included'}</p>
      )}
      <h2 id="kit-included" className="sr-only">
        What’s included
      </h2>
      <InView
        as="ul"
        className="mt-2 grid grid-cols-1 gap-x-7 gap-y-4 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 sm:grid-cols-2"
      >
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="amw-kit-box mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-[5px]"
              style={{ '--i': i }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 6.3 5 8.7l4.5-5.4" />
              </svg>
            </span>
            {/* A plain text field cannot carry formatting, so the backtick
                convention is resolved here. */}
            <span>{inlineCode(f.feature)}</span>
          </li>
        ))}
      </InView>
      {roadmap && (
        <p className="text-[var(--amw-mut)] mt-6 max-w-[40rem] text-sm leading-[1.7]">
          {roadmap}
        </p>
      )}
    </Rise>
  )
}

/**
 * @param {{
 *   story: any,
 *   features: { feature?: string | null }[],
 *   showRoadmap?: boolean,
 * }} props
 */
export function KitStorySections({ story, features, showRoadmap = true }) {
  let n = 0
  return (
    <>
      <Flow n={++n} flow={story.flow} />
      {story.layers && <Layers n={++n} layers={story.layers} />}
      <Repo n={++n} repo={story.repo} quickStart={story.quickStart} />
      <IncludedList
        features={features}
        n={features.length > 0 ? ++n : null}
        roadmap={showRoadmap ? story.roadmap : null}
      />
    </>
  )
}

/**
 * The tagline with the story's phrases in the home hero's highlight. Only
 * phrases the tagline actually contains are marked, and the text itself is
 * never changed: alternate highlights are pills, as on the hero.
 *
 * `startPill` makes the first highlight the pill instead of the second.
 *
 * @param {{ text: string, phrases?: string[], startPill?: boolean }} props
 */
export function HighlightedText({ text, phrases = [], startPill = false }) {
  const found = phrases
    .map((p) => ({ p, at: text.indexOf(p) }))
    .filter((h) => h.p && h.at >= 0)
    .sort((a, b) => a.at - b.at)

  const out = []
  let last = 0
  let k = 0
  for (const { p, at } of found) {
    if (at < last) continue
    if (at > last) out.push(text.slice(last, at))
    out.push(
      <span
        key={at}
        className={`amw-kit-hl ${
          (k + (startPill ? 1 : 0)) % 2 === 1 ? 'amw-kit-hl--pill' : ''
        }`}
      >
        {p}
      </span>
    )
    k += 1
    last = at + p.length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

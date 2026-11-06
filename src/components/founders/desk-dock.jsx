'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  LayoutGrid,
  Link2,
  Lock,
  Mail,
  Percent,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import Dock from '@/components/ui/dock'
import { useMediaQuery, useMounted } from '@/hooks/use-client-value'
import {
  DESK_HREF,
  REVIEW_HREF,
  liveTools,
  soonTools,
} from '@/lib/founders/tools'
import {
  hasHydrated,
  onHydrated,
  onRememberChange,
  rememberAnswers,
  setRememberAnswers,
  useOfferStore,
} from '@/lib/founders/offer-store'
import { exampleHref, takeExampleParam } from '@/lib/founders/worked-example'
import { subscribeDesk } from '@/components/founders/desk-toast'
import { CONTACT_EMAIL } from '@/lib/site-nav'
import { siteOrigin } from '@/lib/site-origin'

/*
 * The Founders' Desk dock (design: docs/design/2026-11-04-desk-dock/).
 *
 * One definition shared by every desk page, so the dock reads the same
 * everywhere: the desk, the live tools, the review, the tools still being
 * built, and a bin for the answers kept in this browser. Every tile comes from
 * the tool registry, so a tool going live turns its tile into a link with no
 * change here.
 *
 * `current`: 'desk' | a live tool id ('equity', 'job-offer') | 'review'.
 * `readReady`: the page has a result worth sending, which badges Review.
 * `onExample`: loads the worked example in place (calculators only).
 * `onClear`: the page's own reset; without it the bin clears the store.
 * `aboveSummaryBar`: the equity wizard's phone summary bar is showing.
 * `hidden`: hide while something else owns the bottom of the screen.
 */

const TOOL_ICONS = { Percent, ArrowLeftRight }

const CALCULATOR_IDS = new Set(liveTools().map((tool) => tool.id))

/* Below this the ten tiles would shrink under a 44px target (5. Phones). */
const PHONE = '(max-width: 639px)'
/* Where the equity wizard's summary bar shows (its wrapper is md:hidden). */
const BELOW_MD = '(max-width: 767px)'

const SUMMARY_BAR = 56
const PANEL = 64
const EDGE = 12
const TOAST_MS = 2400

/* The tokens the design passes over the React Bits dark theme. */
const TOKENS = {
  '--dock-panel': 'rgba(16, 16, 21, 0.72)',
  '--dock-panel-edge': 'rgba(255, 255, 255, 0.09)',
  '--dock-panel-highlight': 'rgba(255, 255, 255, 0.06)',
  '--dock-tile': 'linear-gradient(180deg, #23232b 0%, #141419 100%)',
  '--dock-tile-edge': 'rgba(255, 255, 255, 0.08)',
  '--dock-tile-highlight': 'rgba(255, 255, 255, 0.1)',
  '--dock-ink': '#e4e4e7',
  '--dock-label': '#fafafa',
  '--dock-label-ink': '#09090b',
  '--dock-dot': '#3ce8ce',
  '--dock-menu': 'rgba(20, 20, 26, 0.86)',
  '--dock-menu-edge': 'rgba(255, 255, 255, 0.12)',
}

const CURRENT_FACE = {
  color: '#3ce8ce',
  background: 'linear-gradient(180deg, #123b36 0%, #0a201d 100%)',
  boxShadow:
    'inset 0 0 0 1px rgba(60, 232, 206, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 18px -6px rgba(60, 232, 206, 0.45)',
}

const tileIcon = (Icon) => (
  <Icon className="size-[1em]" strokeWidth={1.8} aria-hidden="true" />
)

const rowIcon = (Icon) => (
  <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
)

/* The premium illustrations from the canvas (public/images/founders/soon),
   greyed behind a lock until hovered or focused, then in colour. */
function SoonArt({ id, reduced }) {
  const ease = reduced
    ? ''
    : 'transition-[filter,transform] duration-[450ms] ease-[cubic-bezier(.34,1.56,.64,1)]'
  return (
    <>
      <Image
        src={`/images/founders/soon/${id}.svg`}
        alt=""
        width={48}
        height={48}
        unoptimized
        className={`h-[72%] w-[72%] [filter:grayscale(1)_brightness(.62)] group-hover:scale-[1.06] group-hover:[filter:none] group-focus-visible:scale-[1.06] group-focus-visible:[filter:none] ${ease}`}
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-[6%] right-[6%] flex h-[30%] w-[30%] items-center justify-center rounded-[28%] bg-zinc-800 text-zinc-400 shadow-[0_0_0_2px_#141419] group-hover:-rotate-45 group-hover:scale-0 group-hover:opacity-0 group-focus-visible:-rotate-45 group-focus-visible:scale-0 group-focus-visible:opacity-0 ${
          reduced
            ? ''
            : 'transition-[transform,opacity] duration-[450ms] ease-[cubic-bezier(.34,1.56,.64,1)]'
        }`}
      >
        <Lock className="h-[60%] w-[60%]" strokeWidth={3} />
      </span>
    </>
  )
}

/* Clipboard without the brief's analytics: `useClipboard` reports every copy
   as `founders_copied`, the funnel event for copying the brief, and a copied
   link is not that. A failed write says so and shows the text instead of
   claiming success. */
async function writeClipboard(text) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const serverNotHydrated = () => false
const serverNotRemembered = () => false

export function useRememberAnswers() {
  return useSyncExternalStore(
    onRememberChange,
    rememberAnswers,
    serverNotRemembered
  )
}

export function FoundersDeskDock({
  current,
  readReady = false,
  onExample,
  onClear,
  aboveSummaryBar = false,
  hidden = false,
}) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const phone = useMediaQuery(PHONE)
  const belowMd = useMediaQuery(BELOW_MD)
  const mounted = useMounted()
  const remember = useRememberAnswers()
  const hydrated = useSyncExternalStore(
    onHydrated,
    hasHydrated,
    serverNotHydrated
  )

  const [toast, setToast] = useState(null)
  /* A new id per message restarts the timer even when the text repeats. A
     `fallback` toast carries text the visitor has to copy by hand, so it stays
     until dismissed and its text can be selected. */
  const say = useCallback((text, fallback = null) => {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text, fallback }))
  }, [])
  /* Pages speak through the same pill (`announceDesk`), so the desk never
     shows two toasts at once. */
  useEffect(() => subscribeDesk((text) => say(text)), [say])
  useEffect(() => {
    if (!toast || toast.fallback) return undefined
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const copy = useCallback(
    async (text, done) => {
      const ok = await writeClipboard(text)
      if (ok) say(done)
      else say("Couldn't copy. Here it is:", text)
    },
    [say]
  )

  const loadExample = useCallback(() => {
    if (!onExample) return
    const fresh = useOfferStore.getState().isPristine()
    onExample()
    say(
      fresh
        ? 'Worked example loaded'
        : 'Replaced your answers with the worked example'
    )
  }, [onExample, say])

  /* `?example` from another page's dock. Waits for persisted answers to land,
     or hydration would write them straight back over the example. The param
     is stripped as it is read, so a reload keeps whatever was edited since. */
  useEffect(() => {
    if (!hydrated || !onExample) return
    /* `set-state-in-effect` is off for this one line, for the reason the job
       offer calculator gives for its prefill latch: the URL param after
       hydration is a one-shot external event, it cannot be derived during
       render, and it is consumed here so this runs once. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (takeExampleParam()) loadExample()
  }, [hydrated, onExample, loadExample])

  const clearAnswers = () => {
    const had = !useOfferStore.getState().isPristine()
    if (onClear) onClear()
    else useOfferStore.getState().clear()
    say(had ? 'Answers cleared' : 'Nothing saved yet')
  }

  const lifted = aboveSummaryBar && belowMd

  /* The footer pads by this, so the last of the page never sits under the
     dock (or under the dock and the summary bar). */
  useEffect(() => {
    if (hidden) return undefined
    const root = document.documentElement
    const lift = lifted ? SUMMARY_BAR : 0
    root.style.setProperty(
      '--desk-dock-space',
      `calc(${PANEL + EDGE + 24 + lift}px + env(safe-area-inset-bottom))`
    )
    return () => root.style.removeProperty('--desk-dock-space')
  }, [lifted, hidden])

  const isMac =
    mounted &&
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform ?? '')

  const liveTile = ({ id, label, href, icon, extra = [] }) => {
    const here = id === current
    return {
      icon: tileIcon(icon),
      label,
      href,
      current: here,
      active: here,
      faceStyle: here ? CURRENT_FACE : undefined,
      onClick: here ? (event) => event.preventDefault() : undefined,
      menu: [
        {
          label: here ? 'You are here' : 'Open',
          icon: rowIcon(icon),
          disabled: here,
          onClick: () => router.push(href),
        },
        ...extra,
        { separator: true },
        {
          label: 'Copy link',
          icon: rowIcon(Link2),
          shortcut: isMac ? '⌘C' : 'Ctrl+C',
          shortcutKey: 'c',
          onClick: () => copy(`${siteOrigin}${href}`, `Link copied · ${href}`),
        },
      ],
    }
  }

  const calculatorTiles = liveTools().map((tool) =>
    liveTile({
      id: tool.id,
      label: tool.label,
      href: tool.href,
      icon: TOOL_ICONS[tool.icon] ?? Percent,
      extra: [
        {
          label: 'Open with the worked example',
          icon: rowIcon(Sparkles),
          onClick: () =>
            tool.id === current && onExample
              ? loadExample()
              : router.push(exampleHref(tool.href)),
        },
      ],
    })
  )

  const review = liveTile({
    id: 'review',
    label: 'Review my offer',
    href: REVIEW_HREF,
    icon: Send,
    extra: [
      {
        label: 'Copy email address',
        icon: rowIcon(Mail),
        onClick: () => copy(CONTACT_EMAIL, 'Email address copied'),
      },
    ],
  })
  if (readReady && CALCULATOR_IDS.has(current)) {
    review.badge = true
    review.ariaLabel = 'Review my offer, ready to send'
  }

  const soon = soonTools().map((tool) => ({
    icon: <SoonArt id={tool.id} reduced={reduced} />,
    label: tool.label,
    note: 'Soon',
    ariaLabel: `${tool.label}, coming soon`,
    onClick: () => say(`${tool.label} · ${tool.blurb}`),
    menu: [
      { label: 'Coming soon', disabled: true },
      { separator: true },
      {
        label: 'What it will do',
        icon: rowIcon(Sparkles),
        onClick: () => say(tool.blurb),
      },
    ],
  }))

  const bin = {
    icon: tileIcon(Trash2),
    label: 'Clear my answers',
    onClick: clearAnswers,
    menu: [
      {
        label: 'Clear my answers',
        icon: rowIcon(Trash2),
        onClick: clearAnswers,
      },
      { separator: true },
      {
        label: 'Remember answers in this browser',
        checked: remember,
        onClick: () => {
          const now = setRememberAnswers(!remember)
          if (now === remember) {
            say("This browser won't let the desk keep answers")
            return
          }
          say(
            now
              ? 'Answers kept in this browser'
              : 'Answers forgotten when you close the tab'
          )
        },
      },
    ],
  }

  const items = [
    liveTile({
      id: 'desk',
      label: 'Founders’ Desk',
      href: DESK_HREF,
      icon: LayoutGrid,
    }),
    { separator: true },
    ...calculatorTiles,
    review,
    /* Phones drop the soon tools: all ten tiles would shrink under 44px. The
       site menu still lists them as "Coming soon". */
    ...(phone || soon.length === 0 ? [] : [{ separator: true }, ...soon]),
    { separator: true },
    bin,
  ]

  return (
    <div
      className={`amw pointer-events-none fixed inset-x-0 z-[45] h-0 ${
        hidden ? 'invisible' : ''
      }`}
      style={{
        bottom: lifted
          ? `calc(${SUMMARY_BAR}px + env(safe-area-inset-bottom))`
          : 'env(safe-area-inset-bottom)',
      }}
      data-print="hide"
      data-desk-dock=""
    >
      {/* The page fades out under the dock rather than ending at its edge. */}
      <div
        aria-hidden="true"
        className="bg-[linear-gradient(to_top,color-mix(in_srgb,var(--amw-page)_92%,transparent),color-mix(in_srgb,var(--amw-page)_60%,transparent)_45%,transparent)] pointer-events-none absolute inset-x-0 bottom-0 h-[120px]"
      />

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-4 flex justify-center"
        style={{ bottom: PANEL + EDGE + 16 }}
      >
        {toast ? (
          <span
            key={toast.id}
            className={`text-zinc-950 max-w-md rounded-lg bg-zinc-50 px-3 py-2 text-center text-[13px] font-medium leading-snug shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] [overflow-wrap:anywhere] ${
              toast.fallback ? 'pointer-events-auto' : ''
            }`}
          >
            {toast.text}
            {toast.fallback ? (
              <>
                {' '}
                <span className="select-all font-mono">{toast.fallback}</span>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="min-h-11 ml-2 px-2 align-middle underline underline-offset-4"
                >
                  Dismiss
                </button>
              </>
            ) : null}
          </span>
        ) : null}
      </div>

      <Dock
        items={items}
        label="Founders’ Desk tools"
        baseItemSize={48}
        magnification={72}
        distance={180}
        panelHeight={PANEL}
        gap={8}
        roundness={0.55}
        accentColor="#3ce8ce"
        badgeColor="#3ce8ce"
        menuActiveInk="#09090b"
        tokens={TOKENS}
        reducedMotion={reduced}
        className="amw-desk-dock-in pointer-events-auto"
      />
    </div>
  )
}

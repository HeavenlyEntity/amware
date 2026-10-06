'use client'
import { useState } from 'react'
import { IconBrandFigma } from '@tabler/icons-react'
import { FileIcon, MousePointerIcon, SidebarIcon } from './icons'
import { cn } from '@/lib/utils'
import { GridLineHorizontal, GridLineVertical } from './grid-lines'
const NAV_LABELS = ['Services', 'Projects', 'Contact']

const MacTrafficLights = () => (
  <div className="flex shrink-0 items-center gap-1" aria-hidden>
    <span className="size-2 rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
    <span className="size-2 rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
    <span className="size-2 rounded-full bg-[#27C93F] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
  </div>
)
/* Scaled-down site header: brand, links and call to action, as text only. */
const MiniNavbar = () => (
  <div className="relative z-10 shrink-0 overflow-hidden px-2 pb-1 pt-2">
    <div className="flex items-center justify-between overflow-hidden rounded-lg bg-white px-2 py-1.5 shadow-sm shadow-black/5 ring-1 ring-black/5">
      <span className="flex shrink-0 items-center gap-0.5 text-[8px] font-semibold tracking-tight text-neutral-800">
        AMWARE
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 px-1">
        {NAV_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="bg-[var(--amw-accent)] size-0.5 shrink-0 rounded-full" />
            )}
            <span className="truncate text-[6px] font-medium text-neutral-700">
              {label}
            </span>
          </div>
        ))}
      </div>
      <span className="bg-[var(--amw-accent)] text-zinc-950 shrink-0 rounded-md px-2 py-0.5 text-[6px] font-medium">
        Book a call
      </span>
    </div>
  </div>
)
/** Mirrors `MasonryTestimonials`: white cards, quote-first + footer author row. */
const SKELETON_QUOTE_ROWS = [
  ['w-full', 'w-[94%]', 'w-[78%]'],
  ['w-[91%]', 'w-full'],
  ['w-full', 'w-[88%]', 'w-[70%]'],
]
const TestimonialSkeletons = () => {
  return (
    <section className="overflow-hidden px-2 pb-3 pt-2">
      <div className="mx-auto grid max-w-none grid-cols-3 gap-1">
        {SKELETON_QUOTE_ROWS.map((rows, i) => (
          <article
            key={i}
            className="flex h-full min-h-0 flex-col rounded-sm bg-white p-2 shadow-sm shadow-black/10 ring-1 ring-black/10"
          >
            <blockquote className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="min-h-0 flex-1 space-y-1">
                {rows.map((w, j) => (
                  <div
                    key={`${i}-q-${j}`}
                    className={`h-2 rounded-full bg-neutral-100/95 ${w}`}
                  />
                ))}
              </div>
              <footer className="mt-auto flex shrink-0 items-center gap-1.5 pt-0.5 sm:gap-2">
                <div className="mt-1.5 flex justify-center gap-1">
                  <span className="min-w-13 bg-[var(--amw-accent)] flex h-5 items-center justify-center rounded-md px-2">
                    <span className="h-0.5 w-3 rounded-full bg-white" />
                  </span>
                  <span className="min-w-13 flex h-5 items-center justify-center rounded-md border border-neutral-200 bg-white px-2">
                    <span className="h-0.5 w-3 rounded-full bg-neutral-300" />
                  </span>
                </div>
              </footer>
            </blockquote>
          </article>
        ))}
      </div>
    </section>
  )
}
/* Shared hero block for the site tab and the Figma frame. */
const HeroContentMini = ({ className }) => (
  <div
    className={cn(
      'mx-auto flex max-w-[36ch] flex-col items-center gap-2 px-2 pb-3 pt-4 text-center',
      className
    )}
  >
    <p className="text-balance max-w-[40ch] text-[9px] font-semibold leading-snug tracking-tight text-neutral-700 sm:text-[10px] md:text-[11px]">
      Design-led websites that
      <br />
      <span className="text-teal-700">earn trust</span> in the first scroll
    </p>
    <p className="text-pretty mt-0.5 max-w-[56ch] text-[6px] leading-relaxed text-neutral-500 sm:text-[7px] md:text-[8px]">
      Custom sites with clear hierarchy, intentional motion, and performance
      that holds up when real traffic shows up.
    </p>
    <div className="mt-1 flex flex-col items-center gap-1.5 sm:mt-1.5 sm:flex-row sm:gap-2">
      <span className="bg-[var(--amw-accent)] text-zinc-950 rounded-lg px-2 py-1 text-[6px] font-medium md:text-[7px]">
        Talk to Alec
      </span>
      <span className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[6px] font-medium text-neutral-700 md:text-[7px]">
        Explore work
      </span>
    </div>
  </div>
)
/** Site browser tab: full chrome, grid lines, hero + testimonials. */
const SitePageMini = () => {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <MiniNavbar />

      <div className="relative z-10 h-3 w-full shrink-0">
        <GridLineHorizontal
          offset="32px"
          className="top-1/2 -translate-y-1/2"
        />
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="relative w-3 shrink-0 self-stretch overflow-hidden">
          <GridLineVertical offset="36px" className="right-0 left-auto" />
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-3">
          <HeroContentMini />

          <div className="relative z-10 h-3 w-full shrink-0">
            <GridLineHorizontal
              offset="32px"
              className="top-1/2 -translate-y-1/2"
            />
          </div>

          <TestimonialSkeletons />
        </div>

        <div className="relative w-3 shrink-0 self-stretch overflow-hidden">
          <GridLineVertical offset="36px" className="left-0 right-auto" />
        </div>
      </div>
    </div>
  )
}
/** Figma sidebar — pages and file tree, scaled for the mock. */
const FIGMA_PAGES = ['Blog', 'Home', 'About', 'Contact', 'Services']
const FigmaSidebarMini = () => (
  <aside
    className="w-18 flex shrink-0 flex-col overflow-hidden border-r border-neutral-200/90 bg-white"
    aria-hidden
  >
    <div className="flex h-5 items-center justify-between px-1.5">
      <IconBrandFigma className="size-2.5 shrink-0 text-neutral-400" />
      <SidebarIcon className="size-2 shrink-0 text-neutral-400" />
    </div>
    <p className="truncate px-1.5 text-[7px] font-medium leading-tight text-neutral-800">
      Client site v1
    </p>
    <hr className="my-1 border-neutral-200" />
    <p className="px-1.5 text-[6px] font-medium text-neutral-400">Pages</p>
    <div className="mt-0.5 flex flex-col gap-px overflow-hidden px-1.5 pb-1.5">
      {FIGMA_PAGES.map((name) => (
        <div
          key={name}
          className="flex min-w-0 items-center gap-0.5 rounded-sm py-px"
        >
          <FileIcon className="size-2 shrink-0 text-neutral-400" />
          <span className="truncate text-[6px] font-medium text-neutral-500">
            {name}
          </span>
        </div>
      ))}
    </div>
  </aside>
)
/** White artboard on canvas: full height, hero + filler blocks + cursor (mirrors designing-in-Figma feel). */
const FigmaFrameArtboard = () => {
  return (
    <div className="border-neutral-400/45 relative mx-auto flex h-full min-h-0 w-full max-w-[min(100%,13rem)] flex-col overflow-hidden rounded-sm border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <MousePointerIcon className="size-3.5 pointer-events-none absolute left-[40%] top-[26%] z-20 text-neutral-900 drop-shadow-md" />

      <div className="flex h-5 shrink-0 items-center justify-between gap-1 border-b border-neutral-100 px-1.5">
        <div className="flex items-center gap-0.5">
          <div className="size-1.5 rounded-sm bg-neutral-300" />
          <div className="h-1 w-7 rounded-sm bg-neutral-200" />
        </div>
        <div className="flex gap-px">
          <div className="size-1 rounded-sm bg-neutral-200/90" />
          <div className="size-1 rounded-sm bg-neutral-200/90" />
          <div className="size-1 rounded-sm bg-neutral-200/90" />
        </div>
      </div>

      <HeroContentMini className="pt-2 pb-2" />

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-0.5">
        <div className="bg-linear-to-b to-neutral-200/55 min-h-[36px] flex-[1.2] rounded-md from-neutral-100/95 ring-1 ring-inset ring-neutral-200/70">
          <div className="m-1.5 space-y-1">
            <div className="h-0.5 w-4/5 rounded-full bg-white/70" />
            <div className="h-0.5 w-3/5 rounded-full bg-white/50" />
            <div className="mt-1 grid grid-cols-2 gap-1">
              <div className="bg-white/35 h-4 rounded-sm" />
              <div className="h-4 rounded-sm bg-white/25" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[3px]">
          <div className="h-0.5 w-full rounded-full bg-neutral-200" />
          <div className="h-0.5 w-[88%] rounded-full bg-neutral-200/90" />
          <div className="h-0.5 w-[72%] rounded-full bg-neutral-100" />
        </div>
        <div className="mt-auto flex gap-1 pt-0.5">
          <div className="h-2.5 flex-1 rounded-md bg-neutral-800/75" />
          <div className="h-2.5 w-7 shrink-0 rounded-md border border-neutral-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  )
}
/** Figma tab: left file panel + canvas; frame stretches full height. */
const FigmaPageMini = () => {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#E5E5E5]">
      <FigmaSidebarMini />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden p-2">
        <FigmaFrameArtboard />
      </div>
    </div>
  )
}
export const DesigningSkeleton = () => {
  const [activeTab, setActiveTab] = useState('site')
  return (
    <div
      className="mask-b-from-90% h-full w-full overflow-hidden px-8 pt-8"
      aria-hidden="true"
      data-nosnippet
    >
      <div className="relative z-20 flex h-full w-full flex-col overflow-hidden rounded-t-xl bg-neutral-50 shadow-[0_24px_40px_-20px_rgba(38,38,43,0.30),0_10px_24px_0_rgba(38,38,43,0.06),0_1px_1px_0_rgba(38,38,43,0.16),0_0_0_1px_rgba(38,38,43,0.05),0_8px_14px_-10px_rgba(38,38,43,0.40)]">
        <div className="border-black/6 flex h-6 shrink-0 items-center gap-2 overflow-hidden border-b px-3 pb-0 pt-2">
          <MacTrafficLights />
          <div className="flex min-w-0 flex-1 items-end gap-0.5 pl-1">
            <button
              type="button"
              onClick={() => setActiveTab('site')}
              className={`relative z-10 flex min-w-0 max-w-[min(100%,12rem)] items-center gap-1 rounded-t-md border border-b-0 px-2 pt-1 pb-1 text-left  ${
                activeTab === 'site'
                  ? 'border-black/7 z-10 bg-white'
                  : 'border-transparent bg-neutral-200/90 hover:bg-neutral-300/80'
              }`}
              tabIndex={-1}
            >
              <span className="size-2 flex shrink-0 items-center justify-center rounded-[2px] bg-zinc-900 text-[5px] font-bold text-white">
                A
              </span>
              <span className="truncate text-[8px] font-medium leading-none text-neutral-700">
                AMWARE — Websites that ship
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('figma')}
              className={`relative flex min-w-0 max-w-[min(100%,10rem)] items-center gap-1 rounded-t-md border border-b-0 px-2 pt-1 pb-1 text-left ${
                activeTab === 'figma'
                  ? 'border-black/7 z-10 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset]'
                  : 'border-transparent bg-neutral-200 hover:bg-[#d4d6da]'
              }`}
              tabIndex={-1}
            >
              <IconBrandFigma
                className="size-2 shrink-0 text-neutral-600"
                aria-hidden
              />
              <span className="truncate text-[8px] font-medium leading-none text-neutral-600">
                Home — Figma
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'site' ? <SitePageMini /> : <FigmaPageMini />}
      </div>
    </div>
  )
}

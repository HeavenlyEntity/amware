'use client'

import { identity } from '@/content/site/identity'
import { chapters } from '@/content/site/about'
import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import {
  TwitterIcon,
  InstagramIcon,
  GitHubIcon,
  LinkedInIcon,
} from '@/components/SocialIcons'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMounted, useRootTheme } from '@/hooks/use-client-value'
import Dither from '@/components/react-bits/dither'
import PageFlip from '@/components/react-bits/page-flip'
import PixelBlast from '@/components/react-bits/pixel-blast'
import ProfileCard from '@/components/react-bits/profile-card'
import PhotoStrip from '@/components/about/photo-strip'
import {
  ExperienceRecord,
  EducationRecord,
  SkillsRecord,
  PRIOR_EMPLOYERS,
} from '@/components/about/service-records'
import { StackRecord } from '@/components/about/stack-record'
import portraitImage from '@/images/portrait-bg-removed.png'
import crownBlack from '@/images/logos/AMWARE-Crown-Black.svg'
import crownMark from '@/images/logos/amware-crown-mark.webp'

/* About page as "the book": a left-aligned hero with a polaroid fan, then
   the profile card beside a book that turns one chapter per spread, then
   the service record and two ways in, all over a dithered teal field.

   Dark-first. The book is a physical object and stays dark in both themes
   (`amw-panel-dark` pins its tokens); everything around it reads the amw
   tokens, whose dark values are the design's greys, so the light theme
   keeps working. Type: Layer for display, Inter for body, JetBrains Mono
   for system labels. */

const LAYER = { fontFamily: 'Layer, sans-serif' }

const socialLinks = [
  {
    label: 'Follow on X',
    icon: TwitterIcon,
    href: 'https://x.com/AmwareDotDev',
  },
  {
    label: 'Follow on Instagram',
    icon: InstagramIcon,
    href: 'https://www.instagram.com/amware.dev/',
  },
  {
    label: 'Follow on GitHub',
    icon: GitHubIcon,
    href: 'https://github.com/HeavenlyEntity',
  },
  {
    label: 'Follow on LinkedIn',
    icon: LinkedInIcon,
    href: identity.linkedin,
  },
]

/* Scrim over the dither: dark enough behind the hero copy to read, lighter
   further down so the field shows through. Both render; the `dark` class
   picks one, so the server HTML is right before hydration. */
const SCRIM = {
  dark: 'radial-gradient(62% 46% at 24% 14%, rgba(9,9,11,0.88) 0%, rgba(9,9,11,0) 72%), linear-gradient(180deg, rgba(9,9,11,0.3) 0%, rgba(9,9,11,0.5) 100%)',
  light:
    'radial-gradient(62% 46% at 24% 14%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 72%), linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.6) 100%)',
}

const DITHER_COLORS = {
  dark: { wave: '#0f766e', background: '#09090b' },
  light: { wave: '#99f6e4', background: '#ffffff' },
}

const LAST = chapters.length
const titleOf = (chapter) => chapter.title.replace(/\.$/, '')

/* ---- shared bits ---------------------------------------------------------- */

function ChevronPill({ href, children }) {
  return (
    <Link
      href={href}
      className="bg-[var(--amw-accent)] text-zinc-950 hover:text-zinc-950 group box-border inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg"
    >
      <span>{children}</span>
      <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
        <ChevronRight className="relative left-px h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  )
}

function Eyebrow({ children, className = '' }) {
  return (
    <p
      className={`amw-mono text-[var(--amw-mut)] m-0 text-[11px] uppercase tracking-[0.2em] ${className}`}
    >
      {children}
    </p>
  )
}

/* ---- the book's pages ---------------------------------------------------- */

const pageLabel = 'amw-mono text-[10px] tracking-[0.14em] text-[#a1a1aa]'

function RunningHead({ left = '// The story', right }) {
  return (
    <div className={`${pageLabel} flex justify-between uppercase`}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

function PageFoot({ number, side, className = 'mt-auto' }) {
  const site = <span>amware.dev</span>
  const page = <span>{String(number).padStart(2, '0')}</span>
  return (
    <div className={`${pageLabel} flex justify-between ${className}`}>
      {side === 'left' ? (
        <>
          {page}
          {site}
        </>
      ) : (
        <>
          {site}
          {page}
        </>
      )}
    </div>
  )
}

/* The design system's TerminalPrompt, in the book's mono. */
function StoryPrompt({ chapter, status, blink = false }) {
  return (
    <div className="amw-mono text-xs leading-relaxed">
      <p className={`m-0 text-zinc-200 ${blink ? 'amw-cursor' : ''}`}>
        <span className="text-[#5eead4]" aria-hidden="true">
          ${' '}
        </span>
        amware story --chapter {chapter}
      </p>
      {status && (
        <p className="m-0 mt-1 text-[11px] tracking-[0.04em] text-[#a1a1aa]">
          {status}
        </p>
      )}
    </div>
  )
}

const pagePad = 'flex h-full flex-col px-[30px] pb-[22px] pt-7'

/* The WebGL layers mount after hydration (`live`), when the reduced-motion
   and theme hooks hold the client's values rather than the server defaults
   their one-off intros would otherwise read. */
function CoverPage({ paused, reduce, live }) {
  return (
    <div className="relative flex h-full flex-col px-[34px] pb-[26px] pt-8 text-[#09090b] shadow-[inset_0_0_0_1px_rgba(9,9,11,0.06)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {live && (
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#0b756c"
            accentColor="#14bbac"
            patternScale={2.4}
            patternDensity={1.05}
            softness={0.6}
            glow={0.5}
            twinkle={0.25}
            drift={0.2}
            hoverEffect="grow"
            hoverRadius={110}
            enableRipples
            rippleSpeed={0.45}
            rippleIntensityScale={1.4}
            autoRipple={2.4}
            edgeFade={0.3}
            lightMode
            transparent
            intro={!reduce}
            paused={paused || reduce}
          />
        )}
      </div>
      {/* Fades the pixels out under the title so the text sits on white. */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.92) 54%, #ffffff 64%)',
        }}
      />

      <div className="amw-mono relative flex justify-between text-[10px] uppercase tracking-[0.2em] text-[#52525b]">
        <span>Amware</span>
        <span>Vol. 01</span>
      </div>
      <div className="relative mt-auto">
        <Image
          src={crownBlack}
          alt="AMWARE crown"
          className="h-auto w-[72px]"
        />
        <h2
          style={LAYER}
          className="m-0 mt-[18px] text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-[#09090b]"
        >
          A Masterpiece will Always Require Effort
        </h2>
        <div
          aria-hidden="true"
          className="mb-4 mt-5 h-[3px] w-12 rounded-full bg-[#14bbac]"
        />
        <p className="m-0 text-sm leading-relaxed text-[#3f3f46]">
          The story of Alec Mingione. Five chapters, and one still being
          written.
        </p>
      </div>
      <div className="amw-mono relative mt-7 flex justify-between text-[11px] tracking-[0.14em] text-[#0f766e]">
        <span>open the book →</span>
        <span className="text-[#52525b]">phoenix.az</span>
      </div>
    </div>
  )
}

/* Left-hand page: the chapter's number, title and two facts. */
function ChapterOpening({ chapter, number }) {
  return (
    <div className={pagePad}>
      <RunningHead right={`Ch.${chapter.number}`} />
      <p className={`${pageLabel} m-0 mt-9 uppercase tracking-[0.2em]`}>
        Chapter
      </p>
      <p
        aria-hidden="true"
        style={{ ...LAYER, WebkitTextStroke: '1.25px #3ce8ce' }}
        className="m-0 mt-1.5 text-[104px] font-bold leading-[0.9] text-transparent"
      >
        {chapter.number}
      </p>
      <h3
        style={LAYER}
        className="m-0 mt-4 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-zinc-50"
      >
        <span className="sr-only">Chapter {chapter.number}: </span>
        {chapter.title}
      </h3>
      <dl className="m-0 mt-5 border-t border-dashed border-white/[0.18]">
        {chapter.facts.map((fact) => (
          <div
            key={fact.label}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-dashed border-white/[0.18] py-2.5"
          >
            <dt className={`${pageLabel} pt-0.5 uppercase`}>{fact.label}</dt>
            <dd className="m-0 text-[13px] text-zinc-200">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto">
        <StoryPrompt chapter={chapter.number} />
      </div>
      <PageFoot number={number} side="left" className="mt-3.5" />
    </div>
  )
}

/* Right-hand page: the copy, with a drop cap. `::first-letter` keeps the
   word whole for screen readers. */
function ChapterCopy({ chapter, number }) {
  return (
    <div className={pagePad}>
      <RunningHead right={`Ch.${chapter.number}`} />
      <p className="m-0 mt-7 text-[15px] leading-[1.7] text-zinc-300 first-letter:float-left first-letter:mr-2.5 first-letter:mt-1.5 first-letter:text-[56px] first-letter:font-bold first-letter:leading-[0.82] first-letter:text-[#5eead4] first-letter:[font-family:Layer,sans-serif]">
        {chapter.copy}
      </p>
      <PageFoot number={number} side="right" />
    </div>
  )
}

function ChapterInProgress({ chapter, number }) {
  return (
    <div className={pagePad}>
      <RunningHead right={`Ch.${chapter.number}`} />
      <Image
        src={chapter.image}
        alt="Alec at his desk, pointing up at the code on his monitor"
        sizes="360px"
        className="mt-[18px] h-[200px] w-full rounded-[10px] object-cover object-[50%_42%] grayscale-[0.35]"
      />
      <p className={`${pageLabel} m-0 mt-2.5`}>{chapter.caption}</p>
      <p className={`${pageLabel} m-0 mt-[22px] uppercase tracking-[0.2em]`}>
        Chapter {chapter.number}
      </p>
      <h3
        style={LAYER}
        className="m-0 mt-2 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-zinc-50"
      >
        {chapter.title}
      </h3>
      <div className="mt-4">
        <StoryPrompt
          chapter={chapter.number}
          status="in progress · no title yet"
          blink
        />
      </div>
      <PageFoot number={number} side="left" />
    </div>
  )
}

function InsideBackCover({ onCover }) {
  return (
    <div className={pagePad}>
      <RunningHead left="// Next chapter" right="Ch.07" />
      <p className={`${pageLabel} m-0 mt-14 uppercase tracking-[0.2em]`}>
        Unwritten
      </p>
      <h3
        style={LAYER}
        className="m-0 mt-3 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-zinc-50"
      >
        Written with you.
      </h3>
      <p className="m-0 mt-4 text-[15px] leading-[1.7] text-zinc-300">
        If you are building something and need someone who can whiteboard the
        architecture in the morning and present the unit economics in the
        afternoon, this is where we start.
      </p>
      <div className="mt-7 flex flex-col gap-3">
        <ChevronPill href="/services">Work With Me</ChevronPill>
        <Link
          href="/projects"
          className="amw-mono min-h-16 box-border flex w-full items-center justify-center rounded-md px-5 text-[13px] text-zinc-200 no-underline ring-1 ring-inset ring-white/[0.18] transition-colors duration-200 hover:text-[#5eead4] hover:ring-[#3ce8ce]"
        >
          see the work →
        </Link>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onCover}
          className="amw-mono min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[11px] tracking-[0.14em] text-[#5eead4]"
        >
          back to the cover ↺
        </button>
        <span className={pageLabel}>13</span>
      </div>
    </div>
  )
}

/* ---- the story: intro, book, controls ------------------------------------ */

function StoryBook() {
  const reduce = useReducedMotion()
  const live = useMounted()
  const [open, setOpen] = useState(0)
  const isOpen = open > 0

  /* A control that hides itself (a contents row, "back to the cover") hands
     focus to the chapter stop it jumped to, so the keyboard keeps its place. */
  const stopRefs = useRef([])
  const jumpTo = (k) => {
    setOpen(k)
    stopRefs.current[k]?.focus()
  }

  /* Leaf k carries the right page of spread k on its front and the left
     page of spread k+1 on its back. Page numbers run 02-13 from the back of
     the cover. */
  const pages = chapters.map((chapter, k) => {
    const next = chapters[k]
    const front =
      k === 0 ? (
        <CoverPage paused={isOpen} reduce={reduce} live={live} />
      ) : (
        <ChapterCopy chapter={chapters[k - 1]} number={2 * k + 1} />
      )
    const back = next.inProgress ? (
      <ChapterInProgress chapter={next} number={2 * k + 2} />
    ) : (
      <ChapterOpening chapter={next} number={2 * k + 2} />
    )
    return k === 0
      ? {
          id: 'cover',
          front,
          back,
          frontColor: '#ffffff',
          frontShade: 0.35,
        }
      : { id: `ch-${chapters[k - 1].number}`, front, back }
  })

  const stops = [
    { label: 'Cover', aria: 'Cover' },
    ...chapters.map((chapter) => ({
      label: chapter.number,
      aria: `Chapter ${chapter.number}: ${titleOf(chapter)}`,
    })),
  ]
  const announcement =
    open === 0
      ? 'Cover'
      : `Chapter ${open} of ${LAST}: ${titleOf(chapters[open - 1])}`

  return (
    <>
      <div className="amw-book max-md:w-[var(--book-w)] relative w-[calc(var(--book-w)*2)] max-w-full">
        {/* Shown beside the closed cover, gone once it opens. It fades out
            fast, and on the way back waits until the cover has crossed the
            spine before it returns. On a phone it sits above the book. */}
        <div
          className={`max-md:visible max-md:static max-md:h-auto max-md:w-auto max-md:pb-6 max-md:pr-0 max-md:opacity-100 absolute left-0 top-0 flex h-[var(--book-h)] w-[var(--book-w)] flex-col pr-10 pt-1 transition-[opacity,visibility] ${
            isOpen
              ? 'invisible z-0 opacity-0 duration-200'
              : 'visible z-[2] opacity-100 delay-[350ms] duration-300'
          }`}
        >
          <Eyebrow>
            <span aria-hidden="true">{'// '}</span>The story
          </Eyebrow>
          <h2
            style={LAYER}
            className="m-0 mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-zinc-900 dark:text-zinc-50"
          >
            Five chapters. One still being written.
          </h2>
          <p className="m-0 mt-3 max-w-[30ch] text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Open the cover, or jump straight to a chapter.
          </p>
          <ul
            aria-label="Chapters"
            className="m-0 mt-8 flex list-none flex-col gap-1 p-0"
          >
            {chapters.map((chapter, i) => (
              <li key={chapter.number}>
                <button
                  type="button"
                  onClick={() => jumpTo(i + 1)}
                  className="min-h-11 hover:text-zinc-950 group -mx-3 flex w-[calc(100%+24px)] cursor-pointer items-baseline gap-4 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-zinc-800 transition-colors duration-200 hover:bg-zinc-900/5 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                >
                  <span className="amw-mono text-[var(--amw-accent-ink)] w-5 shrink-0 text-[11px] tracking-[0.14em]">
                    {chapter.number}
                  </span>
                  <span className="flex-auto text-[15px] leading-snug">
                    {titleOf(chapter)}
                    {chapter.inProgress && (
                      <span className="amw-mono bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] ml-2 whitespace-nowrap rounded-[0.4rem] px-1.5 py-[3px] text-[10px] uppercase tracking-[0.12em]">
                        in progress
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="amw-mono text-[var(--amw-accent-ink)] -translate-x-1 text-[13px] opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <PageFlip
          role="group"
          aria-roledescription="book"
          aria-label="The story, one chapter per spread"
          className="amw-panel-dark"
          pages={pages}
          endPage={<InsideBackCover onCover={() => jumpTo(0)} />}
          page={open}
          onPageChange={setOpen}
          pageWidth="var(--book-w)"
          pageHeight="var(--book-h)"
          duration={0.7}
          stagger={0.09}
        />
      </div>

      <div className="amw-book max-md:w-[var(--book-w)] mt-[22px] flex w-[calc(var(--book-w)*2)] max-w-full flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Jump to a chapter"
          className="flex flex-wrap items-center gap-0.5"
        >
          {stops.map((stop, k) => {
            const on = k === open
            return (
              <button
                key={stop.label}
                ref={(el) => {
                  stopRefs.current[k] = el
                }}
                type="button"
                onClick={() => setOpen(k)}
                aria-label={stop.aria}
                aria-current={on ? 'true' : undefined}
                className={`amw-mono min-w-11 hover:text-[var(--amw-accent-ink)] flex h-11 cursor-pointer flex-col items-center justify-center gap-[7px] border-0 bg-transparent px-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors duration-300 ${
                  on ? 'text-[var(--amw-accent-ink)]' : 'text-[var(--amw-mut)]'
                }`}
              >
                <span>{stop.label}</span>
                <span
                  aria-hidden="true"
                  className={`block h-[3px] rounded-full transition-[width,background-color] duration-300 ${
                    on
                      ? 'bg-[var(--amw-accent)] w-6'
                      : 'bg-[var(--amw-line-strong)] w-3'
                  }`}
                />
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2.5">
          {[
            {
              label: 'Previous page',
              Icon: ChevronLeft,
              to: open - 1,
              disabled: open === 0,
            },
            {
              label: 'Next page',
              Icon: ChevronRight,
              to: open + 1,
              disabled: open === LAST,
            },
          ].map(({ label, Icon, to, disabled }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (!disabled) setOpen(to)
              }}
              /* aria-disabled, not disabled: a disabled button drops focus
                 the moment the reader reaches the cover or the last page. */
              aria-disabled={disabled}
              aria-label={label}
              className={`bg-[var(--amw-card)] border-[var(--amw-line-strong)] flex h-11 w-11 items-center justify-center rounded-full border text-zinc-800 transition-colors duration-200 dark:text-zinc-200 ${
                disabled
                  ? 'opacity-35 cursor-default'
                  : 'hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] cursor-pointer'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}

/* ---- page ----------------------------------------------------------------- */

export default function AboutContent() {
  const reduce = useReducedMotion()
  const live = useMounted()
  const theme = useRootTheme()
  const colors = DITHER_COLORS[theme]

  return (
    <div className="amw relative overflow-x-clip">
      {/* The field. Sticky inside an absolute layer rather than fixed, so it
          holds the viewport while the About page is on screen but never
          paints over the footer, and its loop sleeps once scrolled past. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="h-svh sticky top-0 w-full bg-white dark:bg-[#09090b]">
          {live && (
            <Dither
              className="absolute inset-0"
              waveColor={colors.wave}
              backgroundColor={colors.background}
              ditherMode="bayer"
              colorNum={4}
              pixelSize={3}
              waveSpeed={0.04}
              waveFrequency={3}
              waveAmplitude={0.3}
              mouseEffect="erase"
              mouseRadius={0.3}
              trail={0.5}
              clickRipple
              intro={!reduce}
              disableAnimation={reduce}
              enableMouseInteraction={!reduce}
            />
          )}
          <div
            className="absolute inset-0 dark:hidden"
            style={{ background: SCRIM.light }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{ background: SCRIM.dark }}
          />
        </div>
      </div>

      {/* Hero: copy on the container's left edge, the photo fan beside it. */}
      <header
        className="amw-rise max-[1055px]:flex-col max-[1055px]:items-start max-[1055px]:gap-8 relative z-[1] mx-auto flex max-w-6xl items-center justify-between gap-12 px-6 pt-16 md:pt-24"
        style={{ animationDelay: '0.35s' }}
      >
        <div className="min-w-0 flex-[0_1_30rem]">
          <Eyebrow className="mb-4">
            <span aria-hidden="true">{'// SEC.00 / '}</span>THE OPERATOR
          </Eyebrow>
          <h1
            style={LAYER}
            className="m-0 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-[60px]"
          >
            Engineer. Architect. CTO.
          </h1>
          <p className="m-0 mt-4 max-w-[36rem] text-lg leading-[1.6] text-zinc-600 dark:text-zinc-400">
            I am Alec Mingione, in Phoenix, Arizona. I build the systems, and
            the businesses on top of them.
          </p>
          {/* The proof, in the first viewport, read from the record below so
              the two can never disagree. */}
          <p className="amw-kicker m-0 mt-5">
            Previously {PRIOR_EMPLOYERS.join(' · ')}
          </p>
        </div>
        <PhotoStrip className="shrink-0" />
      </header>

      {/* Story: the profile card beside the book. */}
      <section className="relative z-[1] mx-auto max-w-6xl px-6 pb-32 pt-16">
        <div className="max-[1151px]:gap-12 max-[1055px]:flex-col max-[1055px]:items-center flex items-start justify-center gap-16">
          <aside
            className="amw-rise flex w-[272px] max-w-full shrink-0 flex-col gap-6 sm:w-80"
            style={{ animationDelay: '0.55s' }}
          >
            <div className="relative flex justify-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[6%] left-[8%] right-[8%] top-[14%] rounded-[48px] blur-[40px]"
                style={{
                  background:
                    'radial-gradient(60% 55% at 50% 60%, rgba(20,187,172,0.55), rgba(20,187,172,0) 72%)',
                }}
              />
              <ProfileCard
                theme="auto"
                avatarUrl={portraitImage.src}
                avatarAlt="Portrait of Alec Mingione"
                iconUrl={crownMark.src}
                backdropColor="#0b756c"
                name="Alec Mingione"
                title="Founder & Engineer"
                handle="AmwareDotDev"
                status="Phoenix, Arizona"
                statusColor="#3ce8ce"
                contactText="Email"
                contactHref={'mailto:' + identity.email}
                footer={
                  <>
                    <div
                      aria-hidden="true"
                      className="mx-5 h-px bg-zinc-900/[0.08] dark:bg-white/[0.08]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5">
                      <p className="amw-kicker m-0">Elsewhere</p>
                      <div className="flex gap-1.5">
                        {socialLinks.map(({ label, icon: Icon, href }) => (
                          <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={label}
                            className="hover:bg-[var(--amw-accent)] hover:text-zinc-950 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/10 text-zinc-800 transition-colors duration-300 dark:bg-white/10 dark:text-zinc-200"
                          >
                            <Icon className="h-4 w-4 fill-current" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="pt-0.5">
                      <ChevronPill href="/services">Work With Me</ChevronPill>
                    </div>
                  </>
                }
              />
            </div>
          </aside>

          <div
            className="amw-rise flex min-w-0 flex-[1_1_0] flex-col items-center"
            style={{ animationDelay: '0.75s' }}
          >
            <StoryBook />
          </div>
        </div>
      </section>

      {/* Service record */}
      <section className="relative z-[1] mx-auto max-w-6xl px-6 pb-24">
        <Eyebrow>
          <span aria-hidden="true">{'// SEC.01 / '}</span>Service record
        </Eyebrow>
        <h2
          style={LAYER}
          className="m-0 mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-zinc-900 dark:text-zinc-50 md:text-4xl"
        >
          The Record Behind the Playbook
        </h2>
        <div className="min-[901px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] mt-12 grid grid-cols-1 items-start gap-12">
          <ExperienceRecord />
          <div className="flex flex-col gap-10">
            <EducationRecord />
            <SkillsRecord />
            <StackRecord />
          </div>
        </div>
      </section>

      {/* Ways in */}
      <section className="relative z-[1] mx-auto max-w-6xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              href: '/projects',
              title: 'See the work',
              copy: 'Products, platforms, and client builds, shipped and in production.',
            },
            {
              href: '/contact',
              title: 'Work With Me',
              copy: 'A question, a proposal, or just a hello. I answer every message myself.',
              featured: true,
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group flex items-center justify-between gap-6 rounded-2xl p-6 no-underline transition-[transform,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.2,0.7,0.2,1)] hover:scale-[1.01] motion-reduce:hover:scale-100 md:p-7 ${
                card.featured
                  ? 'bg-[linear-gradient(160deg,#0b756c_0%,#064e48_100%)] text-white hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.3)]'
                  : 'bg-[var(--amw-muted)] text-zinc-900 shadow-[inset_0_0_0_1px_var(--amw-line)] hover:text-zinc-900 hover:shadow-[inset_0_0_0_1px_rgba(20,187,172,0.6)] dark:text-zinc-100 dark:hover:text-zinc-100 dark:hover:shadow-[inset_0_0_0_1px_rgba(60,232,206,0.5)]'
              }`}
            >
              <span className="flex flex-col gap-1.5">
                <span className="text-lg font-medium tracking-[-0.01em]">
                  {card.title}
                </span>
                <span
                  className={`text-sm leading-relaxed ${
                    card.featured
                      ? 'text-white/[0.88]'
                      : 'text-[var(--amw-mut)]'
                  }`}
                >
                  {card.copy}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`text-zinc-950 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
                  card.featured ? 'bg-white' : 'bg-[var(--amw-accent)]'
                }`}
              >
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  strokeWidth={2}
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

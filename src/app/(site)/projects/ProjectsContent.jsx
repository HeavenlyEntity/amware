'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Lock,
} from 'lucide-react'

import {
  projects as projectContent,
  projectAnchor,
} from '@/content/site/projects'
import BorderGlow from '@/components/BorderGlow'
import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import logoCosmos from '@/images/logos/cosmos.svg'
import logoPortalGen from '@/images/logos/PortalGen Fav-1.png'
import logoOpenShuttle from '@/images/logos/open-shuttle.svg'
import logoPlanetaria from '@/images/logos/planetaria.svg'
import logoFuriousFroth from '@/images/logos/FF.svg'
import logoChamoji from '@/images/logos/chamoji_logo-ico.png'
import logoWindstone from '@/images/logos/Windstone icon-1.png'
import logoMipi from '@/images/logos/mipi-lander-int-icon.svg'
import authjsLogo from '@/images/logos/authjs.png'
import logoConventionSuite from '@/images/logos/ConventionSuite.png'
import KingdomKodeMark from '@/components/brand/kingdom-kode-mark'
import logoCelestial from '@/images/logos/dark-celestial-square.svg'
import logoGearz from '@/images/logos/gearz-icon.svg'
import mockupMipi from '@/images/photos/MiPi-mockup.webp'
import coverWindstone from '@/images/projects/windstone-cover.png'
import coverAuthjs from '@/images/projects/authjs-cover.png'
import coverNeatsuite from '@/images/projects/neatsuite-cover.png'
import coverPortalGen from '@/images/projects/portalgen-cover.png'
import coverConventionSuite from '@/images/projects/conventionsuite-cover-v4.png'
import coverKingdomKode from '@/images/projects/kingdomkode-cover.png'
import coverFuriousFroth from '@/images/projects/furiousfroth-cover.png'
import coverChamoji from '@/images/projects/chamoji-cover.png'
import coverVrsa from '@/images/projects/vrsa-cover.png'
import coverVbRemoteSat from '@/images/projects/vbremotesat-cover.png'
import coverCelestial from '@/images/projects/celestial-cover.png'
import coverGearz from '@/images/projects/gearz-mockup.webp'

/* Projects page in the "minimal" landing template's grammar: a centred
   header, the three newest builds as the template's numbered split
   feature cards beside a sticky intro, then the full archive as a
   filterable grid of muted cards, closing on link cards. The dataset and
   covers are unchanged; the old grid/list toggle, table view, WebGL
   status orbs, and border-glow wrappers are retired. */

const easeOut = [0.16, 1, 0.3, 1]

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease: easeOut },
}

function getFullYear(dateStr) {
  const [, , year] = dateStr.split('/')
  const y = parseInt(year, 10)
  return y < 100 ? 2000 + y : y
}

const projectMedia = {
  Gearz: { logo: logoGearz, cover: coverGearz },
  'Celestial Studio Salon': { logo: logoCelestial, cover: coverCelestial },
  'Kingdom Kode': { cover: coverKingdomKode, mark: KingdomKodeMark },
  'ConventionSuite - GSC\u2122': {
    logo: logoConventionSuite,
    cover: coverConventionSuite,
  },
  'M i P i': { logo: logoMipi, cover: mockupMipi },
  'PortalGen\u2122': { logo: logoPortalGen, cover: coverPortalGen },
  '@neatsuite/http': { logo: logoCosmos, cover: coverNeatsuite },
  'Auth.js - NetSuite Provider': { logo: authjsLogo, cover: coverAuthjs },
  Chamoji: { logo: logoChamoji, cover: coverChamoji },
  Windstone: { logo: logoWindstone, cover: coverWindstone },
  'Furious Froth Coffee\u00ae': {
    logo: logoFuriousFroth,
    cover: coverFuriousFroth,
  },
  VRSA: { logo: logoPlanetaria, cover: coverVrsa },
  'VB Remote Sat': { logo: logoOpenShuttle, cover: coverVbRemoteSat },
}
const projects = projectContent.map((project) => ({
  ...project,
  ...projectMedia[project.name],
}))

const FEATURED_COUNT = 3

const STATUS = {
  live: { label: 'Live', dot: 'bg-[var(--amw-accent)]' },
  development: {
    label: 'In development',
    dot: 'bg-[var(--amw-accent)]/40 ring-1 ring-[var(--amw-accent)]',
  },
  archived: { label: 'Archived', dot: 'bg-zinc-400 dark:bg-zinc-500' },
}

/* Cursor-tracked mesh border + edge glow (React Bits "BorderGlow"), keyed
   by status like the previous project grid: teal/cyan for live, sky for
   in-development, zinc for archived. The card surface stays the template's
   muted panel; the glow only appears near the edge the pointer is on. */
const GLOW = {
  live: { colors: ['#34d399', '#06b6d4', '#22d3ee'], glowColor: '160 80 65' },
  development: {
    colors: ['#38bdf8', '#0ea5e9', '#0284c7'],
    glowColor: '200 80 75',
  },
  archived: {
    colors: ['#a1a1aa', '#71717a', '#d4d4d8'],
    glowColor: '240 10 65',
  },
}

const GLOW_PROPS = {
  backgroundColor: 'var(--amw-muted)',
  borderRadius: 16,
  glowRadius: 30,
  glowIntensity: 0.6,
  edgeSensitivity: 25,
  coneSpread: 20,
  fillOpacity: 0.3,
  shadow: 'none',
}

function glowFor(status) {
  return GLOW[status] || GLOW.archived
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'development', label: 'In development' },
  { id: 'archived', label: 'Archived' },
]

function isValidLink(href) {
  return (
    typeof href === 'string' &&
    href !== '#' &&
    (href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('/'))
  )
}

function ProjectMark({ project, className }) {
  if (project.mark) {
    const Mark = project.mark
    return <Mark className={`${className} text-zinc-900`} />
  }
  return (
    <Image
      src={project.logo}
      alt=""
      className={`${className} object-contain`}
      unoptimized
    />
  )
}

function StatusBadge({ status }) {
  const config = STATUS[status] ?? STATUS.archived
  return (
    <span className="amw-kicker inline-flex items-center gap-2 normal-case tracking-[0.04em]">
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}

/* ---- featured: the template's split feature card --------------------- */

function FeaturedCard({ project, index }) {
  const valid = isValidLink(project.link?.href)
  const glow = glowFor(project.status)
  return (
    <motion.article
      className="group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: easeOut }}
    >
      <BorderGlow
        {...GLOW_PROPS}
        colors={glow.colors}
        glowColor={glow.glowColor}
        className="h-full"
      >
        <div className="p-2">
          {/* Every cover is 16:9, so a 16:9 frame shows the whole screenshot at
          the card's full width with no cropping. */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src={project.cover}
              alt={project.name}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span className="ring-[var(--amw-line)] absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white p-2 ring-1">
              <ProjectMark project={project} className="h-full w-full" />
            </span>
          </div>

          <div className="px-4 pb-4 pt-6 md:px-6 md:pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="amw-mono text-[var(--amw-accent-ink)] bg-[var(--amw-accent-soft)] block w-fit rounded-md px-2 py-1 text-sm font-medium">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <StatusBadge status={project.status} />
              </div>
              <span className="amw-mono text-xs text-zinc-500 dark:text-zinc-400">
                {getFullYear(project.date)}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
              {project.name}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-base">
              {project.description.split('\n')[0]}
            </p>
            {project.whatHappened && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                <span className="amw-kicker mr-2">Outcome</span>
                {project.whatHappened}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="amw-chip">
                    {tag}
                  </span>
                ))}
              </div>
              {valid ? (
                <a
                  href={project.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--amw-accent-ink)] inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 no-underline transition-colors dark:text-zinc-100"
                >
                  {project.link.label}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Internal build
                </span>
              )}
            </div>
          </div>
        </div>
      </BorderGlow>
    </motion.article>
  )
}

/* ---- archive: muted grid card ----------------------------------------- */

function ArchiveCard({ project }) {
  const valid = isValidLink(project.link?.href)
  const glow = glowFor(project.status)
  const Wrapper = valid ? 'a' : 'div'
  const wrapperProps = valid
    ? { href: project.link.href, target: '_blank', rel: 'noreferrer' }
    : {}

  return (
    <motion.article
      id={projectAnchor(project.name)}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="h-full"
    >
      <BorderGlow
        {...GLOW_PROPS}
        colors={glow.colors}
        glowColor={glow.glowColor}
        className="h-full"
      >
        <Wrapper
          {...wrapperProps}
          className="group flex h-full flex-col p-2 no-underline"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src={project.cover}
              alt={project.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span className="ring-[var(--amw-line)] absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5 ring-1">
              <ProjectMark project={project} className="h-full w-full" />
            </span>
          </div>
          <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                {project.name}
              </h3>
              <span className="amw-mono shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {getFullYear(project.date)}
              </span>
            </div>
            <p className="line-clamp-2 mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {project.description.split('\n')[0]}
            </p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
              <StatusBadge status={project.status} />
              {valid ? (
                <span className="text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium">
                  {project.link.label}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Internal
                </span>
              )}
            </div>
          </div>
        </Wrapper>
      </BorderGlow>
    </motion.article>
  )
}

/* ---- archive: list row -------------------------------------------------- */

function ArchiveRow({ project }) {
  const valid = isValidLink(project.link?.href)
  const Wrapper = valid ? 'a' : 'div'
  const wrapperProps = valid
    ? { href: project.link.href, target: '_blank', rel: 'noreferrer' }
    : {}

  return (
    <motion.li
      id={projectAnchor(project.name)}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="border-[var(--amw-line)] border-b last:border-b-0"
    >
      <Wrapper
        {...wrapperProps}
        className="hover:bg-[var(--amw-card)] group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 no-underline transition-colors md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1.4fr)_5rem_9rem_auto] md:px-6"
      >
        <span className="ring-[var(--amw-line)] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-2 ring-1">
          <ProjectMark project={project} className="h-full w-full" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {project.name}
          </p>
          <p className="amw-mono mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {valid ? project.link.label : 'internal'}
          </p>
          <div className="mt-1.5 md:hidden">
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="hidden flex-wrap items-center gap-1.5 md:flex">
          {project.tags.map((tag) => (
            <span key={tag} className="amw-chip">
              {tag}
            </span>
          ))}
        </div>
        <span className="amw-mono hidden text-xs text-zinc-500 dark:text-zinc-400 md:inline">
          {getFullYear(project.date)}
        </span>
        <span className="hidden md:inline-flex">
          <StatusBadge status={project.status} />
        </span>
        <span className="text-[var(--amw-accent-ink)] inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-full">
          {valid ? (
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          ) : (
            <Lock
              className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400"
              aria-hidden="true"
            />
          )}
        </span>
      </Wrapper>
    </motion.li>
  )
}

export default function ProjectsContent() {
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('grid')
  const featured = projects.slice(0, FEATURED_COUNT)
  const archive = useMemo(
    () =>
      filter === 'all' ? projects : projects.filter((p) => p.status === filter),
    [filter]
  )
  const counts = useMemo(
    () =>
      FILTERS.reduce((acc, f) => {
        acc[f.id] =
          f.id === 'all'
            ? projects.length
            : projects.filter((p) => p.status === f.id).length
        return acc
      }, {}),
    []
  )

  return (
    /* BorderGlow paints a decorative glow 5px outside each card. In a
       single-column phone layout that lands past the viewport and turns into
       real horizontal scroll. Clipping here is lossless: the section's own
       24px gutter is far wider than the glow, so it still renders in full.
       `clip` rather than `hidden` so nothing becomes a scroll container. */
    <div className="amw overflow-x-clip">
      {/* Header */}
      <section className="px-6 pt-16 md:pt-24">
        <motion.div className="mx-auto max-w-6xl text-center" {...fadeInUp}>
          <SectionEyebrow index="00" label="FIELD EVIDENCE" />
          <h1
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl lg:text-6xl"
          >
            Shipped, Not Staged
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            {projects.length} builds across products, platforms, open source,
            and internal tools. Every one of them met real users.
          </p>
        </motion.div>
      </section>

      {/* Featured: sticky intro beside the newest builds */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          <motion.div
            className="lg:sticky lg:top-28 lg:w-80 lg:shrink-0"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <SectionEyebrow index="01" label="ON THE BENCH" />
            <h2
              style={{ fontFamily: 'Layer, sans-serif' }}
              className="mb-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:mb-6 md:text-3xl lg:text-4xl"
            >
              What I am building now
            </h2>
            <p className="mb-6 max-w-sm text-base text-zinc-600 dark:text-zinc-400 md:mb-8 md:text-lg">
              The three newest builds. Founder products first, then the client
              and studio work that keeps the playbook sharp.
            </p>
            <Link
              href="/services"
              className="group inline-flex w-full items-center justify-center gap-3 rounded-md bg-zinc-900 py-3 pl-5 pr-3 font-medium text-white no-underline transition-all duration-500 ease-out hover:rounded-[50px] dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
            >
              <span>Build With Me</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-900 transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-100">
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </motion.div>

          <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-10">
            {featured.map((project, index) => (
              <FeaturedCard
                key={project.name}
                project={project}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Archive */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-8 flex flex-col items-start justify-between gap-6 md:mb-12 md:flex-row md:items-end"
            {...fadeInUp}
          >
            <div>
              <SectionEyebrow index="02" label="THE ARCHIVE" />
              <h2
                style={{ fontFamily: 'Layer, sans-serif' }}
                className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
              >
                Every Build on Record
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="amw-kicker" id="projects-status-label">
                  Status
                </span>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger
                    aria-labelledby="projects-status-label"
                    className="min-w-[11.5rem]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {FILTERS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          {f.label}
                          <span className="amw-mono text-xs text-zinc-500 dark:text-zinc-400">
                            {counts[f.id]}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="border-[var(--amw-line)] bg-[var(--amw-muted)] inline-flex rounded-lg border p-1"
                role="group"
                aria-label="View"
              >
                {[
                  ['grid', LayoutGrid, 'Grid view'],
                  ['list', ListIcon, 'List view'],
                ].map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-pressed={view === id}
                    aria-label={label}
                    title={label}
                    className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors ${
                      view === id
                        ? 'bg-[var(--amw-card)] text-zinc-900 shadow-sm dark:text-zinc-50'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {view === 'grid' ? (
            <motion.div
              layout
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {archive.map((project) => (
                  <ArchiveCard key={project.name} project={project} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="bg-[var(--amw-muted)] overflow-hidden rounded-2xl">
              <div className="amw-kicker border-[var(--amw-line)] hidden grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1.4fr)_5rem_9rem_auto] items-center gap-4 border-b px-6 py-3 md:grid">
                <span className="w-10" aria-hidden="true" />
                <span>Project</span>
                <span>Tech</span>
                <span>Year</span>
                <span>Status</span>
                <span className="w-9" aria-hidden="true" />
              </div>
              <motion.ul layout>
                <AnimatePresence mode="popLayout">
                  {archive.map((project) => (
                    <ArchiveRow key={project.name} project={project} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            </div>
          )}
        </div>
      </section>

      {/* Ways in */}
      <section className="px-6 pb-8 md:pb-16">
        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2"
          {...fadeInUp}
        >
          {[
            {
              href: '/products',
              title: 'Start from these foundations',
              copy: 'The boilerplates ship the same stack these builds run on.',
              label: 'Browse boilerplates',
            },
            {
              href: '/contact',
              title: 'Have a build in mind?',
              copy: 'Tell me what you are shipping and where you are stuck.',
              label: 'Get in touch',
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="border-[var(--amw-line)] bg-[var(--amw-card)] hover:border-[var(--amw-accent)] group flex items-center justify-between gap-6 rounded-2xl border p-6 no-underline transition-colors duration-300"
            >
              <div>
                <h3 className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {card.copy}
                </p>
                <p className="text-[var(--amw-accent-ink)] mt-3 text-sm font-medium">
                  {card.label}
                </p>
              </div>
              <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </motion.div>
      </section>
    </div>
  )
}

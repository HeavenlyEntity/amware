'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Container } from '@/components/Container'
import { identity } from '@/content/site/identity'
import { GitHubIcon, LinkedInIcon } from '@/components/SocialIcons'
import StaggeredText from '@/components/react-bits/staggered-text'
import AmwareCreed from '@/components/brand/amware-creed'
import KingdomKodeMark from '@/components/brand/kingdom-kode-mark'
import { ProductCard } from '@/components/commerce/storefront'
import imageKingdomKode from '@/images/photos/kingdom-kode-port.webp'
import imageMipi from '@/images/photos/MiPi-example.webp'
import imageFuriousFroth from '@/images/photos/furious-froth-site.webp'
import imageBooking from '@/images/photos/booking-calendar.webp'
import imageGsc from '@/images/photos/gsc-portal.webp'
import imageGearz from '@/images/projects/gearz-mockup.webp'
import logoRlcanning from '@/images/logos/rlcanning-logo.png'
import logoDotCom from '@/images/logos/Dot_Com_Development.png'
import logoMipi from '@/images/logos/mipi.svg'
import logoSchwab from '@/images/logos/charles-schwab.png'
import logoNewgen from '@/images/logos/newgen.png'
import { ArrowDown, ArrowUpRight, Briefcase, Mail, PenLine } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'
import { useMediaQuery } from '@/hooks/use-client-value'

const ContourField = dynamic(
  () => import('@/components/shaders/contour-field'),
  { ssr: false }
)

const AmwareCrown3d = dynamic(
  () => import('@/components/brand/amware-crown-3d'),
  { ssr: false }
)

/* ---- shared section header ------------------------------------------------ */

function SectionHeader({ index, eyebrow, meta, title, copy }) {
  return (
    <div>
      <div className="border-[var(--amw-line)] flex items-baseline justify-between gap-4 border-b border-dashed pb-4">
        <p className="amw-eyebrow">
          <span aria-hidden="true">{`// SEC.${index} / `}</span>
          {eyebrow}
        </p>
        {meta && <span className="amw-kicker hidden sm:block">{meta}</span>}
      </div>
      <h2
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="mt-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl"
      >
        {title}
      </h2>
      {copy && (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy}
        </p>
      )}
    </div>
  )
}

/* ---- hero — terminal cover sheet ------------------------------------------ */

function SocialLink({ icon: Icon, ...props }) {
  return (
    <Link className="group -m-1 p-1" {...props}>
      <Icon className="h-6 w-6 fill-zinc-400 transition group-hover:fill-zinc-300" />
    </Link>
  )
}

function Hero() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', true)

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Background accent: an oversized topographic ring echo on the page
          surface behind the panel's crown side. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 600 600"
        fill="none"
        className="text-[var(--amw-accent)] dark:opacity-15 absolute -right-24 -top-28 -z-10 hidden h-[560px] w-[560px] opacity-25 lg:block"
      >
        <circle
          cx="300"
          cy="300"
          r="120"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.9"
        />
        <circle
          cx="300"
          cy="300"
          r="165"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.7"
        />
        <circle
          cx="300"
          cy="300"
          r="205"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
        />
        <circle
          cx="300"
          cy="300"
          r="250"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <circle
          cx="300"
          cy="300"
          r="292"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.25"
        />
      </svg>
      <div className="amw-panel-dark amw-ticks border-[var(--amw-line)] relative overflow-hidden rounded-3xl border bg-[#0b0b0f]">
        {/* Topographic contour field. Renders a single static frame under
          reduced motion so the panel keeps its terrain either way. */}
        <div className="amw-hero-field absolute inset-0" aria-hidden="true">
          <ContourField
            scale={1.8}
            bands={7}
            indexEvery={3}
            lineWidth={0.8}
            warp={0.45}
            speed={0.5}
            fill={1}
            color="#3ce8ce"
            backgroundColor="#0b0b0f"
            cursorInteraction={!reducedMotion}
            cursorIntensity={1}
            listenToWindow
            animate={!reducedMotion}
          />
        </div>
        {/* Keeps the copy column readable where the contours are densest. */}
        <div className="amw-hero-scrim absolute inset-0" aria-hidden="true" />

        {/* The hero is a real two-column grid at lg: copy owns the first
          column, the 3D crown owns the second, so neither can run under
          the other. Chips span both columns to anchor the composition. */}
        <div className="relative z-10 grid grid-cols-1 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div>
            <div aria-hidden="true">
              <p className="amw-mono text-xs text-zinc-400">
                <span className="text-[var(--amw-accent-ink)]">$</span> amware
                boot --profile alec.mingione
              </p>
              <p className="amw-mono amw-cursor mt-2 text-xs text-zinc-400">
                link established · engineer / designer / founder · phoenix.az
              </p>
            </div>

            <StaggeredText
              as="h1"
              text={
                'From factory floors to the founder’s desk.\nEverything I learned, packaged to ship.'
              }
              segmentBy="words"
              delay={60}
              duration={0.7}
              direction="bottom"
              className="mt-10 max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 [font-family:Layer,sans-serif] sm:text-[3.25rem] sm:leading-[1.08]"
            />

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
              Hi! I&apos;m Alec: software engineer, fractional CTO, mentor, and
              two-time founder in Phoenix, Arizona. Let&apos;s build something
              great together.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="amw-mono bg-[var(--amw-accent)] text-zinc-950 inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
              >
                browse boilerplates →
              </Link>
              <Link
                href="/services"
                className="amw-mono border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-200 no-underline transition"
              >
                work with me ↗
              </Link>
              <div className="ml-1 flex items-center gap-5">
                <SocialLink
                  href="https://github.com/HeavenlyEntity"
                  aria-label="Follow on GitHub"
                  icon={GitHubIcon}
                />
                <SocialLink
                  href={identity.linkedin}
                  aria-label="Follow on LinkedIn"
                  icon={LinkedInIcon}
                />
              </div>
            </div>
          </div>

          {/* Spacer: reserves the crown's column so copy never runs under
              the escaped object. */}
          <div className="hidden lg:block" aria-hidden="true" />

          <div className="border-[var(--amw-line)] mt-12 flex flex-wrap gap-2 border-t border-dashed pt-6 lg:col-span-2">
            <span className="amw-chip amw-chip--accent">
              Shipping since 2017
            </span>
            <span className="amw-chip">Fractional CTO</span>
            <span className="amw-chip">2 companies founded</span>
            <span className="amw-chip">Mentor &amp; teacher</span>
          </div>
        </div>
      </div>

      {/* The crown breaks the frame: wrapper-level, overlapping the panel's
          top-right edge into the page. Pointer events stay on for the hover
          hologram; the contour field listens on window and is unaffected. */}
      <AmwareCrown3d className="absolute -top-14 right-2 z-20 hidden h-[400px] w-[360px] lg:block xl:-top-16 xl:right-8 xl:h-[470px] xl:w-[420px]" />

      {/* Corner scoop: sits outside the bordered panel so it paints over
          the hairline; the outline terminates into the cut like a true
          notch. amw-panel-dark rides along only for the accent tokens. */}
      <div className="amw-scoop amw-panel-dark [--amw-scoop-bg:#ffffff] dark:[--amw-scoop-bg:#18181b]">
        <Link
          href="/projects"
          className="amw-mono bg-[var(--amw-accent)] group/scoop text-zinc-950 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-5 text-xs font-semibold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
        >
          all projects
          <ArrowUpRight
            className="group-hover/scoop:rotate-45 motion-reduce:group-hover/scoop:rotate-0 h-4 w-4 transition-transform duration-300 motion-reduce:transition-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* Fold indicator, cut into the bottom-left corner: a real control
          that scrolls the visitor to the next section. */}
      <div className="amw-scoop amw-scoop--bl [--amw-scoop-bg:#ffffff] dark:[--amw-scoop-bg:#18181b]">
        <button
          type="button"
          aria-label="Scroll to the story below"
          onClick={() =>
            document.getElementById('amware-creed')?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'auto'
                : 'smooth',
            })
          }
          className="group/fold border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-zinc-700 transition dark:bg-zinc-900 dark:text-zinc-200"
        >
          <ArrowDown
            className="group-hover/fold:translate-y-0.5 motion-reduce:group-hover/fold:translate-y-0 h-4 w-4 transition-transform duration-300 motion-reduce:transition-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  )
}

/* ---- offerings — the catalog ----------------------------------------------- */

function HomeServiceCard({ service, index = 0 }) {
  return (
    <li className="amw-reveal" style={{ '--i': index }}>
      <Link
        href="/services"
        className="amw-card amw-ticks group h-full p-6 no-underline"
      >
        <div className="flex items-center justify-between">
          <span className="amw-kicker">/{service.slug}</span>
          <span className="amw-chip amw-chip--accent amw-chip--dot">
            Service
          </span>
        </div>
        <h4 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {service.name}
        </h4>
        {service.summary && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {service.summary}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-6">
          {typeof service.startingPrice === 'number' ? (
            <span className="amw-price text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="amw-kicker mr-1.5">from</span>$
              {service.startingPrice.toFixed(2)}
            </span>
          ) : (
            <span className="amw-kicker">scoped per project</span>
          )}
          <span className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-2">
            details ↗
          </span>
        </div>
      </Link>
    </li>
  )
}

function RowHeader({ kicker, title, href, linkLabel, icon: Icon }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className={Icon ? 'flex items-center gap-3' : undefined}>
        {Icon && (
          <span
            className="border-[var(--amw-line)] text-[var(--amw-accent-ink)] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        <div>
          <p className="amw-kicker">{kicker}</p>
          <h3
            className={`${
              Icon ? 'mt-1' : 'mt-2'
            } text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50`}
          >
            {title}
          </h3>
        </div>
      </div>
      <Link
        href={href}
        className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium no-underline transition-all hover:gap-2"
      >
        {linkLabel} ↗
      </Link>
    </div>
  )
}

function CatalogFallback({ error }) {
  return (
    <div className="border-[var(--amw-line-strong)] relative mt-10 overflow-hidden rounded-2xl border border-dashed">
      <div
        className="amw-grid-bg absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative px-6 py-16 text-center">
        <p className="amw-mono text-[var(--amw-mut)] text-sm">
          <span className="text-[var(--amw-accent-ink)]">$</span> amware catalog
          --list
        </p>
        <p className="amw-mono amw-cursor mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {error ? 'link interrupted, retrying' : '0 published, provisioning'}
        </p>
        <p className="mx-auto mt-5 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          {error
            ? 'The catalog could not be reached. Refresh to try again, or head straight to the listings.'
            : 'The catalog is being prepared. Check back soon, or head straight to the listings.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {error && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="amw-mono border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 transition dark:text-zinc-200"
            >
              retry connection
            </button>
          )}
          <Link
            href="/products"
            className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium no-underline transition-all hover:gap-2"
          >
            products ↗
          </Link>
          <Link
            href="/services"
            className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium no-underline transition-all hover:gap-2"
          >
            services ↗
          </Link>
        </div>
      </div>
    </div>
  )
}

function CatalogSection({ products, services, catalogError }) {
  const isEmpty = products.length === 0 && services.length === 0

  return (
    <Container className="mt-24 sm:mt-32">
      <div className="amw">
        <SectionHeader
          index="01"
          eyebrow="THE CATALOG"
          meta={
            catalogError
              ? undefined
              : `${services.length + products.length} items live`
          }
          title="One playbook. Two ways in."
          copy="Bring me onto your team and I build it with you, or skip the wait and start from the same foundations I use myself. Either way, you’re shipping on systems that already survived production."
        />

        {isEmpty ? (
          <CatalogFallback error={catalogError} />
        ) : (
          <>
            {services.length > 0 && (
              <div className="mt-12">
                <RowHeader
                  kicker="MODE A / I BUILD IT WITH YOU"
                  title="Engagements"
                  href="/services"
                  linkLabel="all services"
                />
                <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service, i) => (
                    <HomeServiceCard
                      key={service.id}
                      service={service}
                      index={i}
                    />
                  ))}
                </ul>
              </div>
            )}

            {products.length > 0 && (
              <div className="mt-14">
                <RowHeader
                  kicker="MODE B / YOU BUILD ON MINE"
                  title="Boilerplates & tooling"
                  href="/products"
                  linkLabel="full catalog"
                />
                <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i + services.length}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}

/* ---- proof masonry ----------------------------------------------------------- */

/* Card grammar ported from the React Bits Pro portfolio template
   (github.com/DavidHDev/rbp-portfolio): masonry columns, label header,
   image with slow zoom on hover, title, description, meta. */

const FIELD_PROJECTS = [
  {
    id: 'gearz',
    title: 'Gearz',
    description:
      'The home base for car culture: meets, clubs, garages, and event ticketing.',
    meta: 'founder, in development',
    image: imageGearz,
    ratio: '4 / 3',
  },
  {
    id: 'kingdom-kode',
    title: 'Kingdom Kode',
    description:
      'AI products for business, and teaching people to build their own.',
    meta: 'co-founder & ceo, 2025',
    image: imageKingdomKode,
    ratio: '16 / 10',
  },
  {
    id: 'mipi',
    title: 'MiPi',
    description: 'The studio where this playbook was first productized.',
    meta: 'founder & ceo, 2022',
    image: imageMipi,
    ratio: '4 / 3',
  },
  {
    id: 'furious-froth',
    title: 'Furious Froth',
    description: 'Brand site for a craft beverage company.',
    meta: 'client build',
    image: imageFuriousFroth,
    ratio: '16 / 10',
  },
  {
    id: 'booking',
    title: 'Booking Calendar',
    description: 'Scheduling flow built for real front-desk traffic.',
    meta: 'client build',
    image: imageBooking,
    ratio: '4 / 3',
  },
  {
    id: 'gsc-portal',
    title: 'GSC Portal',
    description: 'An operations portal shipped to daily users.',
    meta: 'client build',
    image: imageGsc,
    ratio: '16 / 10',
  },
]

function FieldProjectCard({ project, index }) {
  return (
    <div
      className="amw-reveal mb-5 break-inside-avoid"
      style={{ '--i': index }}
    >
      <article className="amw-card group flex flex-col gap-4 p-3.5">
        <header className="flex items-center justify-between px-1 pt-1">
          <span className="amw-kicker">/{project.id}</span>
          <span className="amw-kicker">{project.meta}</span>
        </header>
        <div
          className="border-[var(--amw-line)] relative w-full overflow-hidden rounded-xl border bg-zinc-100 dark:bg-zinc-800"
          style={{ aspectRatio: project.ratio }}
        >
          <div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <Image
              src={project.image}
              alt={project.title}
              fill
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-1 pb-2">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {project.title}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {project.description}
          </p>
        </div>
      </article>
    </div>
  )
}

function ProofSection() {
  return (
    <Container className="mt-24 sm:mt-32">
      <div className="amw">
        <SectionHeader
          index="02"
          eyebrow="FIELD EVIDENCE"
          meta="selected work"
          title="Shipped, not staged."
        />
        <div className="mt-12 columns-1 gap-5 md:columns-2">
          {FIELD_PROJECTS.map((project, i) => (
            <FieldProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            href="/projects"
            className="amw-mono border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 no-underline transition dark:text-zinc-200"
          >
            all projects ↗
          </Link>
        </div>
      </div>
    </Container>
  )
}

/* ---- closing call ------------------------------------------------------------ */

/* Framed shader-card pattern ported from the RBP portfolio template's
   ContactCard: thin outer frame, shader behind a radial fade mask, copy
   left, social panel right. Uses our own ContourField as a static frame
   so the page renders only one animated canvas. */

const CTA_FADE_MASK =
  'radial-gradient(ellipse 90% 110% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.4) 90%, rgba(0,0,0,0.15) 100%)'

function ClosingCta() {
  return (
    <Container className="mb-24 mt-24 sm:mt-32">
      <div className="amw">
        <div className="border-[var(--amw-line)] rounded-3xl border p-1.5">
          <div className="amw-panel-dark relative overflow-hidden rounded-[1.25rem] bg-[#0b0b0f]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                WebkitMaskImage: CTA_FADE_MASK,
                maskImage: CTA_FADE_MASK,
              }}
            >
              <ContourField
                scale={2.2}
                bands={6}
                indexEvery={3}
                lineWidth={0.7}
                warp={0.4}
                fill={1}
                color="#3ce8ce"
                backgroundColor="#0b0b0f"
                cursorInteraction={false}
                animate={false}
              />
            </div>

            <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-stretch">
              <div className="flex flex-col justify-center gap-4">
                <h2
                  style={{ fontFamily: 'Layer, sans-serif' }}
                  className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl"
                >
                  Ready when you are.
                </h2>
                <p className="max-w-md text-base leading-relaxed text-zinc-400">
                  Bring the effort. The foundations are already built.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href="/products"
                    className="amw-mono bg-[var(--amw-accent)] text-zinc-950 inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
                  >
                    browse boilerplates →
                  </Link>
                  <Link
                    href="/services"
                    className="amw-mono border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-200 no-underline transition"
                  >
                    work with me ↗
                  </Link>
                </div>
              </div>

              <div className="border-[var(--amw-line)] flex flex-col items-center justify-center gap-5 rounded-xl border bg-[#0b0b0f]/70 p-6 sm:p-8">
                <div className="flex items-center gap-5">
                  <SocialLink
                    href="https://github.com/HeavenlyEntity"
                    aria-label="Follow on GitHub"
                    icon={GitHubIcon}
                  />
                  <SocialLink
                    href={identity.linkedin}
                    aria-label="Follow on LinkedIn"
                    icon={LinkedInIcon}
                  />
                </div>
                <Link
                  href="/contact"
                  className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium no-underline transition-all hover:gap-2"
                >
                  contact ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

/* ---- service record — resume / articles / newsletter ------------------------ */

function ArticleRow({ article, index }) {
  return (
    <li className="amw-reveal" style={{ '--i': index }}>
      <Link
        href={`/articles/${article.slug}`}
        className="border-[var(--amw-line)] group block border-b border-dashed py-5 no-underline"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h4 className="group-hover:text-[var(--amw-accent-ink)] text-base font-semibold tracking-tight text-zinc-900 transition dark:text-zinc-100">
            {article.title}
          </h4>
          <time
            dateTime={article.date}
            className="amw-kicker whitespace-nowrap"
          >
            {formatDate(article.date)}
          </time>
        </div>
        <p className="line-clamp-2 mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {article.description}
        </p>
      </Link>
    </li>
  )
}

function Newsletter() {
  return (
    <form
      action="/thank-you"
      className="border-[var(--amw-line)] rounded-2xl border p-6"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="border-[var(--amw-line)] text-[var(--amw-accent-ink)] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          aria-hidden="true"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <h4 className="amw-kicker">NEWSLETTER</h4>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Get notified when I publish something new. Unsubscribe any time.
      </p>
      <div className="mt-5 flex gap-3">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
          required
          className="amw-mono border-[var(--amw-line-strong)] focus:border-[var(--amw-accent)] focus:ring-[var(--amw-accent)]/20 min-w-0 flex-auto appearance-none rounded-lg border bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          className="amw-mono bg-[var(--amw-accent)] text-zinc-950 flex-none rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:brightness-110"
        >
          join
        </button>
      </div>
    </form>
  )
}

function Resume() {
  let resume = [
    {
      company: 'Kingdom Kode',
      title: 'Co-Founder & CEO',
      mark: KingdomKodeMark,
      start: '2025',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear(),
      },
    },
    {
      company: 'MiPi',
      title: 'Founder & CEO',
      logo: logoMipi,
      start: '2022',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear(),
      },
    },
    {
      company: 'NewGen Business Solutions',
      title: 'Senior Lead Software Engineer',
      logo: logoNewgen,
      start: '2021',
      end: '2025',
    },
    {
      company: 'Charles Schwab',
      title: 'Software Engineer',
      logo: logoSchwab,
      start: '2019',
      end: '2021',
    },
    {
      company: 'Dot Com Development',
      title: 'Junior Software Engineer',
      logo: logoDotCom,
      start: '2018',
      end: '2019',
    },
    {
      company: 'RL Canning (Honeywell)',
      title: 'Automation Programmer & Desktop Specialist',
      logo: logoRlcanning,
      start: '2017',
      end: '2020',
    },
  ]

  return (
    <div>
      <ol>
        {resume.map((role, i) => (
          <li
            key={role.company}
            className="amw-reveal border-[var(--amw-line)] flex gap-4 border-b border-dashed py-4 first:pt-0"
            style={{ '--i': i }}
          >
            <div className="relative mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5">
              {role.mark ? (
                <role.mark className="h-7 w-7 text-zinc-900" />
              ) : (
                <Image src={role.logo} alt="" className="h-7 w-7" unoptimized />
              )}
            </div>
            <dl className="flex flex-auto flex-wrap gap-x-2">
              <dt className="sr-only">Company</dt>
              <dd className="w-full flex-none text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {role.company}
              </dd>
              <dt className="sr-only">Role</dt>
              <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                {role.title}
              </dd>
              <dt className="sr-only">Date</dt>
              <dd
                className="amw-mono ml-auto text-xs text-zinc-600 dark:text-zinc-400"
                aria-label={`${role.start.label ?? role.start} until ${
                  role.end.label ?? role.end
                }`}
              >
                <time dateTime={role.start.dateTime ?? role.start}>
                  {role.start.label ?? role.start}
                </time>{' '}
                <span aria-hidden="true">-</span>{' '}
                <time dateTime={role.end.dateTime ?? role.end}>
                  {role.end.label ?? role.end}
                </time>
              </dd>
            </dl>
          </li>
        ))}
      </ol>
      <a
        href="https://1drv.ms/w/s!AtN3Vou-qYxDq4Qmgz2PYo_NRLkFtA?e=N5oWuH"
        className="amw-mono border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 no-underline transition dark:text-zinc-200"
      >
        download cv ↓
      </a>
    </div>
  )
}

/* ---- page ------------------------------------------------------------------- */

export default function HomeContent({
  articles,
  products = [],
  services = [],
  catalogError = false,
}) {
  return (
    <>
      <Container className="mt-10 sm:mt-16">
        <div className="amw">
          <Hero />
        </div>
      </Container>

      <Container className="mt-20 sm:mt-24">
        <div id="amware-creed" className="amw scroll-mt-24">
          <AmwareCreed />
        </div>
      </Container>

      <CatalogSection
        products={products}
        services={services}
        catalogError={catalogError}
      />

      <ProofSection />

      <Container className="mt-24 sm:mt-32">
        <div className="amw">
          <SectionHeader
            index="03"
            eyebrow="SERVICE RECORD"
            meta="career + writing"
            title="The record behind the catalog."
          />
          <div className="mt-12 grid grid-cols-1 gap-x-16 gap-y-16 lg:grid-cols-2">
            <div className="space-y-10">
              <div>
                <RowHeader
                  icon={Briefcase}
                  kicker="WORK HISTORY"
                  title="Where I've shipped"
                  href="/about"
                  linkLabel="full story"
                />
                <div className="border-[var(--amw-line)] mt-4 rounded-2xl border p-6">
                  <Resume />
                </div>
              </div>
              <Newsletter />
            </div>
            <div>
              <RowHeader
                icon={PenLine}
                kicker="LATEST WRITING"
                title="Articles"
                href="/articles"
                linkLabel="all articles"
              />
              <ul className="mt-4">
                {articles.map((article, i) => (
                  <ArticleRow key={article.slug} article={article} index={i} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>

      <ClosingCta />
    </>
  )
}

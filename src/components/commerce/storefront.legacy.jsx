import Link from 'next/link'
import { RichText } from '@/components/site/RichText'
import { BuyButton } from '@/components/commerce/BuyButton'

/* ---- helpers ------------------------------------------------------------- */

export function typeMeta(type) {
  switch (type) {
    case 'boilerplate':
      return { label: 'Boilerplate', accent: true }
    case 'service-package':
      return { label: 'Service', accent: false }
    case 'digital':
    default:
      return { label: 'Digital', accent: false }
  }
}

export function priceText(price, currency = 'USD') {
  if (typeof price !== 'number') return null
  return `$${price.toFixed(2)} ${currency}`
}

function heroUrl(img) {
  return img && typeof img === 'object' ? img.url : null
}

/* ---- hero ---------------------------------------------------------------- */

export function StoreHero({ eyebrow, title, intro, meta }) {
  return (
    <div className="amw-ticks border-[var(--amw-line)] bg-[var(--amw-card)] relative overflow-hidden rounded-2xl border">
      <div
        className="amw-grid-bg amw-grid-fade absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative px-6 py-12 sm:px-12 sm:py-16">
        <p className="amw-eyebrow">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[3.25rem] sm:leading-[1.05]">
          {title}
        </h1>
        {intro && (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {intro}
          </p>
        )}
        {meta && <div className="mt-8 flex flex-wrap gap-2">{meta}</div>}
      </div>
    </div>
  )
}

/* ---- empty state (terminal boot) ---------------------------------------- */

export function StoreEmpty({ label = 'catalog' }) {
  return (
    <div className="border-[var(--amw-line-strong)] relative mt-10 overflow-hidden rounded-2xl border border-dashed">
      <div
        className="amw-grid-bg absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative px-6 py-16 text-center">
        <p className="amw-mono text-[var(--amw-mut)] text-sm">
          <span className="text-[var(--amw-accent-ink)]">$</span> amware {label}{' '}
          --list
        </p>
        <p className="amw-mono amw-cursor mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          0 published — provisioning
        </p>
        <p className="mx-auto mt-5 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          This {label} is being prepared. Publish items in the admin to bring
          this page to life.
        </p>
      </div>
    </div>
  )
}

/* ---- product card -------------------------------------------------------- */

export function ProductCard({ product, index = 0 }) {
  const hero = heroUrl(product.heroImage)
  const t = typeMeta(product.type)
  const stack = Array.isArray(product.techStack)
    ? product.techStack.slice(0, 4)
    : []
  const price = priceText(product.price, product.currency)
  return (
    <li className="amw-reveal" style={{ '--i': index }}>
      <Link
        href={`/products/${product.slug}`}
        className="amw-card amw-ticks group h-full p-5 no-underline"
      >
        <div className="flex items-center justify-between">
          <span className="amw-kicker">/{product.slug}</span>
          <span
            className={`amw-chip ${
              t.accent ? 'amw-chip--accent amw-chip--dot' : ''
            }`}
          >
            {t.label}
          </span>
        </div>

        {hero && (
          <div className="border-[var(--amw-line)] bg-[var(--amw-card-2)] mt-5 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero}
              alt=""
              className="mx-auto max-h-44 w-full object-contain p-2"
            />
          </div>
        )}

        <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {product.name}
        </h3>
        {product.tagline && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {product.tagline}
          </p>
        )}

        {stack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stack.map((s, i) => (
              <span key={i} className="amw-chip">
                {s.tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-6">
          <span className="amw-price text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {price ?? 'Pricing soon'}
          </span>
          <span className="amw-mono text-[var(--amw-accent-ink)] inline-flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-2">
            {product.creemProductId ? 'view spec' : 'details'} ↗
          </span>
        </div>
      </Link>
    </li>
  )
}

/* ---- course card --------------------------------------------------------- */

export function CourseCard({ course, index = 0 }) {
  const price = priceText(course.price, 'USD')
  return (
    <li className="amw-reveal" style={{ '--i': index }}>
      <Link
        href={`/courses/${course.slug}`}
        className="amw-card amw-ticks group block h-full p-6 no-underline"
      >
        <div className="flex items-center justify-between">
          <span className="amw-kicker">/{course.slug}</span>
          {course.level && <span className="amw-chip">{course.level}</span>}
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {course.title}
        </h2>
        {course.summary && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {course.summary}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between">
          <span className="amw-price text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {price ?? 'Free'}
          </span>
          <span className="amw-mono text-[var(--amw-accent-ink)] text-xs font-medium transition-transform group-hover:translate-x-0.5">
            open ↗
          </span>
        </div>
      </Link>
    </li>
  )
}

/* ---- service card -------------------------------------------------------- */

export function ServiceCard({ service, index = 0 }) {
  return (
    <li className="amw-reveal" style={{ '--i': index }}>
      <div className="amw-card amw-ticks flex h-full flex-col p-6">
        <div className="flex items-center justify-between">
          <span className="amw-kicker">/{service.slug}</span>
          <span className="amw-chip amw-chip--accent amw-chip--dot">
            Service
          </span>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {service.name}
        </h2>
        {service.summary && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {service.summary}
          </p>
        )}
        {service.description && (
          <div className="mt-4 text-sm">
            <RichText data={service.description} />
          </div>
        )}
        <div className="mt-auto pt-6">
          {typeof service.startingPrice === 'number' && (
            <p className="amw-price text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="amw-kicker mr-1.5">from</span>$
              {service.startingPrice.toFixed(2)} USD
            </p>
          )}
          {service.creemProductId ? (
            <BuyButton
              itemType="service"
              slug={service.slug}
              label={
                typeof service.startingPrice === 'number'
                  ? `Purchase — $${service.startingPrice.toFixed(2)}`
                  : 'Purchase'
              }
            />
          ) : (
            <Link
              href="/contact"
              className="amw-mono text-[var(--amw-accent-ink)] mt-4 inline-flex items-center gap-1 text-xs font-medium transition-all hover:gap-2"
            >
              request a quote ↗
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

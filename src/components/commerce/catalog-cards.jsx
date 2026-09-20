'use client'

import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import Link from 'next/link'
import { BuyButton } from '@/components/commerce/BuyButton'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import { DepositCheckout } from '@/components/commerce/DepositCheckout'
import { DepositRiskReversal } from '@/components/commerce/DepositRiskReversal'
import { calLinkFromUrl } from '@/lib/commerce/calLink'
import { depositPlanId } from '@/lib/commerce/whopEnv'
import { usd } from '@/lib/commerce/money'
import { typeMeta } from '@/components/commerce/catalog-meta'

/* Catalog cards in the "minimal" template's grammar (components/features.tsx,
   pricing.tsx, how-it-works.tsx): soft rounded-2xl surfaces without borders,
   a numbered mono tag, medium-weight titles, muted body copy, and the
   chevron pill for the one action. Each card is one link, stretched over
   the whole surface from its title, so the hover lift and the click agree.

   Product: the template's split feature card, copy left and cover right.
   Course: the step card, cover on top and the title pinned to the bottom.
   Service: the plan card, big "from" price and a check-list style body. */

const easeOut = [0.16, 1, 0.3, 1]

function useReveal(index) {
  const reduce = useReducedMotion()
  return {
    initial: reduce ? false : { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: {
      duration: 0.6,
      delay: Math.min(index, 4) * 0.1,
      ease: easeOut,
    },
    reduce,
  }
}

function mediaUrl(img) {
  return img && typeof img === 'object' ? img.url : null
}

function number(index) {
  return String(index + 1).padStart(2, '0')
}

/* The stretched link: the title is the card's only link and its ::after
   covers the card, so the whole surface is one target named by the title. */
const stretched =
  'no-underline after:absolute after:inset-0 after:z-10 after:content-[""] focus-visible:outline-none'

function Pill({ children }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center gap-3 rounded-md bg-zinc-900 py-2.5 pl-4 pr-2.5 text-sm font-medium text-white transition-all duration-500 ease-out group-hover:rounded-[50px] dark:bg-zinc-100 dark:text-zinc-900"
    >
      <span>{children}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-100">
        <ChevronRight className="relative left-px h-4 w-4" />
      </span>
    </span>
  )
}

function Price({ value, label, prefix, fallback = 'pricing soon' }) {
  if (typeof value !== 'number') {
    return <span className="amw-kicker">{fallback}</span>
  }
  return (
    <span className="flex items-baseline gap-1.5">
      {prefix && <span className="amw-kicker">{prefix}</span>}
      <span className="amw-price text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
        {usd(value)}
      </span>
      {label && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
      )}
    </span>
  )
}

/* ---- product: split feature card ---------------------------------------- */

export function ProductCard({ product, index = 0 }) {
  const { reduce, ...reveal } = useReveal(index)
  const hero = mediaUrl(product.heroImage)
  const t = typeMeta(product.type)
  const stack = Array.isArray(product.techStack)
    ? product.techStack.slice(0, 5)
    : []
  const href = `/products/${product.slug}`
  return (
    <motion.li
      className="bg-[var(--amw-muted)] focus-within:ring-[var(--amw-accent)] group relative grid grid-cols-1 gap-2 overflow-hidden rounded-2xl p-2 focus-within:ring-2 md:grid-cols-2"
      whileHover={reduce ? undefined : { scale: 1.01 }}
      {...reveal}
    >
      <div className="flex flex-col px-4 py-8 md:px-6 md:py-12">
        <div className="mb-5 flex items-center gap-3">
          <span className="amw-mono text-[var(--amw-accent-ink)] bg-[var(--amw-accent-soft)] rounded-md px-2 py-1 text-sm font-medium">
            {number(index)}
          </span>
          <span className="amw-kicker">{t.label}</span>
        </div>
        <h3 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
          <Link href={href} className={stretched}>
            {product.name}
          </Link>
        </h3>
        {product.tagline && (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {product.tagline}
          </p>
        )}
        {stack.length > 0 && (
          <ul
            className="mt-5 flex flex-wrap gap-1.5 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            aria-label="Stack"
          >
            {stack.map((s, i) => (
              <li key={i} className="amw-chip">
                {s.tech}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <Price
            value={product.price}
            label={
              product.priceLabel || `${product.currency ?? 'USD'} · one time`
            }
          />
          <Pill>{product.creemProductId ? 'View spec' : 'Details'}</Pill>
        </div>
      </div>

      <div className="bg-[var(--amw-card)] aspect-4/3 md:min-h-64 relative w-full self-stretch overflow-hidden rounded-xl md:aspect-auto">
        {hero ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hero}
            alt=""
            className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div
            className="amw-grid-bg amw-grid-fade absolute inset-0"
            aria-hidden="true"
          />
        )}
      </div>
    </motion.li>
  )
}

/* ---- course: step card --------------------------------------------------- */

export function CourseCard({ course, index = 0 }) {
  const { reduce, ...reveal } = useReveal(index)
  const cover = mediaUrl(course.coverImage)
  const href = `/courses/${course.slug}`
  return (
    <motion.li
      className="bg-[var(--amw-muted)] min-h-70 focus-within:ring-[var(--amw-accent)] group relative flex flex-col rounded-2xl p-6 focus-within:ring-2 md:p-8"
      whileHover={reduce ? undefined : { y: -4 }}
      {...reveal}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="amw-mono text-[var(--amw-accent-ink)] bg-[var(--amw-accent-soft)] rounded-md px-2 py-1 text-sm font-medium">
          {number(index)}
        </span>
        {course.level && <span className="amw-kicker">{course.level}</span>}
      </div>
      {cover && (
        <div className="bg-[var(--amw-card)] relative mb-6 aspect-video w-full overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        </div>
      )}
      <h2 className="mb-3 mt-auto text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">
        <Link href={href} className={stretched}>
          {course.title}
        </Link>
      </h2>
      {course.summary && (
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {course.summary}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Price value={course.price} label="USD" fallback="free" />
        <Pill>Open</Pill>
      </div>
    </motion.li>
  )
}

/* ---- service: plan card -------------------------------------------------- */

/**
 * @param {object} props
 * @param {any} props.service
 * @param {number} [props.index]
 * @param {import('react').ReactNode} [props.description] rendered rich text;
 *   without the annotation TS infers the `null` default as the whole type and
 *   rejects every real caller.
 */
/* The one call-to-action treatment, shared by the three things a service
   card can ask for so they cannot drift apart. */
const CTA_CLASS =
  'group inline-flex items-center gap-3 rounded-md bg-zinc-900 py-3 pl-5 pr-3 font-medium text-white no-underline transition-all duration-500 ease-out hover:rounded-[50px] dark:bg-zinc-100 dark:text-zinc-900'

function CtaLabel({ children }) {
  return (
    <>
      <span>{children}</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-900 transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-100">
        <ChevronRight className="relative left-px h-4 w-4" aria-hidden="true" />
      </span>
    </>
  )
}

/**
 * @param {{ service: any, index?: number, description?: import('react').ReactNode }} props
 */
export function ServiceCard({ service, index = 0, description = null }) {
  const { reduce, ...reveal } = useReveal(index)
  const icon = mediaUrl(service.icon)
  const hasPrice = typeof service.startingPrice === 'number'
  const booking = calLinkFromUrl(service.bookingUrl)
  const depositPlan = depositPlanId(service)
  const deposit =
    typeof service.depositAmount === 'number' ? service.depositAmount : 1500
  return (
    <motion.li
      id={service.slug}
      className="bg-[var(--amw-card)] border-[var(--amw-line)] hover:border-[var(--amw-accent)] flex flex-col rounded-2xl border p-6 transition-[border-color,box-shadow] duration-300 hover:shadow-lg md:p-8"
      whileHover={reduce ? undefined : { y: -4 }}
      {...reveal}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {service.name}
          </h2>
          {service.summary && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {service.summary}
            </p>
          )}
        </div>
        {icon ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={icon}
            alt=""
            className="h-12 w-12 shrink-0 object-contain"
          />
        ) : (
          <span className="amw-mono text-[var(--amw-accent-ink)] bg-[var(--amw-accent-soft)] shrink-0 rounded-md px-2 py-1 text-sm font-medium">
            {number(index)}
          </span>
        )}
      </div>

      {/* A retainer is a monthly number, so the period has to sit with it --
          "$3,000" and "$3,000 per month" are very different offers, and
          toFixed(2) was rendering the first as "$3000.00" with no separator
          either. Cents only appear when there are any. */}
      <div className="mb-8">
        {hasPrice ? (
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="amw-kicker">from</span>
            <span className="amw-price text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">
              {usd(service.startingPrice)}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {service.priceLabel || 'USD'}
            </span>
          </div>
        ) : (
          <span className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
            Scoped per engagement
          </span>
        )}
        {service.commitment && (
          <p className="amw-kicker mt-2">{service.commitment}</p>
        )}
      </div>

      {description && (
        <div className="amw-service-body text-sm text-zinc-700 dark:text-zinc-300">
          {description}
        </div>
      )}

      <div className="mt-auto pt-8">
        {service.creemProductId ? (
          <BuyButton
            itemType="service"
            slug={service.slug}
            price={hasPrice ? service.startingPrice : undefined}
            name={service.name}
            label={'Purchase'}
          />
        ) : depositPlan ? (
          /* One ask, not two. The deposit reserves the start, and its
             received state opens the same Cal.com popup the intro-call
             button used to -- so the call now lives inside the reservation
             instead of beside it. */
          <DepositRiskReversal>
            <DepositCheckout
              planId={depositPlan}
              serviceName={service.name}
              amount={deposit}
              bookingUrl={service.bookingUrl || null}
              className={CTA_CLASS}
            >
              <CtaLabel>Reserve your start · {usd(deposit)}</CtaLabel>
            </DepositCheckout>
          </DepositRiskReversal>
        ) : booking ? (
          /* No plan to charge against yet, so the conversation is still the
             way in. A Cal.com link opens the booking here, in a popup, which
             is the only way the booking itself can be observed. */
          <BookCallButton
            calLink={booking.link}
            namespace={booking.namespace}
            serviceName={service.name}
            className={CTA_CLASS}
          >
            <CtaLabel>Book an intro call</CtaLabel>
          </BookCallButton>
        ) : (
          /* Any other booking link opens where it points; no link at all
             falls back to the contact form. */
          <Link
            href={service.bookingUrl || '/contact'}
            {...(service.bookingUrl
              ? { target: '_blank', rel: 'noreferrer' }
              : {})}
            className={CTA_CLASS}
          >
            <CtaLabel>
              {service.bookingUrl ? 'Book an intro call' : 'Request a quote'}
            </CtaLabel>
          </Link>
        )}
        {!depositPlan && service.depositNote && (
          <p className="mt-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {service.depositNote}
          </p>
        )}
      </div>
    </motion.li>
  )
}

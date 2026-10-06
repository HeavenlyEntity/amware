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
import { depositPlanId, planId } from '@/lib/commerce/whopEnv'
import { usd } from '@/lib/commerce/money'
import { cn } from '@/lib/utils'
import { typeMeta } from '@/components/commerce/catalog-meta'
import { Pattern } from '@/components/ui/pattern'

/* Catalog cards in the "minimal" template's grammar (components/features.tsx,
   pricing.tsx, how-it-works.tsx): soft rounded-2xl surfaces without borders,
   a numbered mono tag, medium-weight titles, muted body copy, and the
   chevron pill for the one action. Each card is one link, stretched over
   the whole surface from its title, so the hover lift and the click agree.

   Product: the template's split feature card, copy left and cover right.
   Course: the step card, cover on top and the title pinned to the bottom.
   Service: the studio template's pricing card (components/pricing.tsx),
   "Starts at" over a big price, a check-list body and a full-width button;
   the CMS's Popular flag turns it into the template's featured card. An
   unpriced service runs as the template's wide "Custom work" strip. */

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

/* ---- service: pricing card and strip ------------------------------------ */

/* The one call-to-action treatment, shared by everything a service can ask
   for so the asks cannot drift apart. On a card the button runs the card's
   full width, as the studio template's pricing buttons do; on a popular
   card it turns white so it holds on the teal. */
const CTA_BASE =
  'group inline-flex items-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px]'

const CTA_TONE = {
  default: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  popular: 'bg-white text-zinc-950',
}

const CHEVRON_TONE = {
  default: 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100',
  popular: 'bg-zinc-950 text-white',
}

function CtaLabel({ children, tone }) {
  return (
    <>
      <span>{children}</span>
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110',
          CHEVRON_TONE[tone]
        )}
      >
        <ChevronRight className="relative left-px h-4 w-4" aria-hidden="true" />
      </span>
    </>
  )
}

/* What a service asks for, most committed first: a purchase, a paid
   strategy call, a reserved start, an intro call, or a quote. The deposit
   asks keep their value and refund terms wrapped around the button. The
   purchase button keeps its own styling and ignores `tone`: no service is
   sold that way today, so a popular one would need it taught first. */
function ServiceAction({ service, tone = 'default', fullWidth = false }) {
  const hasPrice = typeof service.startingPrice === 'number'
  const booking = calLinkFromUrl(service.bookingUrl)
  const depositPlan = depositPlanId(service)
  const deposit =
    typeof service.depositAmount === 'number' ? service.depositAmount : 1500
  const className = cn(
    CTA_BASE,
    CTA_TONE[tone],
    fullWidth && 'w-full justify-between'
  )
  return (
    <>
      {service.creemProductId ? (
        <BuyButton
          planId={planId(service)}
          itemType="service"
          slug={service.slug}
          price={hasPrice ? service.startingPrice : undefined}
          name={service.name}
          label={'Purchase'}
        />
      ) : booking && (depositPlan || service.depositAmount > 0) ? (
        <DepositRiskReversal tone={tone}>
          <BookCallButton
            calLink={booking.link}
            namespace={`${booking.namespace}-${service.slug}`}
            serviceName={service.name}
            notes={`Engagement: ${service.name}`}
            className={className}
          >
            <CtaLabel tone={tone}>
              Book your strategy call · {usd(deposit)}
            </CtaLabel>
          </BookCallButton>
        </DepositRiskReversal>
      ) : depositPlan ? (
        <DepositRiskReversal tone={tone}>
          <DepositCheckout
            planId={depositPlan}
            serviceName={service.name}
            amount={deposit}
            bookingUrl={service.bookingUrl || null}
            className={className}
          >
            <CtaLabel tone={tone}>Reserve your start · {usd(deposit)}</CtaLabel>
          </DepositCheckout>
        </DepositRiskReversal>
      ) : booking ? (
        <BookCallButton
          calLink={booking.link}
          namespace={`${booking.namespace}-${service.slug}`}
          serviceName={service.name}
          notes={`Engagement: ${service.name}`}
          className={className}
        >
          <CtaLabel tone={tone}>Book an intro call</CtaLabel>
        </BookCallButton>
      ) : (
        /* Any other booking link opens where it points; no link at all
           falls back to the contact form. */
        <Link
          href={service.bookingUrl || '/contact'}
          {...(service.bookingUrl
            ? { target: '_blank', rel: 'noreferrer' }
            : {})}
          className={className}
        >
          <CtaLabel tone={tone}>
            {service.bookingUrl ? 'Book an intro call' : 'Request a quote'}
          </CtaLabel>
        </Link>
      )}
      {!depositPlan && service.depositNote && (
        <p
          className={cn(
            'mt-4 text-xs leading-relaxed',
            tone === 'popular'
              ? 'text-white/90'
              : 'text-zinc-600 dark:text-zinc-400'
          )}
        >
          {service.depositNote}
        </p>
      )}
    </>
  )
}

/* Text colours per tone. A popular card's ground is the deep-teal gradient
   in storefront.css (.amw-on-teal), which also turns the amw tokens and the
   rich text's prose colours white; these cover the card's own text. White
   and 90% white both clear 4.5:1 on the lightest end of the gradient. */
const CARD_TONE = {
  default: {
    card: 'bg-[var(--amw-card)]',
    title: 'text-zinc-900 dark:text-zinc-100',
    soft: 'text-zinc-600 dark:text-zinc-400',
    strong: 'text-zinc-900 dark:text-zinc-100',
    body: 'text-zinc-700 dark:text-zinc-300',
  },
  popular: {
    card: 'amw-on-teal',
    title: 'text-white',
    soft: 'text-white/90',
    strong: 'text-white',
    body: 'text-white/90',
  },
}

/* The priced services' frame. It fades in as one piece because its own
   background is what draws the 1px seams: cards fading in one by one would
   show that background as a grey slab until each arrived. It starts as soon
   as any of it is on screen: stacked on a phone the grid is several screens
   tall, so the cards' "30% visible" rule would never be met and the whole
   grid would stay invisible. */
export function ServiceGrid({ className, children }) {
  const { reduce: _reduce, ...reveal } = useReveal(0)
  return (
    <motion.ul
      className={className}
      {...reveal}
      viewport={{ once: true, amount: 'some' }}
    >
      {children}
    </motion.ul>
  )
}

/**
 * @param {object} props
 * @param {any} props.service
 * @param {import('react').ReactNode} [props.description] rendered rich text;
 *   without the annotation TS infers the `null` default as the whole type and
 *   rejects every real caller.
 */
export function ServiceCard({ service, description = null }) {
  const tone = service.popular ? 'popular' : 'default'
  const t = CARD_TONE[tone]
  const icon = mediaUrl(service.icon)
  const hasPrice = typeof service.startingPrice === 'number'
  return (
    <li
      id={service.slug}
      className={cn('relative flex flex-col overflow-hidden', t.card)}
    >
      {tone === 'popular' && (
        <Pattern className="pointer-events-none absolute inset-0 opacity-30" />
      )}
      <div className="relative flex flex-1 flex-col px-6 py-8 md:px-8 md:py-10">
        <div className="flex items-start justify-between gap-3">
          <h2 className={cn('text-xl font-medium', t.title)}>{service.name}</h2>
          {tone === 'popular' ? (
            /* Darker than the template's white/15 glass: white on a lighter
               pill would fall under 4.5:1 at this size. */
            <span className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/25">
              Most popular
            </span>
          ) : icon ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={icon}
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />
          ) : null}
        </div>
        {service.summary && (
          <p className={cn('mt-2 max-w-sm text-sm leading-relaxed', t.soft)}>
            {service.summary}
          </p>
        )}

        {/* A retainer is a monthly number, so the period has to sit with it --
            "$3,000" and "$3,000 per month" are very different offers, and
            toFixed(2) was rendering the first as "$3000.00" with no separator
            either. Cents only appear when there are any. */}
        <div className="mt-6">
          {hasPrice ? (
            <>
              <span className={cn('block text-sm', t.soft)}>Starts at</span>
              <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                <span
                  className={cn(
                    'amw-price text-4xl font-medium tracking-tight md:text-5xl',
                    t.strong
                  )}
                >
                  {usd(service.startingPrice)}
                </span>
                <span className={cn('text-sm', t.soft)}>
                  {service.priceLabel || 'USD'}
                </span>
              </div>
            </>
          ) : (
            <span
              className={cn('text-2xl font-medium tracking-tight', t.strong)}
            >
              Scoped per engagement
            </span>
          )}
          {service.commitment && (
            <p className="amw-kicker mt-2">{service.commitment}</p>
          )}
        </div>

        {description && (
          <div className={cn('amw-service-body mt-8 text-sm', t.body)}>
            {description}
          </div>
        )}

        <div className="mt-auto pt-8">
          <ServiceAction service={service} tone={tone} fullWidth />
        </div>
      </div>
    </li>
  )
}

/* An unpriced service -- a "Custom work" ask -- as the studio template's
   wide strip under the pricing cards: the pitch on the left, the button on
   the right from tablet width up. The Popular flag is for pricing cards and
   does not restyle a strip. */
/**
 * @param {object} props
 * @param {any} props.service
 * @param {import('react').ReactNode} [props.description] rendered rich text,
 *   annotated for the same reason as ServiceCard's.
 */
export function ServiceStrip({ service, description = null }) {
  const { reduce: _reduce, ...reveal } = useReveal(0)
  return (
    <motion.li
      id={service.slug}
      className="bg-[var(--amw-muted)] border-[var(--amw-line)] flex flex-col gap-5 rounded-2xl border px-6 py-6 md:flex-row md:items-center md:gap-8 md:px-8 md:py-8"
      {...reveal}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {service.name}
        </h2>
        {service.summary && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {service.summary}
          </p>
        )}
        {description && (
          <div className="amw-service-body mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            {description}
          </div>
        )}
      </div>
      {/* Capped so a deposit ask's terms wrap here instead of widening the
          column and squeezing the pitch. */}
      <div className="shrink-0 md:max-w-xs">
        <ServiceAction service={service} />
      </div>
    </motion.li>
  )
}

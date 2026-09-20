'use client'

import { useId, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import Link from 'next/link'
import { SectionEyebrow } from './section-eyebrow'
import { DepositCheckout } from '@/components/commerce/DepositCheckout'
import { DepositRiskReversal } from '@/components/commerce/DepositRiskReversal'
import { usd } from '@/lib/commerce/money'
import { depositPlanId } from '@/lib/commerce/whopEnv'
import { OfferTabs, offerPanelProps } from './offer-tabs'
import {
  STACK_LABEL,
  buildPricingTable,
  cta,
  highlights,
  periodLabel,
  popularId,
  priceLabel,
  seatLine,
} from '@/lib/commerce/pricingTable'

/* Ported from the "minimal" landing template (components/pricing.tsx):
   plan cards on a soft band, the recommended plan framed in the accent.

   Two offers, two tabs. WareKits is the catalogue; Anti-Slop Alec is the
   person. They used to share one four-up grid, where a single "WareKit"
   card sat beside three retainers and quoted no price, because a hardcoded
   number here had no way of tracking Lite/Pro/Team across two stacks. The
   kit tab now reads the same Payload products /pricing does -- one price,
   one source -- and shows the first stack's three tiers, pointing at
   /pricing for the rest. When no kit is published it says so rather than
   showing an empty grid, and the section opens on the tab that has
   something to sell.

   The retainer tiers are the real ones as of 2026-09-09, confirmed by Alec.
   Anything quoted here is also what Creem is told during merchant
   verification, so those two must not drift apart -- update both together. */

const easeOut = [0.16, 1, 0.3, 1]

export const OFFER_TABS = [
  { id: 'warekits', label: 'WareKits' },
  { id: 'anti-slop-alec', label: 'Anti-Slop Alec' },
]

const retainers = [
  {
    slug: 'advisor',
    name: 'Advisor',
    tagline: 'Best for pre-seed',
    price: '$3,000',
    period: 'month',
    note: 'about 10 hrs',
    features: [
      'Two strategy calls a month',
      'Async Slack and email support',
      'Architecture reviews',
      'Technology roadmap input',
    ],
  },
  {
    slug: 'fractional-cto',
    name: 'Fractional CTO',
    tagline: 'Best for seed to Series A',
    price: '$7,500',
    period: 'month',
    note: 'about 20-25 hrs',
    highlighted: true,
    features: [
      'Weekly strategy calls',
      'Team mentoring and code review',
      'Hiring support and interviews',
      'Vendor negotiations',
      'AI integration planning',
    ],
  },
  {
    slug: 'embedded-cto',
    name: 'Embedded CTO',
    tagline: 'Best for Series A+ or M&A prep',
    price: '$12,000',
    period: 'month',
    note: 'about 35-40 hrs',
    features: [
      'Near full-time commitment',
      'Direct engineering leadership',
      'Board and investor reporting',
      'Technical due diligence',
      'Fundraising support',
    ],
  },
]

const TIER_TAGLINE = {
  lite: 'The whole architecture, free',
  pro: 'For shipping to one account',
  team: 'For a team shipping together',
}

const cardClass = (highlighted) =>
  `rounded-2xl p-6 md:p-8 ${
    highlighted
      ? 'border-[var(--amw-accent)] bg-[var(--amw-card)] border-2 transition-[border-color,box-shadow] duration-300 hover:shadow-lg'
      : 'bg-[var(--amw-card)] border-[var(--amw-line)] border transition-colors duration-300'
  }`

const cardMotion = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  whileHover: { y: -4 },
  viewport: { once: true, amount: 0.3 },
  transition: {
    opacity: { duration: 0.6, ease: easeOut },
    y: { duration: 0.3, ease: easeOut },
  },
}

function Features({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
        >
          <Check
            className="text-[var(--amw-accent-ink)] mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

/* Price on its own line, terms under it. Baseline-inline only worked while
   every price was four characters: "/ month" wrapped under $12,000 but not
   under $499, so the cards disagreed with each other. $12,000 at text-5xl is
   also about 230px inside a 222px content box, hence the step down at xl --
   the card width drives this, not the viewport. */
function Price({ value, under }) {
  return (
    <div className="mb-8">
      <span className="amw-price block text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl xl:text-4xl">
        {value}
      </span>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{under}</p>
    </div>
  )
}

/* The deposit button on a retainer card. The copy on the card is written
   here; what the button needs (the Whop plan, the amount, the booking
   link) lives on the service in Payload, matched by slug, so the homepage
   and /services can never charge different deposits. Absent service or
   plan, no button: the card still reads and the intro-call CTA below
   still works. */
const reserveClass =
  'border-[var(--amw-line-strong)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent-ink)] inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-5 py-3 text-sm font-medium text-zinc-800 no-underline transition-colors dark:text-zinc-200'

function ReserveStart({ plan, service }) {
  const planId = depositPlanId(service)
  if (!planId) return null
  const amount =
    typeof service.depositAmount === 'number' ? service.depositAmount : 1500
  return (
    <DepositRiskReversal className="mt-auto pt-6">
      <DepositCheckout
        planId={planId}
        serviceName={plan.name}
        amount={amount}
        bookingUrl={service.bookingUrl || null}
        className={reserveClass}
      >
        Reserve your start · {usd(amount)}
      </DepositCheckout>
    </DepositRiskReversal>
  )
}

function RetainerCard({ plan, service }) {
  return (
    <motion.li
      className={`${cardClass(plan.highlighted)} flex flex-col`}
      {...cardMotion}
    >
      <div className="mb-6">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {plan.name}
        </h3>
        <p className="amw-kicker mt-1">{plan.tagline}</p>
      </div>
      <Price
        value={plan.price}
        under={`/ ${plan.period}${plan.note ? ` · ${plan.note}` : ''}`}
      />
      <Features items={plan.features} />
      <ReserveStart plan={plan} service={service} />
    </motion.li>
  )
}

function KitCard({ kit, popular }) {
  const action = cta(kit)
  const bullets = [seatLine(kit), ...highlights(kit)]
  return (
    <motion.li className={cardClass(popular)} {...cardMotion}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {kit.name}
        </h3>
        <p className="amw-kicker mt-1">
          {kit.tagline || TIER_TAGLINE[kit.tier] || ''}
        </p>
      </div>
      <Price value={priceLabel(kit)} under={periodLabel(kit)} />
      {action.live ? (
        <Link
          href={`/products/${kit.slug}`}
          className="hover:text-[var(--amw-accent-ink)] mb-6 inline-flex text-sm font-medium text-zinc-700 no-underline transition-colors dark:text-zinc-300"
        >
          {action.label} →
        </Link>
      ) : (
        /* Published but not yet purchasable: on the table so the stack
           reads whole, never with a Buy link, because there is nothing to
           charge against. Same rule as /pricing. */
        <p className="amw-kicker mb-6">{action.label}</p>
      )}
      <Features items={bullets} />
    </motion.li>
  )
}

function KitsEmpty() {
  return (
    <motion.div
      className={`${cardClass(false)} mx-auto max-w-xl text-center`}
      {...cardMotion}
    >
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        The kits are not on sale yet
      </h3>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        NetSuite starter kits in React and Next.js, Lite free and the whole
        architecture. They are being finished; when they go up, the tiers appear
        here.
      </p>
      <Link
        href="/contact"
        className="hover:text-[var(--amw-accent-ink)] min-h-11 mt-4 inline-flex items-center text-sm font-medium text-zinc-700 no-underline transition-colors dark:text-zinc-300"
      >
        Tell me when they are ready →
      </Link>
    </motion.div>
  )
}

const panelMotion = (reduce) => ({
  initial: reduce ? false : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: reduce ? { opacity: 1 } : { opacity: 0, y: -8 },
  transition: { duration: reduce ? 0 : 0.28, ease: easeOut },
})

export function Pricing({ kits = [], services = [] }) {
  const serviceBySlug = new Map(services.map((s) => [s.slug, s]))
  const reduce = useReducedMotion()
  const id = useId()

  const stacks = buildPricingTable(kits)
  const stack = stacks[0] ?? null
  const popular = popularId(kits)

  /* Open on whichever tab has something to sell. Leading with an empty kit
     grid would be a homepage whose first impression is "not yet". */
  const [tab, setTab] = useState(stack ? 'warekits' : 'anti-slop-alec')

  return (
    <section className="bg-[var(--amw-muted)] px-6 py-16 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-10 text-center md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <SectionEyebrow index="05" label="THE CATALOG" />
          <h2
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
          >
            Two Ways In
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Buy the foundation outright, or bring me onto the team at the depth
            you need.
          </p>
        </motion.div>

        <div className="mb-10 text-center md:mb-12">
          <OfferTabs
            id={id}
            tabs={OFFER_TABS}
            value={tab}
            onChange={setTab}
            label="Choose an offer"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === 'warekits' ? (
            <motion.div
              key="warekits"
              {...offerPanelProps(id, 'warekits')}
              {...panelMotion(reduce)}
            >
              {stack ? (
                <>
                  <p className="amw-kicker mb-6 text-center">
                    {STACK_LABEL[stack.stack] || stack.stack}
                    {stacks.length > 1 ? ' · one of two stacks' : ''}
                  </p>
                  <ul className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {stack.tiers.map((kit) => (
                      <KitCard
                        key={kit.id}
                        kit={kit}
                        popular={kit.id === popular}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <KitsEmpty />
              )}

              <motion.div
                className="mt-12 flex flex-col items-center gap-4 md:mt-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
              >
                <Link
                  href="/pricing"
                  className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg sm:w-auto"
                >
                  <span>Compare every tier</span>
                  <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110">
                    <ChevronRight
                      className="relative left-px h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
                <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                  One payment, private repository access by invitation, lifetime
                  updates. A Team licence covers five collaborators.
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="anti-slop-alec"
              {...offerPanelProps(id, 'anti-slop-alec')}
              {...panelMotion(reduce)}
            >
              <ul className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {retainers.map((plan) => (
                  <RetainerCard
                    key={plan.name}
                    plan={plan}
                    service={serviceBySlug.get(plan.slug)}
                  />
                ))}
              </ul>

              <motion.div
                className="mt-12 flex flex-col items-center gap-4 md:mt-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
              >
                <Link
                  href="/services"
                  className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg sm:w-auto"
                >
                  <span>Book an intro call</span>
                  <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110">
                    <ChevronRight
                      className="relative left-px h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
                {/* Says the price of starting before the call, not after it.
                    The deposit is credited, so it is a commitment gate rather
                    than an extra cost, and saying so is what stops it reading
                    as a fee. */}
                <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                  The deposit holds your start. After the intro call, it is
                  either credited in full to month one or returned before work
                  begins.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

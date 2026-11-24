'use client'

/* React Bits Pro "Pricing 15", adapted: the plans, rows and the price switch
   come in as props, each plan's button comes from the page through
   `renderAction`, the demo copy and the section chrome (padding, heading,
   background) are gone, and the neutrals are the `.amw` tokens. Prices are
   shown exactly as given; this block never formats or works out money. The
   page supplies the heading. */

import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { Check, Minus } from 'lucide-react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

const heading = 'text-zinc-950 dark:text-white'
const muted = 'text-zinc-600 dark:text-zinc-400'
const tint = 'bg-[var(--amw-muted)]'
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--amw-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--amw-page)]'

function ValueCell({ value }) {
  if (value === true) {
    return (
      <span className="bg-[var(--amw-accent)] text-zinc-950 grid h-5 w-5 place-items-center rounded-full">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    )
  }
  if (value === false || value === null || value === undefined) {
    return (
      <span className="inline-flex text-zinc-400 dark:text-zinc-600">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    )
  }
  return (
    <span className="text-sm text-zinc-700 dark:text-zinc-300">{value}</span>
  )
}

function Badge({ children }) {
  return (
    <span className="bg-[var(--amw-accent)] text-zinc-950 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  )
}

/* The fade-and-rise of the switch, the table and the note, one after the
   other. useReducedMotion says "reduced" on the server and on the first
   client render, and only then settles on the reader's setting, so `initial`
   -- read once, at mount -- cannot decide this. As the steps rail does, the
   target is worked out on every render: hidden only while motion is allowed
   and the block has not been reached yet, so a reduced-motion reader never
   sees it hidden. Hiding is instant, since it only happens before the block
   has been seen. The view state lives here, not in PricingCompare, so
   reaching the block does not ask the page for its actions again. */
function Entrance({ reduce, className, children }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const hidden = !reduce && !inView
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : 'hidden'}
      animate={hidden ? 'hidden' : 'visible'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduce ? 0 : 0.09 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PricingCompare({
  plans = [],
  groups = [],
  toggle,
  defaultOn = true,
  currency = '$',
  unit,
  strike = false,
  corner,
  note,
  renderAction,
  className,
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const [on, setOn] = useState(defaultOn)
  const featuredIndex = Math.max(
    0,
    plans.findIndex((plan) => plan.featured)
  )
  const [active, setActive] = useState(featuredIndex)
  const live = toggle ? on : true
  const shift = reduce ? 0 : 14

  if (!plans.length) return null

  const part = {
    hidden: { opacity: 0, y: 18, transition: { duration: 0 } },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.6, ease: EASE },
    },
  }

  const hasAlt = (plan) => plan.altPrice !== undefined && plan.altPrice !== null
  const priceOf = (plan) => (live || !hasAlt(plan) ? plan.price : plan.altPrice)
  const wasOf = (plan) =>
    toggle && strike && live && hasAlt(plan) && plan.altPrice !== plan.price
      ? plan.altPrice
      : null
  /* Which price a figure is, for a screen reader, in the switch's own words.
     Only a plan with two prices under a switch needs it. */
  const labelOf = (plan, which) =>
    toggle && hasAlt(plan) ? toggle[which] : null

  const flip = () => setOn((value) => !value)

  const renderPrice = (plan) => {
    const price = priceOf(plan)
    if (price === undefined || price === null || price === '') return null
    const was = wasOf(plan)
    const liveLabel = labelOf(plan, live ? 'on' : 'off')
    const wasLabel = labelOf(plan, live ? 'off' : 'on')
    return (
      <div data-price="" className="mt-5 flex flex-wrap items-baseline gap-1">
        <span aria-hidden="true" className={cn('text-lg font-medium', muted)}>
          {currency}
        </span>
        <span className="sr-only">
          {liveLabel ? `${liveLabel}: ` : null}
          {currency}
          <span data-price-live="">{price}</span>
        </span>
        <span
          aria-hidden="true"
          className="relative inline-grid overflow-hidden"
        >
          <span className="invisible col-start-1 row-start-1 text-4xl font-medium tabular-nums tracking-tight">
            {price}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${plan.id}-${live}`}
              initial={{ opacity: 0, y: shift }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -shift }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
              className={cn(
                'col-start-1 row-start-1 text-4xl font-medium tabular-nums tracking-tight',
                heading
              )}
            >
              {price}
            </motion.span>
          </AnimatePresence>
        </span>
        {was !== null ? (
          <s className={cn('ml-1.5 text-base tabular-nums', muted)}>
            {wasLabel ? <span className="sr-only">{wasLabel}: </span> : null}
            {currency}
            {was}
          </s>
        ) : null}
        {unit ? (
          <span className={cn('ml-1 text-sm', muted)}>{unit}</span>
        ) : null}
      </div>
    )
  }

  const renderHead = (plan) => (
    <>
      <div className="min-h-7 flex flex-wrap items-center gap-2">
        <h3 className={cn('text-lg font-medium tracking-tight', heading)}>
          {plan.name}
        </h3>
        {plan.badge ? <Badge>{plan.badge}</Badge> : null}
      </div>
      {plan.description ? (
        <p className={cn('mt-1 text-sm leading-snug', muted)}>
          {plan.description}
        </p>
      ) : null}
      {renderPrice(plan)}
      {renderAction ? <div className="mt-6">{renderAction(plan)}</div> : null}
    </>
  )

  const columns = {
    display: 'grid',
    gridTemplateColumns: `1.3fr repeat(${plans.length}, minmax(0, 1fr))`,
  }

  return (
    <Entrance reduce={reduce} className={cn('w-full', className)}>
      {toggle ? (
        <motion.div
          data-compare-part=""
          variants={part}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <span
            className={cn(
              'text-sm font-medium transition-colors duration-200',
              on ? muted : heading
            )}
          >
            {toggle.off}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={toggle.label || toggle.on}
            onClick={flip}
            className={cn(
              'relative h-7 w-12 cursor-pointer rounded-full transition-colors duration-200',
              focusRing,
              on ? 'bg-[var(--amw-accent)]' : 'bg-zinc-300 dark:bg-zinc-700'
            )}
          >
            <motion.span
              initial={false}
              animate={{ x: on ? 20 : 0 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
              className="bg-[var(--amw-page)] absolute left-1 top-1 h-5 w-5 rounded-full shadow-sm"
            />
          </button>
          <span
            className={cn(
              'text-sm font-medium transition-colors duration-200',
              on ? heading : muted
            )}
          >
            {toggle.on}
          </span>
          {toggle.badge ? (
            <span className="bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] rounded-full px-2.5 py-1 text-sm font-medium">
              {toggle.badge}
            </span>
          ) : null}
        </motion.div>
      ) : null}

      <motion.div
        data-compare-part=""
        variants={part}
        className={toggle ? 'mt-12 sm:mt-16' : undefined}
      >
        <div data-testid="compare-table" className="hidden lg:block">
          <div style={columns}>
            <div className={cn('flex items-end px-6 pb-8 text-sm', muted)}>
              {corner ? <p>{corner}</p> : null}
            </div>
            {plans.map((plan) => (
              <div
                key={plan.id}
                data-plan-col={plan.id}
                data-featured={plan.featured ? '' : undefined}
                className={cn(
                  'px-6 pt-8 pb-8',
                  plan.featured && cn('rounded-t-2xl', tint)
                )}
              >
                {renderHead(plan)}
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <div style={columns}>
                <div className="px-6 pt-10 pb-3">
                  <p
                    className={cn(
                      'font-[family-name:var(--amw-mono)] text-[11px] font-medium uppercase tracking-[0.14em]',
                      heading
                    )}
                  >
                    {group.title}
                  </p>
                </div>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={plan.featured ? tint : undefined}
                  />
                ))}
              </div>
              {(group.rows ?? []).map((row) => (
                <div
                  key={row.label}
                  style={columns}
                  className="border-t border-dashed border-[color:var(--amw-line)]"
                >
                  <div className={cn('px-6 py-3.5 text-sm', muted)}>
                    {row.label}
                  </div>
                  {plans.map((plan, index) => (
                    <div
                      key={plan.id}
                      className={cn(
                        'flex items-center px-6 py-3.5',
                        plan.featured && tint
                      )}
                    >
                      <ValueCell value={row.values?.[index]} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div style={columns}>
            <div />
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'h-6',
                  plan.featured && cn('rounded-b-2xl', tint)
                )}
              />
            ))}
          </div>
        </div>

        <div
          data-testid="compare-panels"
          className="mx-auto max-w-lg lg:hidden"
        >
          <div
            className="grid rounded-full border border-[color:var(--amw-line)] p-1"
            style={{
              gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))`,
            }}
          >
            {plans.map((plan, index) => (
              <button
                key={plan.id}
                type="button"
                aria-pressed={active === index}
                aria-controls={`${id}-panel-${index}`}
                onClick={() => setActive(index)}
                className={cn(
                  'relative cursor-pointer rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200',
                  focusRing,
                  active === index
                    ? 'text-zinc-950'
                    : cn(muted, 'hover:text-zinc-950 dark:hover:text-white')
                )}
              >
                {active === index ? (
                  <motion.span
                    layoutId={`${id}-tab`}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                    className="bg-[var(--amw-accent)] absolute inset-0 rounded-full"
                  />
                ) : null}
                <span className="relative z-10">{plan.name}</span>
              </button>
            ))}
          </div>

          <div
            className={cn(
              'mt-6 rounded-2xl border border-[color:var(--amw-line)] p-6',
              tint
            )}
          >
            {plans.map((plan, index) => {
              const shown = index === active
              return (
                <motion.div
                  key={plan.id}
                  id={`${id}-panel-${index}`}
                  data-testid="compare-panel"
                  hidden={!shown}
                  initial={false}
                  animate={
                    shown ? { opacity: 1, y: 0 } : { opacity: 0, y: shift }
                  }
                  transition={{
                    duration: reduce || !shown ? 0 : 0.25,
                    ease: EASE,
                  }}
                >
                  {renderHead(plan)}
                  {groups.map((group) => (
                    <div key={group.title} className="mt-7">
                      <p
                        className={cn(
                          'font-[family-name:var(--amw-mono)] text-[11px] font-medium uppercase tracking-[0.14em]',
                          heading
                        )}
                      >
                        {group.title}
                      </p>
                      <div className="mt-2 divide-y divide-[color:var(--amw-line)]">
                        {(group.rows ?? []).map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between gap-4 py-3"
                          >
                            <span className={cn('text-sm', muted)}>
                              {row.label}
                            </span>
                            <ValueCell value={row.values?.[index]} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {note ? (
        <motion.p
          data-compare-part=""
          variants={part}
          className={cn('mt-10 text-center text-sm', muted)}
        >
          {note}
        </motion.p>
      ) : null}
    </Entrance>
  )
}

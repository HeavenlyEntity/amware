'use client'

/* React Bits Pro "Timeline 2", adapted: the quarters come in as props, the
   vote buttons, the demo roadmap and the section chrome (padding, heading,
   background) are gone, the neutrals are the `.amw` tokens, and a column's
   icons are drawn by the page through `renderIcon`. The page supplies the
   heading. */

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

const heading = 'text-zinc-950 dark:text-white'
const muted = 'text-zinc-600 dark:text-zinc-400'

const fillOf = (quarter) => Math.max(0, Math.min(1, Number(quarter.fill) || 0))

/* The rail fills left to right, one quarter after another, then the pin
   fades in and the items rise. useReducedMotion says "reduced" on the server
   and on the first client render, and only then settles on the reader's
   setting, so `initial` -- read once, at mount -- cannot decide this. As the
   steps rail does, each target is worked out on every render: hidden only
   while motion is allowed and the list has not been reached yet, so a
   reduced-motion reader never sees anything hidden. Hiding is instant, since
   it only happens before the list has been seen. */
export function RoadmapTimeline({
  quarters = [],
  todayLabel = 'Today',
  renderIcon,
  className,
}) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' })
  const hidden = !reduce && !inView
  const still = hidden || reduce

  const starts = quarters.map((_, index) =>
    quarters
      .slice(0, index)
      .reduce((sum, quarter) => sum + fillOf(quarter) * 0.5, 0.2)
  )

  if (!quarters.length) return null

  return (
    <ol
      ref={ref}
      data-roadmap=""
      className={cn(
        '[&::-webkit-scrollbar]:hidden -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:gap-x-8 lg:overflow-visible lg:px-0 lg:pb-0',
        'lg:grid-cols-[repeat(var(--amw-roadmap-cols),minmax(0,1fr))]',
        className
      )}
      style={{ '--amw-roadmap-cols': quarters.length }}
    >
      {quarters.map((quarter, index) => {
        const fill = fillOf(quarter)
        const start = starts[index]
        const last = index === quarters.length - 1
        const items = quarter.items ?? []
        const icons = renderIcon ? quarter.icons ?? [] : []
        return (
          <li
            key={quarter.label}
            className="group/quarter w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
          >
            <h3 className="flex flex-col gap-2">
              <span className="text-[var(--amw-accent-ink)] font-[family-name:var(--amw-mono)] text-xs font-medium uppercase tabular-nums tracking-[0.14em]">
                {quarter.label}
                {quarter.today ? (
                  <span className="sr-only">, {todayLabel}</span>
                ) : null}
              </span>
              {quarter.caption ? (
                <span
                  className={cn(
                    'text-[17px] font-medium leading-snug tracking-tight',
                    heading
                  )}
                >
                  {quarter.caption}
                </span>
              ) : null}
            </h3>

            <div
              aria-hidden="true"
              className="bg-[var(--amw-line)] group-last/quarter:mr-0 relative mr-[-1rem] mt-5 h-px sm:mr-[-1.5rem] lg:mr-[-2rem]"
            >
              <motion.span
                data-roadmap-fill=""
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: hidden ? 0 : fill }}
                transition={
                  still
                    ? { duration: 0 }
                    : { duration: fill * 0.5, delay: start, ease: 'linear' }
                }
                className="bg-[var(--amw-accent)] absolute inset-x-0 -top-px h-[3px] origin-left rounded-full"
              />
              <span
                data-dot-on={fill > 0 ? '' : undefined}
                className={cn(
                  'absolute -top-1 left-0 h-[9px] w-[9px] rounded-full border',
                  fill > 0
                    ? 'bg-[var(--amw-accent)] border-[color:var(--amw-accent)]'
                    : 'bg-[var(--amw-page)] border-zinc-300 dark:border-zinc-700'
                )}
              />
              {last ? (
                <span className="bg-[var(--amw-page)] absolute -top-1 right-0 h-[9px] w-[9px] rounded-full border border-zinc-300 dark:border-zinc-700" />
              ) : null}
              {quarter.today ? (
                <motion.span
                  data-roadmap-today=""
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: hidden ? 0 : 1 }}
                  transition={
                    still
                      ? { duration: 0 }
                      : { duration: 0.4, delay: start + fill * 0.5 }
                  }
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${fill * 100}%` }}
                >
                  <span className="bg-[var(--amw-accent)] -mt-[7px] h-[15px] w-[15px] rounded-full border-[3px] border-[color:var(--amw-page)] ring-1 ring-[color:var(--amw-accent)]" />
                  <span className="text-[var(--amw-accent-ink)] mt-2 whitespace-nowrap font-[family-name:var(--amw-mono)] text-[11px] font-medium uppercase tracking-[0.12em]">
                    {todayLabel}
                  </span>
                </motion.span>
              ) : null}
            </div>

            {items.length ? (
              <ul className="mt-14 flex flex-col gap-8">
                {items.map((item, itemIndex) => (
                  <motion.li
                    key={item.title}
                    data-item-state={item.state}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={
                      hidden ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }
                    }
                    transition={
                      still
                        ? { duration: 0 }
                        : {
                            duration: 0.6,
                            ease: EASE,
                            delay: Math.min(index + itemIndex, 5) * 0.06,
                          }
                    }
                  >
                    <h4
                      className={cn(
                        'text-lg font-medium leading-snug tracking-tight sm:text-xl',
                        heading
                      )}
                    >
                      {item.title}
                    </h4>
                    <div
                      className={cn(
                        'mt-1.5 flex h-5 items-center gap-2 text-sm',
                        muted
                      )}
                    >
                      {item.state === 'shipped' ? (
                        <span
                          aria-hidden="true"
                          data-mark="shipped"
                          className="bg-[var(--amw-accent)] h-1.5 w-1.5 shrink-0 rounded-full"
                        />
                      ) : null}
                      {item.state === 'active' ? (
                        <span
                          aria-hidden="true"
                          data-mark="active"
                          className="h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-[color:var(--amw-accent)]"
                        />
                      ) : null}
                      <span className="truncate tabular-nums">
                        {item.status}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : null}

            {icons.length ? (
              <div className={cn('mt-7 flex items-center gap-3.5', muted)}>
                {icons.map((icon) => (
                  <span
                    key={icon.label}
                    role="img"
                    aria-label={icon.label}
                    title={icon.label}
                    className="[&>svg]:h-full [&>svg]:w-full inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center"
                  >
                    {renderIcon(icon.icon)}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

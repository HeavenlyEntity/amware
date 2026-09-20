'use client'

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useEffect, useRef } from 'react'
import { SectionEyebrow } from './section-eyebrow'

/* Ported from the "minimal" landing template (components/stats.tsx):
   spring-driven counters that run once when scrolled into view.

   TODO(alec): the first two figures are verifiable (shipping since 2017,
   two companies founded); the last two are placeholders. Replace with
   real counts before publishing. */

const easeOut = [0.16, 1, 0.3, 1]

const stats = [
  {
    value: 9,
    suffix: '+',
    label: 'Years Shipping',
  },
  {
    value: 2,
    suffix: '',
    label: 'Companies Founded',
  },
  {
    value: 40,
    suffix: '+',
    label: 'Projects Delivered',
  },
  {
    value: 12,
    suffix: '+',
    label: 'Engineers Mentored',
  },
]

function AnimatedNumber({ value, suffix, decimals = 0 }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  /* A spring is the wrong primitive for a counter and no amount of tuning
   * fixes it. It approaches its target exponentially, so the final integer is
   * always the slowest one: measured on the 40 counter, 0-35 took 348ms and
   * 35-40 took another 900ms, 715ms of that sitting on 39.
   *
   * A tween has a hard end. Duration is what it says, and easeOut spends
   * roughly a third of it on the last tenth rather than most of it.
   */
  const count = useMotionValue(0)

  const display = useTransform(count, (current) =>
    decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toString()
  )

  useEffect(() => {
    if (!isInView) return undefined
    const controls = animate(count, value, {
      duration: reduce ? 0 : 1,
      ease: [0, 0, 0.58, 1],
    })
    return () => controls.stop()
  }, [isInView, count, value, reduce])

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = latest + suffix
      }
    })
    return () => unsubscribe()
  }, [display, suffix])

  return (
    <>
      <span className="sr-only">
        {value.toFixed(decimals)}
        {suffix}
      </span>
      <span ref={ref} aria-hidden="true" className="amw-price">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </>
  )
}

function StatCard({ stat, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: easeOut,
      }}
    >
      <div
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl lg:text-7xl"
      >
        <AnimatedNumber
          value={stat.value}
          suffix={stat.suffix}
          decimals={stat.decimals ?? 0}
        />
      </div>
      <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 md:text-lg">
        {stat.label}
      </p>
    </motion.div>
  )
}

export function Stats() {
  const headerRef = useRef(null)
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 })

  return (
    <section className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={headerRef}
          className="mb-12 text-center md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <SectionEyebrow index="03" label="TELEMETRY" />
          <h2
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
          >
            The Numbers Behind the Playbook
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

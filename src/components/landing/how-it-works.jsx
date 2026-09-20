'use client'

import { motion, useInView } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useRef } from 'react'
import { SectionEyebrow } from './section-eyebrow'
import { ArchitectFigure, EntryPointFigure, ShipFigure } from './ship-figures'

/* Ported from the "minimal" landing template (components/how-it-works.tsx):
   three soft step cards, title pinned to the bottom. The template's
   thin-stroke icon is replaced with an illustrated figure that draws in
   on scroll and animates while the card is hovered. */

const easeOut = [0.16, 1, 0.3, 1]

const steps = [
  {
    figure: EntryPointFigure,
    title: 'Pick your entry point',
    description:
      'Grab a production-grade boilerplate, or bring me in as your fractional CTO. Both start from the same playbook.',
  },
  {
    figure: ArchitectFigure,
    title: 'We architect it right',
    description:
      'Foundations first: auth, payments, CMS, and infrastructure that survive contact with real users.',
  },
  {
    figure: ShipFigure,
    title: 'Ship and scale',
    description:
      'Launch on systems already proven in production, with a builder on call as you grow.',
  },
]

const card = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

function StepCard({ step, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()
  const Figure = step.figure

  /* The card owns the variant state; the figure's motion elements only
     declare variants, so "visible" and "hover" cascade down to them.
     Under reduced motion the figure mounts fully drawn and hover is
     inert. */
  return (
    <motion.div
      ref={ref}
      className="bg-[var(--amw-muted)] min-h-70 group flex flex-col rounded-2xl p-6 md:p-8"
      variants={card}
      initial={reduce ? false : 'hidden'}
      animate={reduce || isInView ? 'visible' : 'hidden'}
      whileHover={reduce ? undefined : 'hover'}
      transition={{ duration: 0.6, delay: index * 0.1, ease: easeOut }}
    >
      <div className="border-[var(--amw-line)] bg-[var(--amw-card)] group-hover:border-[var(--amw-accent)] relative mb-6 overflow-hidden rounded-xl border transition-colors duration-300">
        <span className="amw-kicker absolute left-4 top-3" aria-hidden="true">
          fig.0{index + 1}
        </span>
        <Figure active={isInView && !reduce} />
      </div>
      <h3 className="mb-3 mt-auto text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">
        {step.title}
      </h3>
      <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        {step.description}
      </p>
    </motion.div>
  )
}

export function HowItWorks() {
  const headerRef = useRef(null)
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 })

  return (
    <section className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={headerRef}
          className="mb-8 text-center md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <SectionEyebrow index="01" label="THE PROTOCOL" />
          <h2
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
          >
            How We Ship
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

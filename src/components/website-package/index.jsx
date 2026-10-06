'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { Pattern } from '@/components/ui/pattern'
import { WEBSITE_PACKAGE } from '@/content/site/website-package'
import { DesigningSkeleton } from './designing'
import { Microinteractions } from './microinteractions'
import { Copywriting } from './copywriting'
import { Consultation } from './consultation'
import { GlobeCard } from './globe-card'
import * as Icons from './icons'

/* Ported from the studio template's Services section: four cards whose
   illustrations play when the card is hovered, a full-width card with a
   3D globe, and a feature list. Rebranded onto the amw tokens and reworded
   to say what a website build with Alec includes. The template's "Trusted
   by 100+ companies", made-up logos and avatar pins are gone; the globe
   card carries the call to action instead. */

function Card({ children, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      whileHover={reduce ? undefined : 'animate'}
      initial="initial"
      className={`bg-[var(--amw-muted)] relative rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  )
}

function CardText({ title, description }) {
  return (
    <div className="mt-4 px-8 pb-8">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="text-base text-zinc-700 dark:text-zinc-300">
        {description}
      </p>
    </div>
  )
}

export function WebsitePackage() {
  const { heading, cards, features, cta } = WEBSITE_PACKAGE
  return (
    <section
      aria-labelledby="website-package-heading"
      className="relative mx-auto max-w-[calc(72rem-10px)] overflow-hidden py-4 [--pattern-fg:var(--amw-grid)] md:py-16"
    >
      <div className="mask-b-from-50% absolute inset-0">
        <Pattern />
      </div>

      <h2
        id="website-package-heading"
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="text-balance relative mx-auto max-w-[40ch] px-4 text-center text-xl font-semibold tracking-tight text-zinc-700 dark:text-zinc-200 md:max-w-[35ch] md:px-8 md:text-2xl"
      >
        {heading.lead}{' '}
        <span className="bg-[var(--amw-accent)] text-zinc-950">
          {heading.highlight}
        </span>
      </h2>

      <div className="relative mt-6 px-4 md:mt-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <div className="h-80">
              <DesigningSkeleton />
            </div>
            <CardText {...cards.designing} />
          </Card>
          <Card>
            <div className="h-80">
              <Microinteractions />
            </div>
            <CardText {...cards.microinteractions} />
          </Card>
          <Card>
            <div className="h-80">
              <Copywriting />
            </div>
            <CardText {...cards.copywriting} />
          </Card>
          <Card>
            <div className="h-80">
              <Consultation />
            </div>
            <CardText {...cards.consultation} />
          </Card>
          <Card className="min-h-100 col-span-1 overflow-hidden md:col-span-2">
            <GlobeCard className="size-160 md:size-180 md:-bottom-70 absolute -bottom-96 -right-72 z-10" />
            <div className="relative z-20 mt-6 flex flex-col px-8 pb-8">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {cards.launch.title}
              </h3>
              <p className="text-balance max-w-md text-base text-zinc-700 dark:text-zinc-300">
                {cards.launch.description}
              </p>
              <Link
                href={cta.href}
                className="bg-[var(--amw-accent)] text-zinc-950 group mt-8 inline-flex w-fit items-center gap-3 rounded-md py-2.5 pl-5 pr-2.5 font-medium no-underline transition-all duration-500 hover:rounded-[50px]"
              >
                <span>{cta.label}</span>
                <span className="text-zinc-950 flex h-8 w-8 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                  <ChevronRight
                    className="relative left-px h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>
          </Card>
        </div>

        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-10 px-4 md:mt-24 md:grid-cols-3 md:gap-5 md:px-8">
          {features.map((feature) => {
            const Icon = Icons[feature.icon]
            return (
              <li
                key={feature.title}
                className="flex flex-row items-center gap-2 md:flex-col md:items-start md:gap-4"
              >
                <Icon
                  className="size-6 text-zinc-600 dark:text-zinc-400"
                  aria-hidden="true"
                />
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {feature.title}
                </h3>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

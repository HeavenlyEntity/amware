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
import { PREMIUM_ICONS } from './premium-icons'

/* Ported from the studio template's Services section: four cards whose
   illustrations play when the card is hovered, a full-width card with a
   3D globe, and a feature list. Rebranded onto the amw tokens and reworded
   to say what a website build with Alec includes. The template's "Trusted
   by 100+ companies", made-up logos and avatar pins are gone; the globe
   card carries the call to action instead.

   Restyled to the services board (Main.dc.html, Build & support): a rounded,
   hatched panel (.svc-panel), dark cards on it in the dark theme, the cards
   in an auto-fit grid, and the feature list on the board's premium duotone
   icons in their 56px tiles (.svc-pi-tile). The classes live in
   services.css. The illustrations and their hover choreography are
   unchanged. */

function Card({ children, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      whileHover={reduce ? undefined : 'animate'}
      initial="initial"
      className={`svc-wp-card relative rounded-2xl ${className}`}
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
      className="svc-panel svc-panel--package"
    >
      <div aria-hidden="true" className="svc-panel-hatch">
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

      <div className="relative mt-12 px-4">
        <div className="svc-wp-grid mx-auto max-w-5xl">
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
          <Card className="min-h-100 svc-wp-wide overflow-hidden">
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

        <ul className="svc-pi-list mx-auto max-w-5xl">
          {features.map((feature) => {
            const Icon = PREMIUM_ICONS[feature.icon]
            return (
              <li key={feature.title} className="svc-pi-host">
                <span className="svc-pi-tile" aria-hidden="true">
                  <Icon />
                </span>
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

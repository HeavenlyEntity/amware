'use client'

import { useReducedMotion } from '@/components/AccessibilityProvider'

import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMediaQuery } from '@/hooks/use-client-value'

const DitherCursor = dynamic(() => import('./dither-cursor'), { ssr: false })

/* Ported from the "minimal" landing template (components/final-cta.tsx):
   a rounded accent slab with the dither shader reacting to the cursor at
   low opacity, headline, one line of support, one button. */

const easeOut = [0.16, 1, 0.3, 1]

export function FinalCTA() {
  /* Server assumes the conservative case (small screen, reduced motion) and
     the client corrects on its first post-hydration render. */
  const isMobile = useMediaQuery('(max-width: 767px)', true)
  const reduceMotion = useReducedMotion()

  return (
    <section className="px-6 pt-24 md:pt-36">
      <motion.div
        className="bg-[var(--amw-accent)] text-zinc-950 md:rounded-4xl relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-center md:px-12 md:py-24"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: easeOut }}
      >
        {!isMobile && !reduceMotion && (
          <DitherCursor
            color="#000000"
            radius={0.1}
            opacity={0.1}
            position="absolute"
          />
        )}

        <div className="relative z-10">
          <motion.h2
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="mx-auto mb-6 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
          >
            Ready to build something great?
          </motion.h2>

          <motion.p
            className="text-zinc-950/70 mx-auto mb-10 max-w-md text-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
          >
            Bring the effort. The foundations are already built. Grab a
            boilerplate or bring me onto the team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: easeOut }}
            className="inline-flex w-full sm:w-auto"
          >
            <Link
              href="/services"
              className="text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md bg-white py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg sm:w-auto"
            >
              <span>Work With Me</span>
              <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110">
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

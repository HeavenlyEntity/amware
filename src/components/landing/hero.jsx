'use client'

import { useReducedMotion } from '@/components/AccessibilityProvider'

import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import RotatingCards from './rotating-cards'
import coverGearz from '@/images/projects/gearz-mockup.webp'
import coverCelestial from '@/images/projects/celestial-cover.png'
import portKingdomKode from '@/images/photos/kingdom-kode-port.webp'
import coverConventionSuite from '@/images/projects/conventionsuite-cover-v4.png'
import mockupMipi from '@/images/photos/MiPi-mockup.webp'
import coverPortalGen from '@/images/projects/portalgen-cover.png'
import coverNeatsuite from '@/images/projects/neatsuite-cover.png'
import coverAuthjs from '@/images/projects/authjs-cover.png'
import coverChamoji from '@/images/projects/chamoji-cover.png'
import coverWindstone from '@/images/projects/windstone-cover.png'
import siteFuriousFroth from '@/images/photos/furious-froth-site.webp'
import { useMediaQuery } from '@/hooks/use-client-value'

const DitherCursor = dynamic(() => import('./dither-cursor'), { ssr: false })

/* Ported from the "minimal" landing template (components/hero.tsx):
   letter-by-letter blur-in headline, a subtext with highlighted phrases,
   a rotating ring of cards fading out under a mask, then a second
   headline and the single primary action. The cards are the project
   covers; the dither cursor only renders on desktop while the headline
   is in view, and never under reduced motion. */

const easeOut = [0.16, 1, 0.3, 1]
const headlineText = 'Let’s Build Something Great'

/* Words with their letters and the index of their first letter in the
   whole line, so the stagger runs across the sentence, not per word. */
const headlineWords = headlineText.split(' ').reduce((words, text) => {
  const start = words.length
    ? words[words.length - 1].start + words[words.length - 1].chars.length + 1
    : 0
  return [...words, { chars: text.split(''), start }]
}, [])

const cardData = [
  { label: 'Gearz', image: coverGearz },
  { label: 'Celestial Studio Salon', image: coverCelestial },
  { label: 'Kingdom Kode', image: portKingdomKode },
  { label: 'ConventionSuite', image: coverConventionSuite },
  { label: 'MiPi', image: mockupMipi },
  { label: 'PortalGen', image: coverPortalGen },
  { label: '@neatsuite/http', image: coverNeatsuite },
  { label: 'Auth.js NetSuite', image: coverAuthjs },
  { label: 'Chamoji', image: coverChamoji },
  { label: 'Windstone', image: coverWindstone },
  { label: 'Furious Froth', image: siteFuriousFroth },
]

const carouselCards = cardData.map((card, index) => ({
  id: index + 1,
  content: (
    <div className="flex h-full flex-col p-2">
      <div className="relative flex-1 overflow-hidden rounded-b-full rounded-t-sm">
        <Image
          src={card.image}
          alt={card.label}
          fill
          sizes="350px"
          className="object-cover grayscale"
        />
      </div>
      <div className="px-1 pt-3 text-center">
        <span className="amw-mono text-xs font-medium">{card.label}</span>
      </div>
    </div>
  ),
}))

function Highlight({ children, pill = false }) {
  return (
    <span
      className={`bg-[var(--amw-accent-soft)] inline-block px-2 py-0.5 leading-10 text-zinc-900 dark:text-zinc-50 ${
        pill ? 'rounded-full px-4' : 'rounded-md'
      }`}
    >
      {children}
    </span>
  )
}

export function Hero() {
  const sectionRef = useRef(null)
  const headlineRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [opacity, setOpacity] = useState(0)
  /* Server assumes the conservative case (small screen, reduced motion) and
     the client corrects on its first post-hydration render. */
  const isMobile = useMediaQuery('(max-width: 767px)', true)
  const reduceMotion = useReducedMotion()
  const opacityRef = useRef(0)
  const animationRef = useRef(null)

  useEffect(() => {
    const headline = headlineRef.current
    if (!headline) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        setIsVisible(entry.isIntersecting)
        if (entry.isIntersecting) setShouldRender(true)
      },
      { threshold: 0, rootMargin: '-10% 0px -10% 0px' }
    )

    observer.observe(headline)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const targetOpacity = isVisible ? 1 : 0

    const animate = () => {
      const diff = targetOpacity - opacityRef.current
      const step = diff * 0.02

      if (Math.abs(diff) > 0.001) {
        opacityRef.current += step
        setOpacity(opacityRef.current)
        animationRef.current = requestAnimationFrame(animate)
      } else {
        opacityRef.current = targetOpacity
        setOpacity(targetOpacity)
        if (targetOpacity === 0) setShouldRender(false)
      }
    }

    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isVisible])

  return (
    <section
      ref={sectionRef}
      className="min-h-dvh relative flex flex-col items-center justify-start overflow-hidden px-6 pt-10 sm:pt-20"
    >
      {!isMobile && !reduceMotion && shouldRender && (
        <DitherCursor opacity={opacity} />
      )}
      <div ref={headlineRef} className="relative z-10 mx-auto md:text-center">
        <p className="amw-mono mb-6 text-xs text-zinc-500 dark:text-zinc-400 md:text-center">
          <span className="text-[var(--amw-accent-ink)]">$</span> amware boot
          --profile alec.mingione
        </p>
        <h1
          style={{ fontFamily: 'Layer, sans-serif' }}
          className="mb-8 text-5xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50 md:text-8xl lg:text-8xl"
        >
          <span className="sr-only">{headlineText}</span>
          {/* Letters animate one by one, but a line may only break between
              words. Each letter used to be its own inline-block with nothing
              holding a word together, and the browser is free to break a
              line between any two inline-blocks: at some widths that split
              "Something" into "Som" and "ething". Each word is now one
              unbreakable box of letters, with an ordinary space between
              words for the line to break on. */}
          <span aria-hidden="true">
            {headlineWords.map((word, w) => (
              <span key={w}>
                {w > 0 ? ' ' : null}
                <span className="inline-block whitespace-nowrap">
                  {word.chars.map((char, c) => (
                    <motion.span
                      key={c}
                      initial={
                        reduceMotion
                          ? { opacity: 1, filter: 'blur(0px)' }
                          : { opacity: 0, filter: 'blur(10px)' }
                      }
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.4,
                        delay: (word.start + c) * 0.03,
                        ease: 'easeOut',
                      }}
                      className="inline-block"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        </h1>
        <motion.p
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.8,
            ease: 'easeOut',
          }}
          className="leading-12 mx-auto mt-6 max-w-xl text-2xl tracking-tight text-zinc-600 dark:text-zinc-400 md:text-3xl"
        >
          <Highlight>Ship faster</Highlight> &amp;{' '}
          <Highlight pill>scale smarter</Highlight> on{' '}
          <Highlight>battle-tested</Highlight> foundations from a two-time
          founder and fractional CTO.
        </motion.p>
      </div>

      {!reduceMotion && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
          className="min-h-11 relative z-10 mt-5 rounded-md px-4 py-2 text-sm text-zinc-700 underline underline-offset-4 dark:text-zinc-300"
        >
          Pause project animation
        </button>
      )}
      {/* Carousel */}
      <div
        className="h-100 sm:h-125 md:h-137.5 lg:h-150 xl:h-175 relative mt-2 w-full overflow-hidden"
        aria-hidden="true"
        style={{
          maskImage:
            'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
        }}
      >
        <div className="top-25 sm:top-30 lg:top-35 absolute left-1/2 -translate-x-1/2 xl:top-40">
          <div className="origin-top scale-[0.6] lg:scale-[0.7] xl:scale-100">
            <RotatingCards
              cards={carouselCards}
              radius={1000}
              cardClassName="rounded-md"
              cardWidth={350}
              cardHeight={275}
              duration={100}
              pauseOnHover={true}
              autoPlay={!reduceMotion && !paused}
              initialRotation={-90}
              showTrackLine={true}
              trackLineOffset={25}
            />
          </div>
        </div>
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center px-6 pb-24 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: easeOut }}
      >
        <h2
          style={{ fontFamily: 'Layer, sans-serif' }}
          className="max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl lg:text-6xl"
        >
          Turn Hard-Won Lessons <br />
          Into Shipped Product
        </h2>
        <motion.div
          className="mt-8 inline-flex w-full sm:w-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
        >
          <Link
            href="/products"
            className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline shadow-lg transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-xl sm:w-auto"
          >
            <span>Browse Boilerplates</span>
            <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-50">
              <ChevronRight
                className="relative left-px h-4 w-4"
                aria-hidden="true"
              />
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import atTheDesk from '@/images/photos/at-the-desk.jpg'
import cappuccino from '@/images/photos/cappuccino.jpg'
import waterfall from '@/images/photos/image-3.jpg'
import coworking from '@/images/photos/coworking.jpg'
import sunset from '@/images/photos/image-5.jpg'

/* Polaroid strip format ported from the RBP portfolio template
   (github.com/DavidHDev/rbp-portfolio): tilted cards drop in from above
   and follow the pointer with a small magnetic spring. Ours holds real
   photos instead of the template's dotted placeholders, fanned beside the
   About hero rather than centred under it. */

/* THE PERSON LEADS. This strip is on a page whose only job is to make a
   stranger believe in someone, and it used to be five landscapes and a car -
   a stock lifestyle pack that could have belonged to anyone. He is now the
   first frame, and two of the others show the actual work.

   Each photo carries real alt text rather than alt="". The strip is content
   here, not decoration: it is the evidence for the sentence above it. */
const PHOTOS = [
  {
    id: 'a',
    image: atTheDesk,
    rotate: -8,
    alt: 'Alec at his desk mid-thought, editor open behind him and guitars on the wall',
  },
  {
    id: 'b',
    image: cappuccino,
    rotate: 6,
    alt: 'A cappuccino on a bar counter',
  },
  {
    id: 'c',
    image: waterfall,
    rotate: -4,
    alt: 'A waterfall falling into a bright blue pool between canyon rocks',
  },
  {
    id: 'd',
    image: coworking,
    rotate: 7,
    alt: 'A laptop running code beside a copy of $100M Leads and a notebook, in the window light of a co-working space',
  },
  {
    id: 'e',
    image: sunset,
    rotate: -6,
    alt: 'Desert scrub under a long orange sunset',
  },
]

/* An overlapping fan beside the hero copy. Each card drops in once (a CSS
   keyframe, staggered from 0.5s so the header lands first), sits a little
   desaturated at its tilt, and on hover straightens, lifts and takes full
   colour. The magnetic pull lives on an inner layer so it never fights the
   tilt. The global reduced-motion rules switch the drop and the hover
   transitions off; the hook below stills the pull. */
function PolaroidCard({ photo, index, reduce }) {
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 220, damping: 18, mass: 0.6 })
  const tx = useTransform(sx, (v) => `${v}px`)
  const ty = useTransform(sy, (v) => `${v}px`)

  const handleMove = (e) => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const max = 18
    const k = 0.25
    mx.set(Math.max(-max, Math.min(max, dx * k)))
    my.set(Math.max(-max, Math.min(max, dy * k)))
  }

  const handleLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <li
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="amw-polaroid group relative -ml-2.5 shrink-0 first:ml-0 hover:z-[5] md:-ml-3.5"
      style={{
        '--r': `${photo.rotate}deg`,
        animationDelay: `${0.5 + index * 0.08}s`,
      }}
    >
      <motion.div
        style={{ x: tx, y: ty }}
        className="relative aspect-[3/4] w-16 rounded-xl bg-white p-[3px] shadow-[0_18px_32px_-16px_rgba(24,24,27,0.35),0_2px_6px_rgba(24,24,27,0.12)] dark:bg-zinc-800 dark:shadow-[0_18px_32px_-16px_rgba(0,0,0,0.85),0_2px_6px_rgba(0,0,0,0.4)] sm:w-[76px] md:w-[120px] md:rounded-2xl md:p-1"
      >
        <div className="relative h-full w-full overflow-hidden rounded-[9px] md:rounded-xl">
          <Image
            src={photo.image}
            alt={photo.alt}
            fill
            sizes="120px"
            className="object-cover grayscale-[0.35] transition-[filter] duration-[350ms] group-hover:grayscale-0"
          />
        </div>
      </motion.div>
    </li>
  )
}

export default function PhotoStrip({ className = '' }) {
  const reduce = useReducedMotion()
  return (
    <ul
      aria-label="Photos"
      className={`m-0 flex list-none items-start px-2 py-4 ${className}`.trim()}
    >
      {PHOTOS.map((photo, i) => (
        <PolaroidCard key={photo.id} photo={photo} index={i} reduce={reduce} />
      ))}
    </ul>
  )
}

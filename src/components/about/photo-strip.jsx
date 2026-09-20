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
   photos instead of the template's dotted placeholders. */

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

const EASE = [0.22, 1, 0.36, 1]

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
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      initial={
        reduce
          ? false
          : { opacity: 0, y: -120, filter: 'blur(18px)', rotate: photo.rotate }
      }
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotate: photo.rotate }}
      transition={{ duration: 0.9, delay: 0.05 + index * 0.08, ease: EASE }}
      style={{ x: tx, y: ty, rotate: photo.rotate }}
      className="relative aspect-[3/4] w-[clamp(6.5rem,12vw,10rem)] shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white p-1 shadow-md shadow-zinc-800/10 dark:border-zinc-800 dark:bg-zinc-800"
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <Image
          src={photo.image}
          alt={photo.alt}
          fill
          sizes="10rem"
          className="object-cover"
        />
      </div>
    </motion.div>
  )
}

export default function PhotoStrip() {
  const reduce = useReducedMotion()
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-2 px-4 sm:gap-3 sm:px-8">
      {PHOTOS.map((photo, i) => (
        <PolaroidCard key={photo.id} photo={photo} index={i} reduce={reduce} />
      ))}
    </div>
  )
}

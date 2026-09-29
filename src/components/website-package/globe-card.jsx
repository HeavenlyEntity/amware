'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { useInView } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* The globe is three.js. It loads only in the browser, and only once its
   card is near the viewport. A panel hidden behind the Consulting tab
   never intersects, so a visitor who never opens Build & support never
   downloads it. It is decoration: under reduced motion, or the footer's
   pause, it holds still instead of turning. No markers: the template
   pinned stock avatars to cities as if they were clients. */

const Globe3D = dynamic(() => import('./globe').then((m) => m.Globe3D), {
  ssr: false,
})

const GLOBE_CONFIG = {
  atmosphereColor: '#4da6ff',
  atmosphereIntensity: 20,
  bumpScale: 5,
}

export function GlobeCard({ className }) {
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '200px' })
  const reduce = useReducedMotion()
  return (
    <div ref={ref} aria-hidden="true" className={className}>
      {near && (
        <Globe3D
          className="h-full w-full"
          config={{ ...GLOBE_CONFIG, autoRotateSpeed: reduce ? 0 : 0.3 }}
        />
      )}
    </div>
  )
}

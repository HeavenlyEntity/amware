'use client'

import dynamic from 'next/dynamic'
import { Component, useRef } from 'react'
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
  bumpScale: 5,
}

/* A failed texture load makes drei throw, and R3F rethrows into the page;
   there is no error.* file under src/app, so an uncaught throw here would
   blank all of /services. Mirrors CrownBoundary
   (components/brand/amware-creed.jsx): the globe is decoration, so on
   error it renders nothing instead of taking the page down with it. */
class GlobeBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function GlobeCard({ className }) {
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '200px' })
  const reduce = useReducedMotion()
  return (
    <div ref={ref} aria-hidden="true" className={className}>
      {near && (
        <GlobeBoundary>
          <Globe3D
            className="h-full w-full"
            config={{ ...GLOBE_CONFIG, autoRotateSpeed: reduce ? 0 : 0.3 }}
          />
        </GlobeBoundary>
      )}
    </div>
  )
}

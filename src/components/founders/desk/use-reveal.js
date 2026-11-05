'use client'

import { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'

/*
 * Reveal on scroll for the desk landing, done so it can never hide content.
 *
 * The server HTML is always at rest: no-JS readers, crawlers and print see
 * every section. The hidden state (`data-armed`) is applied only when all of
 * these hold: the client has mounted, motion is allowed (the site toggle as
 * well as the OS setting, via `useReducedMotion`), and the element was NOT on
 * screen at its first observation. That last rule is what keeps the panel at
 * the fold from blinking out and back in on hydration; only what the reader
 * has not seen yet waits to rise in.
 *
 * Once in view at `amount` it is in for good. `fallback` is a safety net for
 * an observer that never reports at all: it only fires while the element is
 * still unobserved ('idle'), never once it is waiting offscreen, so a reader
 * who lingers on the hero still gets the reveal when they scroll. Returns the ref plus the two attributes to spread on the element.
 */
export function useReveal({ amount = 0.2, fallback = 1800 } = {}) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  /* 'idle' (not observed yet) | 'waiting' (offscreen at first look) | 'in' */
  const [phase, setPhase] = useState('idle')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setPhase('in'), 0)
      return () => clearTimeout(timer)
    }
    let first = true
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        const visible = first
          ? entry.isIntersecting
          : entry.isIntersecting && entry.intersectionRatio >= amount
        first = false
        if (visible) {
          setPhase('in')
          observer.disconnect()
        } else {
          setPhase((current) => (current === 'idle' ? 'waiting' : current))
        }
      },
      { threshold: [0, amount] }
    )
    observer.observe(el)
    const timer = setTimeout(
      () => setPhase((current) => (current === 'idle' ? 'in' : current)),
      fallback
    )
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [amount, fallback])

  const shown = reduced || phase !== 'waiting'
  return {
    ref,
    shown,
    attrs: {
      'data-reveal': '',
      'data-armed': !reduced && phase === 'waiting' ? 'true' : undefined,
      'data-in': shown ? 'true' : 'false',
    },
  }
}

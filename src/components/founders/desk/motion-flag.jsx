'use client'

import { useLayoutEffect } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMounted } from '@/hooks/use-client-value'

/*
 * Keeps `<html data-dk-motion>` true to the visitor's motion setting, so the
 * desk pages' CSS entrances can run without a flash.
 *
 * The site's motion wrapper renders `data-reduced-motion="true"` on the server
 * (it cannot know the setting yet), and accessibility.css turns every
 * animation off under it. A CSS entrance keyed off that would be off in the
 * first paint and start on hydration: show, vanish, rise. So the entrances key
 * off `data-dk-motion` instead, which the layout's pre-paint head script sets
 * from the OS setting on every hard load.
 *
 * This component covers what that script cannot: a client-side navigation
 * into a desk page (no hard load), and the site's own pause toggle. It waits
 * until mounted, because the hydrating render reports reduced motion before
 * the real value arrives, and flipping the flag then would restart an
 * entrance midway. Mounted from `DeskBackdrop`, so every desk page has it.
 */
export function DeskMotionSync() {
  const reduced = useReducedMotion()
  const mounted = useMounted()
  useLayoutEffect(() => {
    if (!mounted) return
    document.documentElement.dataset.dkMotion = reduced ? 'reduce' : 'ok'
  }, [mounted, reduced])
  return null
}

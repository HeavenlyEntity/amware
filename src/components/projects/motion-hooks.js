'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'

const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3)

/* One clock per counter group: returns an eased 0→1 progress that runs
   while `run` is true and restarts whenever `key` changes. Reduced motion
   (and the server render) jump straight to 1, so the real numbers are in
   the HTML. */
export function useCountUp(run, { key = '', duration = 900, delay = 0 } = {}) {
  const reduced = useReducedMotion()
  const [state, setState] = useState({ key, k: 0 })
  /* Restart from 0 in render when the key changes, so the old values never
     flash for a frame. */
  if (state.key !== key) setState({ key, k: 0 })

  useEffect(() => {
    if (!run || reduced) return
    let raf = 0
    const timer = setTimeout(() => {
      const t0 = performance.now()
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / duration)
        setState((s) => ({ ...s, k }))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [run, reduced, duration, delay, key])

  return reduced ? 1 : easeOutCubic(state.k)
}

/* A display value that counts up when it is a whole number, optionally
   with a trailing "+" ("26", "100+"). Years (≥ 1900) and anything else
   ("MVP", "4.9★", "1–2 wk", "OAuth 1.0a") show as written. */
export function countText(value, k) {
  const m = /^(\d+)(\+?)$/.exec(value)
  if (!m) return value
  const n = Number(m[1])
  if (n >= 1900) return value
  return Math.round(n * k) + m[2]
}

/* Sliding pill for a segmented control: measures the pressed button and
   writes --x/--w/--o on the group, so no state or re-render is involved.
   Re-measures when any option resizes (count badges change width). */
export function useSegmentInk(ref, activeKey) {
  useLayoutEffect(() => {
    const group = ref.current
    if (!group) return
    const measure = () => {
      const button = group.querySelector('[aria-pressed="true"]')
      if (!button) return
      group.style.setProperty('--x', `${button.offsetLeft}px`)
      group.style.setProperty('--w', `${button.offsetWidth}px`)
      group.style.setProperty('--o', '1')
      group.dataset.ink = '1'
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    group.querySelectorAll('button').forEach((b) => observer.observe(b))
    return () => observer.disconnect()
  }, [ref, activeKey])
}

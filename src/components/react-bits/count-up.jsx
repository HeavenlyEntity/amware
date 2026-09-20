'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* Ported from React Bits "CountUp" (reactbits.dev/r/CountUp-JS-TW, MIT).
   A number springs from `from` to `to` once it scrolls into view, writing
   straight to the DOM so no React render runs per frame. Two additions
   over the original: a `format` prop so callers can render "$1.4M" or
   "8.5%" from the animated raw value, and a reduced-motion path that
   renders the final value at once. */

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1.2,
  className = '',
  startWhen = true,
  separator = '',
  format,
  reduce: reduceProp = false,
  onStart,
  onEnd,
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion() || reduceProp
  const motionValue = useMotionValue(direction === 'down' ? to : from)

  const damping = 20 + 40 * (1 / duration)
  const stiffness = 100 * (1 / duration)
  const springValue = useSpring(motionValue, { damping, stiffness })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  const getDecimalPlaces = (num) => {
    const str = String(num)
    if (str.includes('.')) {
      const decimals = str.split('.')[1]
      if (parseInt(decimals, 10) !== 0) return decimals.length
    }
    return 0
  }
  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to))

  const formatValue = useCallback(
    (latest) => {
      if (format) return format(latest)
      const hasDecimals = maxDecimals > 0
      const formatted = Intl.NumberFormat('en-US', {
        useGrouping: Boolean(separator),
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      }).format(latest)
      return separator ? formatted.replace(/,/g, separator) : formatted
    },
    [format, maxDecimals, separator]
  )

  /* Initial text: the final value under reduced motion, else the start. */
  useEffect(() => {
    if (!ref.current) return
    const initial = reduce ? to : direction === 'down' ? to : from
    ref.current.textContent = formatValue(initial)
  }, [from, to, direction, formatValue, reduce])

  useEffect(() => {
    if (reduce || !isInView || !startWhen) return
    if (typeof onStart === 'function') onStart()
    const start = setTimeout(() => {
      motionValue.set(direction === 'down' ? from : to)
    }, delay * 1000)
    const end = setTimeout(() => {
      if (typeof onEnd === 'function') onEnd()
    }, delay * 1000 + duration * 1000)
    return () => {
      clearTimeout(start)
      clearTimeout(end)
    }
  }, [
    reduce,
    isInView,
    startWhen,
    motionValue,
    direction,
    from,
    to,
    delay,
    onStart,
    onEnd,
    duration,
  ])

  useEffect(() => {
    if (reduce) return
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = formatValue(latest)
    })
    return () => unsubscribe()
  }, [springValue, formatValue, reduce])

  return <span className={className} ref={ref} aria-label={formatValue(to)} />
}

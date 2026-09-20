'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { cn } from '@/lib/utils'

/* Ported from PaceUI "gsap-rolling-number" (paceui.com/r): each digit is
   a vertical strip 9,0..9,0 that scrolls to the target digit, so numbers
   roll into place like a mechanical counter. The original tweens with
   GSAP; this port uses Motion so it shares the site's single animation
   engine. Non-digit characters render static. */

const roll = [0.16, 1, 0.3, 1]

const RollingDigit = ({ digit, duration = 1, height = 32 }) => {
  const reduce = useReducedMotion()
  const num = parseInt(digit, 10)
  const isNumber = !isNaN(num)

  if (!isNumber) {
    return (
      <div
        className="inline-flex select-none items-center justify-center"
        style={{ height, lineHeight: `${height}px` }}
      >
        {digit}
      </div>
    )
  }

  return (
    <div
      className="relative inline-block select-none overflow-hidden"
      style={{ height }}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={reduce ? false : { y: -height }}
        animate={{ y: -height * (num + 1) }}
        transition={{ duration: reduce ? 0 : duration, ease: roll }}
      >
        <span
          style={{ height, lineHeight: `${height}px` }}
          className="flex items-center justify-center"
        >
          9
        </span>
        {[...Array(10).keys()].map((n) => (
          <span
            key={n}
            style={{ height, lineHeight: `${height}px` }}
            className="flex items-center justify-center"
          >
            {n}
          </span>
        ))}
        <span
          style={{ height, lineHeight: `${height}px` }}
          className="flex items-center justify-center"
        >
          0
        </span>
      </motion.div>
    </div>
  )
}

export const RollingNumber = ({
  targetNumber,
  duration = 1,
  height = 32,
  onComplete,
  className,
}) => {
  const digits = String(targetNumber).split('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration * 1000)
    return () => clearTimeout(timer)
  }, [duration, onComplete, targetNumber])

  return (
    <div className={cn('inline-flex items-center', className)}>
      <span className="sr-only">{targetNumber}</span>
      <span aria-hidden="true" className="inline-flex">
        {digits.map((digit, i) => (
          <RollingDigit
            key={i}
            digit={digit}
            duration={duration}
            height={height}
          />
        ))}
      </span>
    </div>
  )
}

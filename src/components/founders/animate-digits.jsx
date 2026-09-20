'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

import { cn } from '@/lib/utils'
import { useMounted } from '@/hooks/use-client-value'

/* Ported from 21st.dev "Animate Digits" by unlumen (id 20071) to plain JS.
   A string of digits where only the digits that change blur-slide to their
   new value, in the direction the number moved. Used where a value updates
   live (the rail's range as answers change), not for first arrival: that
   is CountUp's job. Reduced motion renders the new value at once. */

let nextId = 0

function DigitCell({
  char,
  isDigit,
  className,
  enterStiffness = 170,
  enterDamping = 10,
  exitStiffness = 170,
  exitDamping = 15,
  direction = 'dynamic',
  enterY = 20,
  enterBlur = 24,
  enterScale = 0.7,
  reduce = false,
}) {
  const [exitQueue, setExitQueue] = useState([])
  /* Motion-value styles are attached only after mount so the server and
     the first client render agree byte for byte (no hydration diff). */
  const mounted = useMounted()
  const prevCharRef = useRef(char)
  const isFirstRender = useRef(true)

  const springConfig = { stiffness: enterStiffness, damping: enterDamping }
  const y = useSpring(0, springConfig)
  const opacity = useSpring(1, springConfig)
  const scale = useSpring(1, springConfig)
  const blur = useSpring(0, springConfig)
  const filter = useTransform(blur, (v) => `blur(${v}px)`)

  useEffect(() => {
    if (!isDigit || reduce) return
    const prev = prevCharRef.current
    prevCharRef.current = char
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (char === prev || !/\d/.test(prev)) return

    const up =
      direction === 'dynamic' ? Number(char) > Number(prev) : direction === 'up'
    const id = nextId++
    setExitQueue((q) => {
      const next = [...q, { id, char: prev, exitY: up ? -enterY : enterY }]
      return next.length > 3 ? next.slice(-3) : next
    })

    y.jump(up ? enterY : -enterY)
    opacity.jump(0)
    scale.jump(enterScale)
    blur.jump(enterBlur)
    y.set(0)
    opacity.set(1)
    scale.set(1)
    blur.set(0)
  }, [
    char,
    isDigit,
    reduce,
    direction,
    enterY,
    enterBlur,
    enterScale,
    y,
    opacity,
    scale,
    blur,
  ])

  if (!isDigit) return <span className={className}>{char}</span>

  return (
    <span
      className={cn(
        '[&>*]:col-start-1 [&>*]:row-start-1 relative grid place-items-center',
        className
      )}
    >
      <AnimatePresence>
        {exitQueue.map(({ id, char: exitChar, exitY }) => (
          <motion.span
            key={id}
            aria-hidden="true"
            initial={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
            animate={{ opacity: 0, scale: 0.7, filter: 'blur(8px)', y: exitY }}
            transition={{
              type: 'spring',
              stiffness: exitStiffness,
              damping: exitDamping,
            }}
            onAnimationComplete={() =>
              setExitQueue((q) => q.filter((item) => item.id !== id))
            }
          >
            {exitChar}
          </motion.span>
        ))}
      </AnimatePresence>
      {mounted && !reduce ? (
        <motion.span style={{ y, opacity, scale, filter }}>{char}</motion.span>
      ) : (
        <span>{char}</span>
      )}
    </span>
  )
}

export function AnimateDigits({
  value,
  className,
  digitClassName,
  gap = 0,
  ...cellProps
}) {
  const reduce = useReducedMotion()
  const chars = String(value ?? '').split('')
  return (
    <span
      className={cn('inline-flex items-baseline tabular-nums', className)}
      style={gap ? { gap } : undefined}
      aria-label={String(value ?? '')}
    >
      {chars.map((char, index) => (
        <DigitCell
          key={`${index}-${chars.length}`}
          char={char}
          isDigit={/\d/.test(char)}
          className={digitClassName}
          reduce={Boolean(reduce)}
          {...cellProps}
        />
      ))}
    </span>
  )
}

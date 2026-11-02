'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

import { useReducedMotion } from '@/components/AccessibilityProvider'

const REVEAL = { opacity: 1, y: 0 }

/* Scroll entrance, as on Projects and Courses. `data-in` turns on once seen,
   for the CSS that hangs off it (the setup steps' top rule). */
export function Reveal({ delay = 0, children, ...props }) {
  const reduced = useReducedMotion()
  const [seen, setSeen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={REVEAL}
      viewport={{ once: true, amount: 0.15 }}
      onViewportEnter={() => setSeen(true)}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }
      }
      data-in={seen}
      {...props}
    >
      {children}
    </motion.div>
  )
}

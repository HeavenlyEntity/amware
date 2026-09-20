'use client'

import { createContext, useContext, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { useMediaQuery } from '@/hooks/use-client-value'

const MotionPreferences = createContext(null)

export function AccessibilityProvider({ children }) {
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)', true)
  const [paused, setPaused] = useState(false)
  const reduced = systemReduced || paused
  return (
    <MotionPreferences.Provider
      value={{ reduced, paused, setPaused, systemReduced }}
    >
      <MotionConfig reducedMotion="user">
        <div data-reduced-motion={reduced ? 'true' : undefined}>{children}</div>
      </MotionConfig>
    </MotionPreferences.Provider>
  )
}

export function useReducedMotion() {
  const preferences = useContext(MotionPreferences)
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)', true)
  return preferences?.reduced ?? systemReduced
}

export function MotionToggle() {
  const preferences = useContext(MotionPreferences)
  if (!preferences) return null
  const { paused, setPaused, systemReduced } = preferences
  return (
    <button
      type="button"
      aria-pressed={paused || systemReduced}
      disabled={systemReduced}
      onClick={() => setPaused(!paused)}
      className="min-h-11 rounded-md px-3 py-2 text-sm underline underline-offset-4 disabled:cursor-default"
    >
      {systemReduced ? 'Reduced motion enabled' : 'Pause continuous animations'}
    </button>
  )
}

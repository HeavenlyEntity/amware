'use client'

import { useSyncExternalStore } from 'react'

/* The studio template's diagonal hatch: two repeating gradients coloured
   by --pattern-fg. The template hides it on Apple Safari, where fixed
   gradients repaint badly; this reads that once as an external store
   rather than setting state in a layout effect. */

function isAppleSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) {
    if (!/Safari/.test(ua)) return false
    return !/CriOS|FxiOS|EdgiOS|OPiOS|EdgA/.test(ua)
  }
  if (!/Safari/.test(ua)) return false
  return !/\b(Chrome|Chromium|Edg)\b/.test(ua) && !/\bOPR\b/.test(ua)
}

const NEVER_CHANGES = () => () => {}

export function Pattern({ className }) {
  const hide = useSyncExternalStore(NEVER_CHANGES, isAppleSafari, () => false)
  if (hide) return null
  return (
    <div className={className} aria-hidden="true">
      <div className="bg-size-[5px_5px] absolute inset-0 h-full w-full bg-[repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-fixed" />
      <div className="bg-size-[5px_5px] absolute inset-0 h-full w-full bg-[repeating-linear-gradient(-315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-fixed" />
    </div>
  )
}

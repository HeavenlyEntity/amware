/*
 * One toast surface for the whole desk: the dock's. A page that wants to say
 * something ("Worked example filled in", "Copied what to say") calls
 * `announceDesk(text)`; the mounted `FoundersDeskDock` subscribes and shows it
 * in its own `role=status` pill, already placed above the dock and the phone
 * summary bar. With no dock mounted the call is a no-op.
 */

const listeners = new Set()

export function announceDesk(text) {
  if (!text) return
  for (const listener of listeners) listener(text)
}

export function subscribeDesk(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

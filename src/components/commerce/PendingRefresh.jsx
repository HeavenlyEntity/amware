'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const REFRESH_MS = 5000
export const MAX_ATTEMPTS = 6

/* The purchase webhook is server-to-server and the browser redirect
 * regularly beats it, so a buyer who has just paid often lands on the
 * onboarding page before the row exists. This component's only job is to
 * ask again: it schedules one `router.replace` to a `?attempt=` incremented
 * URL, which re-runs the page's server component and re-queries the
 * purchase. The page stops rendering this component once `attempt` reaches
 * MAX_ATTEMPTS, in favour of a manual refresh link.
 *
 * Deliberately no local state. `react-hooks/set-state-in-effect` exists to
 * catch exactly the pattern this used to be -- a `useState` counter written
 * from inside `useEffect` -- and the honest fix is not to have that state at
 * all: the URL is the counter, the server component that reads
 * `searchParams` is the source of truth, and this effect's only side effect
 * is a navigation call, never a setState. */
export function PendingRefresh({ paymentId, attempt }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (attempt >= MAX_ATTEMPTS) return undefined

    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (paymentId) params.set('payment_id', paymentId)
      params.set('attempt', String(attempt + 1))
      router.replace(`${pathname}?${params.toString()}`)
    }, REFRESH_MS)

    return () => clearTimeout(timer)
  }, [attempt, paymentId, pathname, router])

  return null
}

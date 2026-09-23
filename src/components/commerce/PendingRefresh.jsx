'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MAX_ATTEMPTS } from '@/lib/commerce/pendingRefresh'

const REFRESH_MS = 5000

/* The purchase webhook is server-to-server and the browser redirect
 * regularly beats it, so a buyer who has just paid often lands on the
 * onboarding page before the row exists. This component's only job is to
 * ask again: it schedules one `router.replace` to a `?attempt=` incremented
 * URL, which re-runs the page's server component and re-queries the
 * purchase. The page stops rendering this component once `attempt` reaches
 * MAX_ATTEMPTS, in favour of a manual refresh link.
 *
 * MAX_ATTEMPTS lives in lib/commerce/pendingRefresh, and this module exports
 * the component alone. The pages are server components: anything they
 * import from a 'use client' module is a client reference there, not a
 * value, so a constant exported from here would compare as a stub.
 *
 * checkoutRef and paymentId mirror the page's own two ways in -- a Whop
 * Elements checkout's ?ref= or a receipt email's ?payment_id=. checkoutRef
 * wins when both are given, the same preference the page's lookup applies,
 * so a retry never starts querying a different field than the one that
 * found -- or will eventually find -- the row.
 *
 * keepParams is whatever else the page needs back on the retried URL, and
 * nothing is carried unless the page names it. The deposit page names its
 * service and booking link: a deposit that lands on the third retry must
 * still be able to offer the intro call. Empty values are left out, and the
 * identifier and the attempt are always set last, so they win.
 *
 * Deliberately no local state. `react-hooks/set-state-in-effect` exists to
 * catch exactly the pattern this used to be -- a `useState` counter written
 * from inside `useEffect` -- and the honest fix is not to have that state at
 * all: the URL is the counter, the server component that reads
 * `searchParams` is the source of truth, and this effect's only side effect
 * is a navigation call, never a setState. */
/**
 * Typed through JSDoc because this is a .jsx file consumed by a .tsx page:
 * without it TypeScript infers every destructured prop as required, and the
 * onboarding page, which keeps nothing, would be rejected.
 *
 * @param {{
 *   checkoutRef?: string | null,
 *   paymentId?: string | null,
 *   attempt: number,
 *   keepParams?: Record<string, string>,
 * }} props
 */
export function PendingRefresh({
  checkoutRef,
  paymentId,
  attempt,
  keepParams,
}) {
  const router = useRouter()
  const pathname = usePathname()
  /* Flattened to a string, so the effect depends on the values rather than
     on an object that is new every time the page renders. */
  const kept = queryFrom(keepParams)

  useEffect(() => {
    if (attempt >= MAX_ATTEMPTS) return undefined

    const timer = setTimeout(() => {
      const params = new URLSearchParams(kept)
      if (checkoutRef) params.set('ref', checkoutRef)
      else if (paymentId) params.set('payment_id', paymentId)
      params.set('attempt', String(attempt + 1))
      router.replace(`${pathname}?${params.toString()}`)
    }, REFRESH_MS)

    return () => clearTimeout(timer)
  }, [attempt, checkoutRef, kept, paymentId, pathname, router])

  return null
}

function queryFrom(values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values || {})) {
    if (value) params.set(key, String(value))
  }
  return params.toString()
}

'use client'

import Link from 'next/link'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import { SERVICES_PAGE } from '@/content/site/services-page'

/* "book a strategy call →": the one filled action in the /services hero and
   book band. It opens the Cal.com popup in place (owner decision F8: one
   click to booking), on a page-level namespace of its own so a booking made
   here is reported once and kept apart from the per-tier cards'
   `on-demand-outcome-<slug>` namespaces. The popup fires the Whop `schedule`
   event itself (BookCallButton), so nothing is tracked here.

   Without a Cal.com link (none on the consulting rows, or the rows did not
   load) it falls back to the contact form, as the cards do. */

export function StrategyCallCta({ booking, className = '' }) {
  const { cta } = SERVICES_PAGE.hero
  const { serviceName, notes, namespaceSuffix } = SERVICES_PAGE.booking
  const classes = `amw-cta svc-cta ${className}`
  const label = (
    <>
      <span>{cta}</span>
      <span aria-hidden="true">→</span>
    </>
  )

  if (!booking) {
    return (
      <Link href="/contact" className={classes}>
        {label}
      </Link>
    )
  }
  return (
    <BookCallButton
      calLink={booking.link}
      namespace={`${booking.namespace}-${namespaceSuffix}`}
      serviceName={serviceName}
      notes={notes}
      className={classes}
    >
      {label}
    </BookCallButton>
  )
}

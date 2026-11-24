'use client'

import Link from 'next/link'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'

/* The Diagnostic page's one action: the free intro call. It opens the
   Cal.com popup in place on a namespace of its own (`<event>-diagnostic`),
   so a booking made here is reported once and kept apart from /services'
   own call buttons, and the notes tell me which page it came from. Without
   a Cal.com link it falls back to the contact form, as /services does.

   The label's trailing arrow is decoration and is hidden from assistive
   tech. Props: { booking: { link, namespace } | null, label, className }. */

const ARROW = /\s*(→)$/

export function DiagnosticCta({ booking, label, className = '' }) {
  const { serviceName, notes, namespaceSuffix } = DIAGNOSTIC.booking
  const classes = `amw-cta svc-cta ${className}`.trim()
  const text = label.replace(ARROW, '')
  const content = (
    <>
      <span>{text}</span>
      {text !== label ? <span aria-hidden="true">→</span> : null}
    </>
  )

  if (!booking) {
    return (
      <Link href="/contact" className={classes}>
        {content}
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
      {content}
    </BookCallButton>
  )
}

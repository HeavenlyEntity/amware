'use client'

import { useEffect } from 'react'
import { getCalApi } from '@calcom/embed-react'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* The Cal.com booking popup, and the one place a booking can be observed.

   A link to cal.com sends the visitor away; whether they booked is then
   Cal.com's secret. The embed keeps them here and raises
   `bookingSuccessfulV2` when the booking is confirmed, which is the moment
   Whop wants as a `schedule` event. The booking uid is the event id, so a
   double-fired callback counts once.

   Brand colour and layout are the values from Cal.com's own snippet for this
   event type. One listener per namespace: several cards can share an event
   type, and each booking should be reported once, not once per card.

   `onClick` is the caller's own bookkeeping -- the deposit sheet closes
   itself with it so the popup is not trapped under the sheet's overlay.
   Cal's document-level listener reads the data attributes off the same
   click, so the popup still opens. */

const BRAND = '#3fc5ac'
const listening = new Set()

export function BookCallButton({
  calLink,
  namespace,
  serviceName,
  notes,
  className,
  onClick,
  children,
}) {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const cal = await getCalApi({ namespace })
      if (cancelled) return

      cal('ui', {
        cssVarsPerTheme: {
          light: { 'cal-brand': BRAND },
          dark: { 'cal-brand': BRAND },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      })

      if (listening.has(namespace)) return
      listening.add(namespace)
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: (e) => {
          const booking = (e && e.detail && e.detail.data) || {}
          whopTrack(WHOP_EVENT.schedule, {
            event_id: booking.uid,
            content_name: serviceName,
          })
        },
      })
    })()

    return () => {
      cancelled = true
    }
  }, [namespace, serviceName])

  return (
    <button
      type="button"
      data-cal-namespace={namespace}
      data-cal-link={calLink}
      data-cal-config={JSON.stringify({
        layout: 'month_view',
        ...(notes ? { notes } : {}),
      })}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

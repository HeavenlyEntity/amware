'use client'

import { useEffect } from 'react'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/**
 * Reports a completed Creem sale from the page the buyer lands on. Only the
 * server can decide a sale is real -- it checks the purchase row is paid
 * before rendering this -- so this component is deliberately dumb: it fires
 * what it is given and decides nothing.
 *
 * The event id is the Creem request id, which is unique per checkout and
 * identical on the webhook. A refresh of the landing page sends the same id
 * again and Whop folds it into the one sale. The anonymous success page
 * reports the sale without an email. The pixel stays off a signed link, so
 * nothing reports from one (see privatePaths.js).
 *
 * Typed through JSDoc because this is a .jsx file used from .tsx pages:
 * without it TypeScript takes every destructured prop as required, and a page
 * that cannot verify who is looking has no email to give.
 *
 * @param {{
 *   eventId: string,
 *   value: number,
 *   currency?: string,
 *   email?: string,
 *   contentName?: string,
 * }} props
 */
export function TrackPurchase({
  eventId,
  value,
  currency = 'USD',
  email,
  contentName,
}) {
  useEffect(() => {
    whopTrack(WHOP_EVENT.purchase, {
      value,
      currency,
      event_id: eventId,
      email,
      content_name: contentName,
    })
  }, [eventId, value, currency, email, contentName])

  return null
}

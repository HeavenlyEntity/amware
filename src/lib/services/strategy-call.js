import { calLinkFromUrl } from '../commerce/calLink'

/* The call the /services hero and book band book (the free intro call since
   2026-11-13), read from the consulting rows rather than typed into the
   page. The page uses only the booking link: the advisory side shows no
   figure (owner decision, 2026-11-12). The price is kept for the tests and
   any caller that charges it: the first numeric deposit (the collection's
   own default too), and the booking link is the first Cal.com URL, both
   from one row where a row has both. A zero deposit means "no deposit", so
   it is skipped. Without a Cal.com link the callers fall back to the
   contact form, as the cards do. */

export const DEFAULT_STRATEGY_CALL_PRICE = 1500

export function strategyCall(consulting = []) {
  const list = Array.isArray(consulting) ? consulting : []
  const deposit = (doc) =>
    typeof doc?.depositAmount === 'number' && doc.depositAmount > 0
      ? doc.depositAmount
      : null
  /* Price and booking from the same row where one has both, so the button
     never shows one tier's price and books another tier's event. */
  const both = list.find(
    (doc) => deposit(doc) !== null && calLinkFromUrl(doc?.bookingUrl)
  )
  if (both) {
    return { price: deposit(both), booking: calLinkFromUrl(both.bookingUrl) }
  }
  const priced = list.find((doc) => deposit(doc) !== null)
  const booked = list.find((doc) => calLinkFromUrl(doc?.bookingUrl))
  return {
    price: priced ? deposit(priced) : DEFAULT_STRATEGY_CALL_PRICE,
    booking: booked ? calLinkFromUrl(booked.bookingUrl) : null,
  }
}

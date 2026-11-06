import { calLinkFromUrl } from '../commerce/calLink'

/* The strategy call the /services hero and book band sell, read from the
   consulting rows rather than typed into the page: the price is the first
   numeric deposit (the same number every card's button and the Whop pixel
   are given, and the collection's own default), and the booking link is the
   first Cal.com URL, both from one row where a row has both. A zero deposit means "no deposit", not a free call, so
   it is skipped. Without a Cal.com link the callers fall back to the contact
   form, as the cards do. */

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

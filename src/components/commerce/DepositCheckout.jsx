'use client'

import { useState } from 'react'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import {
  DEPOSIT_CHECK_FRAMES,
  DEPOSIT_CHECK_STILL,
  DEPOSIT_FRAME_MS,
  DEPOSIT_MATRIX_S,
} from '@/components/commerce/deposit-check-frames'
import { DotLoader } from '@/components/ui/dot-display/dot-loader'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { calLinkFromUrl } from '@/lib/commerce/calLink'
import { usd } from '@/lib/commerce/money'
import { whopEnvironment } from '@/lib/commerce/whopEnv'

/* The deposit that starts an engagement, paid without leaving the page.
   Whop's checkout mounts in a side sheet from the service's plan id; there
   is no server call first, because the plan is the product and the payment
   webhook finds the service again by that same id.

   PIXEL. Opening the sheet is reported as begin_checkout. The sale is NOT
   reported as purchase: Whop processes it and reports it to the ads
   platforms itself, and its pixel rejects the duplicate. See whop.ts.

   THEME. The embed is an iframe and cannot read the site's tokens, so it is
   told the mode and the accent when it opens. */

const ACCENT = '#14bbac'

/* The same one-action treatment as the card's "Book an intro call", so the
   step after paying looks like the step they already know. */
const BOOK_CTA_CLASS =
  'group mt-6 inline-flex items-center gap-3 rounded-md bg-zinc-900 py-3 pl-5 pr-3 font-medium text-white transition-all duration-500 ease-out hover:rounded-[50px] dark:bg-zinc-100 dark:text-zinc-900'

const easeOut = [0.16, 1, 0.3, 1]

/* The value moment. A 9x9 LED dot matrix sits centred in the sheet, boots
   up with a burst of static, and resolves into the checkmark (frames in
   deposit-check-frames.js); a soft accent halo pulses once as it lands,
   and only then do the heading, the copy and the one next action stagger
   in underneath. Everything is in the DOM from the first paint -- the
   staging is opacity and a few pixels of travel, so screen readers and
   tests read the whole state immediately. Reduced motion collapses it
   all: the checkmark appears lit, nothing pulses, nothing is delayed. */
function Received({ serviceName, amount, bookingUrl, booking, onBook }) {
  const reduce = useReducedMotion()
  const land = reduce ? 0 : DEPOSIT_MATRIX_S
  const stage = (delay) =>
    reduce
      ? { initial: false }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: land + delay, ease: easeOut },
        }

  return (
    <div role="status" className="mt-6 flex flex-col items-center text-center">
      <div className="relative my-6" aria-hidden="true">
        {/* One pulse as the check lands: an accent halo swelling through
            and past the matrix, then gone. */}
        {!reduce && (
          <motion.span
            className="bg-[var(--amw-accent-soft)] absolute -inset-8 rounded-full blur-xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.3, 1.45] }}
            transition={{ duration: 0.9, delay: land - 0.1, ease: 'easeOut' }}
          />
        )}
        <DotLoader
          data-testid="deposit-check-matrix"
          frames={reduce ? DEPOSIT_CHECK_STILL : DEPOSIT_CHECK_FRAMES}
          columns={9}
          duration={reduce ? 0 : DEPOSIT_FRAME_MS}
          repeatCount={1}
          className="relative gap-1"
          dotClassName="size-2 rounded-full bg-zinc-900/10 transition-colors duration-150 dark:bg-white/10 [&.active]:bg-[var(--amw-accent-ink)] [&.active]:shadow-[0_0_8px_rgba(20,187,172,0.55)]"
        />
      </div>
      <motion.h3
        {...stage(0.05)}
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
        Deposit received.
      </motion.h3>
      <motion.p
        {...stage(0.18)}
        className="mt-3 max-w-sm text-base leading-relaxed text-zinc-600 dark:text-zinc-400"
      >
        {usd(amount)} for {serviceName}, credited in full against your first
        month. A receipt is on its way to your inbox, and I will be in touch
        within one business day.
      </motion.p>
      {booking ? (
        /* The reservation flows straight into the intro call: the same
           Cal.com popup the card's primary action opens, not a link that
           sends the buyer away. Clicking closes the sheet so the calendar
           has the page to itself. */
        <motion.div {...stage(0.32)} className="flex flex-col items-center">
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            One thing left: pick a time for the intro call.
          </p>
          <BookCallButton
            calLink={booking.link}
            namespace={booking.namespace}
            serviceName={serviceName}
            className={BOOK_CTA_CLASS}
            onClick={onBook}
          >
            <span>Book the intro call</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-900 transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-100">
              <ChevronRight
                className="relative left-px h-4 w-4"
                aria-hidden="true"
              />
            </span>
          </BookCallButton>
        </motion.div>
      ) : (
        bookingUrl && (
          <motion.p
            {...stage(0.32)}
            className="mt-4 text-sm text-zinc-600 dark:text-zinc-400"
          >
            Not spoken yet?{' '}
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--amw-accent-ink)] underline underline-offset-4"
            >
              Book the intro call
            </a>
            .
          </motion.p>
        )
      )}
    </div>
  )
}

export function DepositCheckout({
  planId,
  serviceName,
  amount = 1500,
  bookingUrl,
  className,
  children,
}) {
  const [open, setOpen] = useState(false)
  const [received, setReceived] = useState(false)
  const [dark, setDark] = useState(false)
  const [origin, setOrigin] = useState('')
  /* Which Whop the embed talks to. Sandbox is announced in the sheet so a
     tester with a real card cannot mistake it for the live thing, and vice
     versa. */
  const environment = whopEnvironment()
  /* A Cal.com booking link becomes the in-page popup after payment; anything
     else stays a plain link. Same rule the card itself applies. */
  const booking = calLinkFromUrl(bookingUrl)
  /* External payment methods (bank redirects, wallets) leave the page and
     come back through /checkout/deposit; the booking link rides along so
     that page can offer the same popup. Whop appends ?status= itself. */
  const returnUrl = booking
    ? `${origin}/checkout/deposit?service=${encodeURIComponent(
        serviceName || ''
      )}&booking=${encodeURIComponent(bookingUrl)}`
    : `${origin}/checkout/deposit`

  /* Read at the moment of opening, from the click: the embed is an iframe
     that cannot see the page's theme, and the return URL must be absolute.
     Both are settled by then and neither belongs in an effect. */
  const onOpenChange = (next) => {
    if (next) {
      setDark(document.documentElement.classList.contains('dark'))
      setOrigin(window.location.origin)
    }
    setOpen(next)
    if (next && !received) {
      whopTrack(WHOP_EVENT.beginCheckout, {
        value: amount,
        currency: 'USD',
        content_type: 'deposit',
        content_id: planId,
        content_name: serviceName,
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={className}
      >
        {children}
      </button>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-6 sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-0 pr-10">
          <SheetTitle
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="text-2xl font-bold tracking-tight"
          >
            Reserve your start
          </SheetTitle>
          <SheetDescription>
            {usd(amount)} deposit for {serviceName}, credited in full against
            your first month.
          </SheetDescription>
          {environment === 'sandbox' && (
            <p className="amw-chip amw-chip--accent self-start">
              Sandbox: test cards only, nothing is charged
            </p>
          )}
        </SheetHeader>

        {received ? (
          <Received
            serviceName={serviceName}
            amount={amount}
            bookingUrl={bookingUrl}
            booking={booking}
            onBook={() => setOpen(false)}
          />
        ) : (
          origin && (
            <div className="mt-2 min-h-[28rem]">
              <WhopCheckoutEmbed
                planId={planId}
                theme={dark ? 'dark' : 'light'}
                themeOptions={{
                  accentColor: ACCENT,
                  borderRadius: 8,
                  buttonText: `Pay ${usd(amount)} deposit`,
                }}
                returnUrl={returnUrl}
                environment={environment}
                skipRedirect
                onComplete={() => setReceived(true)}
                fallback={
                  <div
                    aria-busy="true"
                    className="bg-[var(--amw-muted)] h-96 animate-pulse rounded-lg"
                  />
                }
              />
            </div>
          )
        )}
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useState } from 'react'
import { WhopCheckout } from '@/components/commerce/WhopCheckout'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { usd } from '@/lib/commerce/money'
import { whopEnvironment } from '@/lib/commerce/whopEnv'

/* The deposit that starts an engagement, paid without leaving the page.
   Whop's checkout mounts in a side sheet from the service's plan id; there
   is no server call first, because the plan is the product and the payment
   webhook finds the service again by that same id.

   AFTER PAYING. The checkout is the site's one Whop Elements checkout,
   WhopCheckout. Elements has no completion callback: a finished payment
   redirects the whole tab to /checkout/deposit, carrying the reference
   WhopCheckout minted, the service name and the booking link. That page
   confirms the deposit from the ledger and offers the intro call, so the
   sheet itself never shows a received state.

   PIXEL. Opening the sheet is reported as begin_checkout. The sale is NOT
   reported as purchase: Whop processes it and reports it to the ads
   platforms itself, and its pixel rejects the duplicate. See whop.ts.

   THEME. The element runs in its own frame and cannot read the site's
   tokens; WhopCheckout reads the mode when it mounts, which is when the
   sheet opens. */

export function DepositCheckout({
  planId,
  serviceName,
  amount = 1500,
  bookingUrl,
  className,
  children,
}) {
  const [open, setOpen] = useState(false)
  /* Which Whop the checkout talks to. Sandbox is announced in the sheet so
     a tester with a real card cannot mistake it for the live thing, and
     vice versa. */
  const environment = whopEnvironment()

  const onOpenChange = (next) => {
    setOpen(next)
    if (next) {
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

        {/* The sheet mounts its content only while open, so each opening is
            a fresh checkout with its own reference. The service name and
            booking link ride on the return URL; /checkout/deposit treats
            the booking link as untrusted and only a Cal.com one becomes the
            popup. */}
        <WhopCheckout
          planId={planId}
          returnPath="/checkout/deposit"
          returnParams={{ service: serviceName, booking: bookingUrl }}
          className="mt-2 min-h-[28rem]"
        />
      </SheetContent>
    </Sheet>
  )
}

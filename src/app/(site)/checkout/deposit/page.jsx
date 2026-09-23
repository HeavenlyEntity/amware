import Link from 'next/link'
import { Container } from '@/components/Container'
import { BookCallButton } from '@/components/commerce/BookCallButton'
import { PendingRefresh } from '@/components/commerce/PendingRefresh'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { calLinkFromUrl } from '@/lib/commerce/calLink'
import { firstParam } from '@/lib/commerce/onboardingDisplay'
/* From the plain module, never from PendingRefresh.jsx: on the server this
   page would get a 'use client' export as a client reference, not the
   number, and every attempt would compare as done. */
import { MAX_ATTEMPTS } from '@/lib/commerce/pendingRefresh'
import { validCheckoutRef } from '@/lib/commerce/whop'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Deposit',
  robots: { index: false },
}

/* Where a deposit's checkout sends the client back.
 *
 * Whop Elements has no completion callback: a finished checkout redirects
 * the whole tab here, to the return URL WhopCheckout built. It carries
 * ?ref=, the reference WhopCheckout minted and handed to Whop as order
 * metadata, plus the service name and its booking link from the sheet.
 * What Whop itself appends is undocumented, so nothing here reads it as an
 * outcome. The webhook stores the reference on the purchase, and a paid
 * purchase with this reference is the only thing that says the deposit
 * went through.
 *
 * Arriving here proves nothing either way. Without a valid ref there is
 * nothing to look up, so the page points at the email -- never at "did not
 * go through", which a client who has just paid must not read on a guess.
 * The failure message answers only an explicit ?status=error, which the
 * older embed appended on the way back from a failed bank redirect.
 *
 * The webhook is server-to-server and the redirect regularly beats it, so
 * a valid ref with no purchase yet is the ordinary first few seconds after
 * paying: the page says so and checks again, a bounded number of times,
 * carrying the booking link so the intro call is still offered when the
 * deposit lands.
 *
 * There is no signature, and a ref is client-minted: a lookup handle, never
 * proof. It is validated as a UUID before it reaches a query, and the query
 * reads the row's status and nothing else -- the email and the amount stay
 * in the receipt only the client received. A lookup that fails points at
 * the email too: a public page degrades, it never throws.
 *
 * The booking param is untrusted query input. calLinkFromUrl only accepts a
 * real Cal.com URL, and anything else is dropped rather than rendered -- the
 * page falls back to its own links. */

const bodyClass =
  'mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400'
const noteClass = 'mt-4 text-sm text-zinc-600 dark:text-zinc-400'
const actionsClass = 'mt-8 flex flex-wrap items-center gap-4'
const ctaClass = 'amw-cta inline-flex max-w-xs'
const quietLinkClass =
  'hover:text-[var(--amw-accent-ink)] min-h-11 inline-flex items-center text-sm font-medium text-zinc-700 no-underline transition-colors dark:text-zinc-300'
const inlineLinkClass =
  'text-[var(--amw-accent-ink)] underline underline-offset-4'

function Shell({ kicker = 'deposit', title, children }) {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="amw mx-auto max-w-2xl">
        <p className="amw-kicker">{kicker}</p>
        <h1
          style={{ fontFamily: 'Layer, sans-serif' }}
          className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl"
        >
          {title}
        </h1>
        {children}
      </div>
    </Container>
  )
}

/* Whop's own word that the payment failed. Nothing was charged, so the one
   useful thing is another try. */
function PaymentFailed() {
  return (
    <Shell title="That payment did not go through.">
      <p className={bodyClass}>
        Nothing was charged. You can try again from the engagement you chose, or
        get in touch and we will sort it out by hand.
      </p>
      <p className={actionsClass}>
        <Link href="/services" className={ctaClass}>
          Try again
        </Link>
        <Link href="/contact" className={quietLinkClass}>
          Get in touch →
        </Link>
      </p>
    </Shell>
  )
}

/* The ledger has the deposit. A Cal.com booking link flows straight into
   the intro call -- the same popup the card's "Book an intro call" opens. */
function Reserved({ cal, serviceName }) {
  return (
    <Shell kicker="deposit received" title="Your start is reserved.">
      <p className={bodyClass}>
        {cal
          ? 'The deposit is credited in full against your first month. A receipt is on its way — one thing left: pick a time for the intro call.'
          : 'The deposit is credited in full against your first month. A receipt is on its way, and I will be in touch within one business day to set the engagement up.'}
      </p>
      <p className={actionsClass}>
        {cal ? (
          <>
            <BookCallButton
              calLink={cal.link}
              namespace={cal.namespace}
              serviceName={serviceName}
              className={ctaClass}
            >
              Book the intro call
            </BookCallButton>
            <Link href="/services" className={quietLinkClass}>
              Back to engagements →
            </Link>
          </>
        ) : (
          <Link href="/services" className={ctaClass}>
            Back to engagements
          </Link>
        )}
      </p>
    </Shell>
  )
}

/* The webhook has not landed yet. The page says so, and asks again. */
function Confirming({ checkoutRef, attempt, keep }) {
  return (
    <Shell title="Confirming your deposit">
      <p className={bodyClass}>
        You do not need to pay again. Your deposit is safe either way, and the
        email confirming it is on its way to your inbox.
      </p>
      {attempt < MAX_ATTEMPTS ? (
        <>
          <p className={noteClass}>
            This checks again automatically every few seconds.
          </p>
          <PendingRefresh
            checkoutRef={checkoutRef}
            attempt={attempt}
            keepParams={keep}
          />
        </>
      ) : (
        <p className={noteClass}>
          Still nothing after a minute or two?{' '}
          <Link href={retryHref(checkoutRef, keep)} className={inlineLinkClass}>
            Refresh the page
          </Link>
          , reply to that email and I will sort it by hand, or{' '}
          <Link href="/contact" className={inlineLinkClass}>
            get in touch
          </Link>
          .
        </p>
      )}
    </Shell>
  )
}

/* The neutral state, for a link with no deposit to show: no ref, a ref
   that is not a UUID, a purchase that is no longer paid, or a lookup that
   failed. It says nothing about any purchase, and nothing that would be
   untrue for a client who has just paid -- it points at the email and a
   human, which always work. */
function CheckEmail() {
  return (
    <Shell title="Check your email">
      <p className={bodyClass}>
        This page has no deposit to show for this link. If you have just paid,
        your deposit is safe and you do not need to pay again — the email
        confirming it has the details.
      </p>
      <p className={noteClass}>
        Something missing? Reply to that email and I will sort it by hand, or{' '}
        <Link href="/contact" className={inlineLinkClass}>
          get in touch
        </Link>
        .
      </p>
    </Shell>
  )
}

/* This page again for the same ref, keeping what the success state needs:
   the manual counterpart of PendingRefresh's automatic retry. No attempt,
   so a refresh starts the count over. */
function retryHref(checkoutRef, keep) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(keep)) {
    if (value) params.set(key, value)
  }
  params.set('ref', checkoutRef)
  return `/checkout/deposit?${params.toString()}`
}

export default async function DepositReturn({ searchParams }) {
  /* A repeated param arrives as an array; firstParam takes the first, so an
     array never reaches the query, the status check or a URL. */
  const params = await searchParams
  const status = firstParam(params.status)
  const ref = validCheckoutRef(firstParam(params.ref))
  const attempt = Math.max(0, parseInt(firstParam(params.attempt), 10) || 0)
  const serviceName = firstParam(params.service)
  const booking = firstParam(params.booking)
  const cal = calLinkFromUrl(booking)

  /* Before any lookup: whatever the ref would find, Whop has just said this
     payment failed. */
  if (status === 'error') return <PaymentFailed />

  // Without a ref the lookup can never succeed, so nothing waits.
  if (!ref) return <CheckEmail />

  let deposit = null
  let loadError = false
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { whopCheckoutRef: { equals: ref } },
      /* Whether the row exists, and its status: nothing else leaves the
         database for this page. */
      select: { status: true },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    deposit = docs[0] || null
  } catch (err) {
    // A public page must degrade, never throw -- the client may have paid.
    console.error('Deposit lookup failed', err)
    loadError = true
  }

  if (loadError) return <CheckEmail />

  if (!deposit) {
    return (
      <Confirming
        checkoutRef={ref}
        attempt={attempt}
        /* What a retry must carry for the success state: the service name,
           and the booking link only if it passed the Cal.com gate. */
        keep={{ service: serviceName, booking: cal ? booking : '' }}
      />
    )
  }

  /* A refunded deposit still resolves by its ref, so only a paid one is
     called reserved. */
  if (deposit.status !== 'paid') return <CheckEmail />

  return <Reserved cal={cal} serviceName={serviceName} />
}

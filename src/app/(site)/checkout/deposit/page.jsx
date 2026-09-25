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
 * metadata, plus the service name from the sheet. What Whop itself appends
 * is undocumented, so nothing here reads it as an outcome. The webhook
 * stores the reference on the purchase, and a paid purchase of a service
 * with this reference is the only thing that says the deposit went
 * through.
 *
 * Arriving here proves nothing either way. Without a valid ref there is
 * nothing to look up, so the page points at the email -- never at "did not
 * go through", which a client who has just paid must not read on a guess.
 * The failure message answers only an explicit ?status=error -- which only
 * the old embed ever appended, on the way back from a failed bank redirect
 * -- and only where there is no paid row to show: with a valid ref the page
 * looks first, and a paid deposit wins over anything on the URL.
 *
 * The webhook is server-to-server and the redirect regularly beats it, so
 * a valid ref with no purchase yet is usually the first few seconds after
 * paying: the page checks again, a bounded number of times, carrying the
 * service name. It is not always that. A declined or abandoned bank or 3DS
 * step sends the client back to this same URL with no failure signal, and
 * no row ever arrives -- so that state never claims the deposit exists: it
 * says not to pay again only if the payment went through, and once the
 * checks run out, that an unfinished step took nothing.
 *
 * There is no signature, and a ref is client-minted: a lookup handle, never
 * proof. It is validated as a UUID before it reaches a query, and the query
 * reads the row's status, what was bought and that service's booking link
 * and nothing else -- the email and the amount stay in the receipt only
 * the client received. Only a paid service counts as a deposit: the ref is
 * browser-set, so a paid $0 kit could carry one its buyer chose. A lookup
 * that fails points at the email too: a public page degrades, it never
 * throws.
 *
 * The booking link comes from the purchased service, never from the URL.
 * DepositCheckout still puts one on the return URL, but that is untrusted
 * query input, and the page no longer reads it: the service's own link is
 * the owner's, so calLinkFromUrl only decides whether it becomes the Cal.com
 * popup or a plain link. */

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

/* An explicit ?status=error with no paid row to show for it. Only the old
   embed ever appended one. Nothing was charged, so the one useful thing is
   another try. */
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

/* The ledger has the deposit. The booking link is the one the owner set on
   the purchased service -- trusted, unlike anything on the URL -- and
   calLinkFromUrl decides what it becomes, as it does on the service card:
   a Cal.com link flows straight into the intro call, the same popup the
   card's "Book an intro call" opens, and any other opens where it points. */
function Reserved({ bookingUrl, serviceName }) {
  const cal = calLinkFromUrl(bookingUrl)
  return (
    <Shell kicker="deposit received" title="Your start is reserved.">
      <p className={bodyClass}>
        {bookingUrl
          ? 'The deposit is credited in full against your first month. A receipt is on its way — one thing left: pick a time for the intro call.'
          : 'The deposit is credited in full against your first month. A receipt is on its way, and I will be in touch within one business day to set the engagement up.'}
      </p>
      <p className={actionsClass}>
        {bookingUrl ? (
          <>
            {cal ? (
              <BookCallButton
                calLink={cal.link}
                namespace={cal.namespace}
                serviceName={serviceName}
                className={ctaClass}
              >
                Book the intro call
              </BookCallButton>
            ) : (
              <Link
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className={ctaClass}
              >
                Book the intro call
              </Link>
            )}
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

/* No row for this ref yet. Usually the webhook has not landed, and the page
   asks again. But a declined or abandoned bank or 3DS step returns the
   client to this same URL with no failure signal, and then no row ever
   arrives. So every sentence here is true either way: nothing promises a
   deposit or an email that may not exist, and another try is offered only
   once the checks have run out -- never while the webhook may just be
   late. */
function Confirming({ checkoutRef, attempt, keep }) {
  return (
    <Shell title="Confirming your deposit">
      <p className={bodyClass}>
        If your payment went through, you do not need to pay again — it can take
        a minute to show here.
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
          If your bank or card step did not finish, nothing was taken.{' '}
          <Link href="/services" className={inlineLinkClass}>
            Try again
          </Link>{' '}
          from the engagement you chose,{' '}
          <Link href={retryHref(checkoutRef, keep)} className={inlineLinkClass}>
            refresh the page
          </Link>{' '}
          to check once more, or{' '}
          <Link href="/contact" className={inlineLinkClass}>
            get in touch
          </Link>{' '}
          and I will sort it by hand.
        </p>
      )}
    </Shell>
  )
}

/* The neutral state, for a link with no deposit to show: no ref, a ref
   that is not a UUID, a purchase that is no longer paid or was never a
   deposit, or a lookup that failed. It says nothing about any purchase,
   and nothing that would be
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

/* A deposit is a paid purchase of a service, and nothing else found by
   this ref is one -- not a refund, and not a paid kit or a plan no service
   claims. The ref and the metadata behind it are browser-set, so a paid $0
   Lite order could carry any ref its buyer chose. */
function isPaidDeposit(purchase) {
  return purchase?.status === 'paid' && purchase.itemType === 'service'
}

/* The booking link the owner set on the purchased service, as the lookup
   populated it. Never the URL's. */
function bookingUrlOf(purchase) {
  const item = purchase.item
  const service =
    item?.relationTo === 'services' && typeof item.value === 'object'
      ? item.value
      : null
  return service?.bookingUrl || null
}

export default async function DepositReturn({ searchParams }) {
  /* A repeated param arrives as an array; firstParam takes the first, so an
     array never reaches the query, the status check or a URL. */
  const params = await searchParams
  const status = firstParam(params.status)
  const ref = validCheckoutRef(firstParam(params.ref))
  const attempt = Math.max(0, parseInt(firstParam(params.attempt), 10) || 0)
  const serviceName = firstParam(params.service)

  /* Without a valid ref there is nothing to look up, so nothing waits and
     the URL is all there is: an explicit ?status=error still says the
     payment failed, and anything else points at the email. */
  if (!ref) return status === 'error' ? <PaymentFailed /> : <CheckEmail />

  /* With one, the page looks first, whatever the URL says: a paid deposit
     wins over any parameter, because a client who paid must never read
     "did not go through… Try again" -- that is how a deposit gets paid
     twice. */
  let deposit = null
  let loadError = false
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { whopCheckoutRef: { equals: ref } },
      /* Whether the row exists, its status, what was bought, and -- for a
         service -- the booking link the owner set on it. Never the email
         or the amount. */
      select: { status: true, itemType: true, item: true },
      depth: 1,
      populate: { services: { bookingUrl: true } },
      limit: 1,
      overrideAccess: true,
    })
    deposit = docs[0] || null
  } catch (err) {
    // A public page must degrade, never throw -- the client may have paid.
    console.error('Deposit lookup failed', err)
    loadError = true
  }

  /* A failed lookup cannot rule out a paid row, so the URL does not get to
     say the payment failed either. */
  if (loadError) return <CheckEmail />

  if (isPaidDeposit(deposit)) {
    return (
      <Reserved bookingUrl={bookingUrlOf(deposit)} serviceName={serviceName} />
    )
  }

  // Only now may ?status=error decide: the ref has no paid deposit.
  if (status === 'error') return <PaymentFailed />

  if (!deposit) {
    return (
      <Confirming
        checkoutRef={ref}
        attempt={attempt}
        /* What a retry carries: the service name, for the popup's own
           reporting. Never the URL's booking link -- the paid state reads
           the service's. */
        keep={{ service: serviceName }}
      />
    )
  }

  /* A refunded deposit still resolves by its ref, and so does a purchase
     that was never a deposit. Neither turns into one by waiting, so
     neither waits. */
  return <CheckEmail />
}

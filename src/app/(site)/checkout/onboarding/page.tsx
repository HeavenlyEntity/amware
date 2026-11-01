import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { OnboardingSteps } from '@/components/commerce/OnboardingSteps'
import { OnboardingGithubForm } from '@/components/commerce/OnboardingGithubForm'
import { TrackPurchase } from '@/components/analytics/TrackPurchase'
import { centsToValue } from '@/lib/analytics/whop'
import { NextStep } from '@/components/commerce/NextStep'
import { PendingRefresh } from '@/components/commerce/PendingRefresh'
import {
  firstParam,
  maskLicenseKey,
  tierFromSlug,
} from '@/lib/commerce/onboardingDisplay'
/* From the plain module, never from PendingRefresh.jsx: on the server this
   page would get a 'use client' export as a client reference, not the
   number, and every attempt would compare as done. */
import { MAX_ATTEMPTS } from '@/lib/commerce/pendingRefresh'
import { validCheckoutRef } from '@/lib/commerce/whop'
import { licenseLinkFor } from '@/lib/commerce/licenseLink'
import { hasSeat, listSeats, seatLimit } from '@/lib/commerce/seats'
import { licenseLimits } from '@/lib/commerce/license'
import { currentKey, licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { verifyOnboardingLink } from '@/lib/commerce/onboardingLink'
import type { Purchase } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Set up your kit',
  robots: { index: false },
}

/*
 * Where Whop sends a buyer after payment.
 *
 * The page has no signature -- there is nothing on it worth forging. It
 * grants nothing (Whop's webhook already delivered the repo invitation by
 * the time this renders), so all a payment_id or ref unlocks is a look at
 * your own purchase: the item name, the repo, a masked license key, the
 * GitHub username on file, and one relevant next step. Never the full key,
 * the email or the amount -- those stay in the receipt only you received.
 *
 * Two ways in. WhopCheckout mints a reference before the buyer ever pays,
 * carries it through Whop as order metadata, and always returns with it as
 * ?ref=; the webhook stores it as whopCheckoutRef. The receipt email's setup
 * link predates that and still points at ?payment_id=, Whop's own id for the
 * payment. Both must keep resolving, so the lookup tries ref first and
 * falls back to payment_id -- ref is the fresher of the two when a URL
 * somehow carries both, being the one the checkout that just ran actually
 * minted. ref is client-minted, so before it is trusted as far as a query it
 * is validated against the canonical UUID shape and lower-cased; anything
 * else is treated as no ref at all.
 *
 * The webhook is server-to-server and the browser redirect regularly beats
 * it, so "no purchase yet" is a normal state for the first few seconds
 * after paying, not an error: it refreshes itself a bounded number of times
 * rather than showing a 404 to someone who has just been charged. It is not
 * always that. A declined or abandoned bank or 3DS step sends the buyer
 * back to this same URL with no failure signal, and no row ever arrives --
 * so that state never claims the payment exists: it says not to pay again
 * only if the payment went through, and once the checks run out, that an
 * unfinished step took nothing.
 *
 * Only that case waits. An explicit ?status=error -- which only the old
 * embed ever appended, on the way back from a failed bank redirect -- says
 * the payment did not go through and offers another try, but only where
 * there is no paid row to show: with a valid ref the page looks first, and
 * a paid row wins over anything on the URL. A link with no payment id or
 * ref, or one whose purchase is no longer paid, can never turn into a
 * purchase by waiting, so it points at the email straight away.
 *
 * Creem is the third way in, and the only one that asks anything. Its
 * success_url is the signed link from `onboardingPath`: ?r=<request id>&s=<its
 * signature>, plus whatever Creem appends, which is ignored. The signature
 * proves we minted the link, so the page verifies it before it looks anything
 * up; an r without a valid s is the manual state, and never falls through to
 * the other two. A paid kit row that has no GitHub account yet asks for one
 * here, through a form that posts the same r and s to an action that verifies
 * them again. Once the account is on file the page is the same one a Whop
 * buyer sees, ending on the license page.
 */

function Shell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="amw mx-auto max-w-2xl">
        <p className="amw-eyebrow">{'// setup'}</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          {title}
        </h1>
        {children}
      </div>
    </Container>
  )
}

const linkClass =
  'text-teal-700 underline underline-offset-4 dark:text-teal-300'

/* The manual route, for a link that can never show a purchase by waiting:
 * no ref or payment id at all (Whop gave none, or the ref on the URL was
 * not a valid one, so there is nothing to look up), or a purchase that is
 * no longer paid (a revoked license is marked refunded). It says nothing
 * about any purchase -- no item, repo, key or account -- so it is safe in
 * front of whoever holds the link, and it points at the one thing that
 * always works: the purchase email and a human. */
/* Reload this page for the same purchase. Both states that cannot yet
   describe the order offer it, keyed the way the buyer arrived. */
function refreshHref(
  ref: string | null,
  paymentId: string | null | undefined,
  link?: { r: string; s: string } | null
) {
  if (link) {
    return `/checkout/onboarding?r=${encodeURIComponent(
      link.r
    )}&s=${encodeURIComponent(link.s)}`
  }
  return ref
    ? `/checkout/onboarding?ref=${encodeURIComponent(ref)}`
    : `/checkout/onboarding?payment_id=${encodeURIComponent(paymentId ?? '')}`
}

function ManualState() {
  return (
    <Shell title="Check your email">
      <p className="mt-6 text-zinc-600 dark:text-zinc-400">
        This page has no purchase to show for this link. If you have just paid,
        your payment is safe and you do not need to pay again — the email
        confirming your purchase has the details.
      </p>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Something missing? Reply to that email and I will sort it by hand, or{' '}
        <Link href="/contact" className={linkClass}>
          get in touch
        </Link>
        .
      </p>
    </Shell>
  )
}

/* An explicit ?status=error with no paid row to show for it. Only the old
 * embed ever appended one, on the way back from a method that left the
 * page. Mirrors the deposit's return page: nothing was charged, so the one
 * useful thing is another try. */
function PaymentFailed() {
  return (
    <Shell title="That payment did not go through">
      <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Nothing was charged. You can try again from the pricing page, or get in
        touch and we will sort it out by hand.
      </p>
      <p className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/pricing" className="amw-cta inline-flex max-w-xs">
          Try again
        </Link>
        <Link
          href="/contact"
          className="hover:text-[var(--amw-accent-ink)] min-h-11 inline-flex items-center text-sm font-medium text-zinc-700 no-underline transition-colors dark:text-zinc-300"
        >
          Get in touch →
        </Link>
      </p>
    </Shell>
  )
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string | string[]
    payment_id?: string | string[]
    attempt?: string | string[]
    status?: string | string[]
    r?: string | string[]
    s?: string | string[]
  }>
}) {
  /* A repeated param arrives as an array; firstParam takes the first, so an
     array never reaches the query, the refresh URL or the status check. */
  const params = await searchParams
  const requestId = firstParam(params.r)
  const signature = firstParam(params.s)
  const attempt = Math.max(0, parseInt(firstParam(params.attempt), 10) || 0)

  /* A Creem link is trusted only once its signature checks out, and an r that
     fails it is not a bad lookup but a forged or damaged link: it gets the
     manual state, and never the Whop params that might sit beside it. */
  if (requestId && !verifyOnboardingLink(requestId, signature)) {
    return <ManualState />
  }
  const link = requestId ? { r: requestId, s: signature } : null

  /* Creem's own params ride along on the success_url, and ?status is not
     among the ones this page reads for them. */
  const ref = link ? null : validCheckoutRef(firstParam(params.ref))
  const paymentId = link ? '' : firstParam(params.payment_id)
  const status = link ? '' : firstParam(params.status)

  /* Without a valid ref there is nothing to look up first, so the URL
     decides: an explicit ?status=error says the payment failed, and "you do
     not need to pay again" would be a lie after it. */
  if (!ref && status === 'error') return <PaymentFailed />

  // Without a ref or an id the lookup can never succeed, so nothing waits.
  if (!link && !ref && !paymentId) return <ManualState />

  /* With a valid ref the page looks first, whatever the URL says: a paid
     row wins over any parameter, because a buyer who paid must never read
     "did not go through… Try again" -- that is how a kit gets paid twice. */

  let purchase: Purchase | null = null
  let loadError = false

  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: link
        ? { creemRequestId: { equals: link.r } }
        : ref
        ? { whopCheckoutRef: { equals: ref } }
        : { whopPaymentId: { equals: paymentId } },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })
    purchase = docs[0] || null
  } catch (err) {
    // A public page must degrade, never throw -- the buyer already paid.
    console.error('Onboarding purchase lookup failed', err)
    loadError = true
  }

  /* A failed lookup can neither rule out a paid row nor confirm one, so the
     URL does not get to say the payment failed, and the copy promises
     nothing either: it says what is true whether or not the buyer paid,
     points at no receipt that may not exist, and offers no second purchase
     -- a paid buyer must not be nudged into paying twice. */
  if (loadError) {
    return (
      <Shell title="Something went wrong">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          This page could not load just now. If your payment went through, you
          do not need to pay again — it can take a minute to show here.
        </p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          If your bank or card step did not finish, nothing was taken.{' '}
          <Link href={refreshHref(ref, paymentId, link)} className={linkClass}>
            Refresh the page
          </Link>{' '}
          to check again, or{' '}
          <Link href="/contact" className={linkClass}>
            get in touch
          </Link>{' '}
          and I will sort it by hand.
        </p>
      </Shell>
    )
  }

  // Only now may ?status=error decide: the ref has no paid row.
  if (status === 'error' && purchase?.status !== 'paid') {
    return <PaymentFailed />
  }

  /* Only a paid purchase is described. A revoked license is marked refunded,
     and its ref or payment id still finds the row -- so the page has to
     refuse it here, or it would go on showing the repo and account it no
     longer grants. */
  if (purchase && purchase.status !== 'paid') {
    return <ManualState />
  }

  /* No row yet: usually the webhook has not landed, but a declined or
     abandoned bank or 3DS step lands here too, and its row never comes. So
     every sentence is true either way -- nothing promises a payment or a
     receipt that may not exist -- and another try is offered only once the
     checks have run out, never while the webhook may just be late. */
  if (!purchase) {
    const manualHref = refreshHref(ref, paymentId, link)

    return (
      <Shell title="Confirming your payment">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          If your payment went through, you do not need to pay again — it can
          take a minute to show here.
        </p>
        {attempt < MAX_ATTEMPTS ? (
          <>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              This checks again automatically every few seconds.
            </p>
            <PendingRefresh
              checkoutRef={ref}
              paymentId={paymentId}
              attempt={attempt}
              keepParams={link ? { r: link.r, s: link.s } : undefined}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            If your bank or card step did not finish, nothing was taken.{' '}
            <Link href="/pricing" className={linkClass}>
              Try again
            </Link>{' '}
            from the pricing page,{' '}
            <Link href={manualHref} className={linkClass}>
              refresh the page
            </Link>{' '}
            to check once more, or{' '}
            <Link href="/contact" className={linkClass}>
              get in touch
            </Link>{' '}
            and I will sort it by hand.
          </p>
        )}
      </Shell>
    )
  }

  const itemRelation =
    purchase.item && typeof purchase.item === 'object'
      ? (purchase.item as { value?: unknown })
      : null
  const itemDoc = (
    itemRelation && typeof itemRelation.value === 'object'
      ? itemRelation.value
      : null
  ) as {
    name?: string | null
    title?: string | null
    slug?: string | null
    githubRepo?: string | null
    seats?: number | null
    id?: number | string
  } | null

  const tier = tierFromSlug(itemDoc?.slug)

  /* Not a kit: a guide, another product, a course. Nothing here delivers
     one -- the owner does, by hand -- and nothing of ours was emailed for
     it, so there is no repository, clone command, license or "it is in
     your email" to show. Only the confirmation, and the one next step. */
  if (!tier) {
    const name = itemDoc?.name || itemDoc?.title
    return (
      <Shell title="Thanks — your purchase is confirmed">
        <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {name
            ? `Delivery details for ${name} are on their way.`
            : 'Delivery details are on their way.'}
        </p>
        <NextStep tier={null} />
      </Shell>
    )
  }

  const itemName = itemDoc?.name || 'Your kit'
  const repo = purchase.githubRepo || itemDoc?.githubRepo || null
  const delivered = purchase.fulfillmentStatus === 'sent'

  /* The Whop route is unchanged: the purchase row says everything. */
  if (!link) {
    return (
      <Shell title={`${itemName} is yours`}>
        <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {delivered
            ? 'Payment received. Here is everything you need.'
            : 'One more step and the repository is in your hands.'}
        </p>

        <OnboardingSteps
          itemName={itemName}
          repo={repo}
          maskedLicenseKey={maskLicenseKey(purchase.licenseKey)}
          githubUsername={purchase.githubUsername || null}
          /* Only when a server actually exists. Everything on this page is
             either real or absent. */
          discordUrl={process.env.DISCORD_INVITE_URL || null}
          cliCommand={process.env.WAREKIT_CLI_COMMAND || null}
          tier={tier}
          delivered={delivered}
          /* The product's own limit, the same one the seat page enforces. */
          seats={seatLimit(itemDoc)}
        />

        <p className="mt-12 text-sm text-zinc-600 dark:text-zinc-400">
          Keep the link to this page. It is in your purchase email, and it is
          how you get back here.
        </p>
      </Shell>
    )
  }

  const stored = purchase.githubUsername || ''
  const unanswered = !stored && purchase.fulfillmentStatus === 'pending_invite'
  /* An invitation that failed: the account is kept, the row is still
     'pending_invite' and there is no invite link. The same account may be
     submitted again, which the action allows and nothing else. */
  const retry =
    Boolean(stored) &&
    purchase.fulfillmentStatus === 'pending_invite' &&
    !purchase.githubInviteUrl

  /* A row a person is finishing by hand. The action refuses it too, so the
     form is not offered: asking a question whose answer will be refused is
     worse than saying so. */
  if (!stored && purchase.fulfillmentStatus === 'failed') {
    return (
      <Shell title="Your payment is safe">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          {`Something went wrong setting up ${itemName} automatically. You do not need to pay again. Reply to your receipt email and I will set up your access by hand, or `}
          <Link href="/contact" className={linkClass}>
            get in touch
          </Link>
          .
        </p>
      </Shell>
    )
  }

  const setup = await creemSetup(purchase, itemDoc, unanswered)

  /* The action refuses an account that would be one past the license's limit
     (unless it already holds a seat), so a form for it is not offered. */
  const seatsFull =
    setup.members != null &&
    listSeats(setup.members).length >= setup.seats &&
    !hasSeat(setup.members, stored)
  const needsAnswer = unanswered && !seatsFull
  const canRetry = retry && !seatsFull

  return (
    <Shell title={`${itemName} is yours`}>
      {/* One report per render, with the amount Creem charged. The event id
          is the request id, so a refresh or the email link folds into the
          same sale. No email: this page can show a link, not who holds it. */}
      <TrackPurchase
        eventId={link.r}
        value={centsToValue(purchase.amount ?? 0)}
        currency={(purchase.currency || 'USD').toUpperCase()}
        contentName={itemName}
      />

      <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        {delivered
          ? 'Payment received. Here is everything you need.'
          : 'One more step and the repository is in your hands.'}
      </p>

      {(unanswered || retry) && seatsFull ? (
        <p className="mt-12 text-sm text-zinc-700 dark:text-zinc-300">
          {`This license covers ${setup.seats} ${
            setup.seats === 1 ? 'developer' : 'developers'
          } and all of them are in use, so I have not sent a repository invitation. Open the license link in your receipt email to see the options.`}
        </p>
      ) : needsAnswer ? (
        <>
          <h2 className="mt-12 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Which GitHub account should get the repository?
          </h2>
          <OnboardingGithubForm
            requestId={link.r}
            signature={link.s}
            initialUsername={setup.liteUsername}
          />
        </>
      ) : canRetry ? (
        <>
          <h2 className="mt-12 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            The invitation did not go through
          </h2>
          <OnboardingGithubForm
            requestId={link.r}
            signature={link.s}
            retryUsername={stored}
          />
        </>
      ) : (
        <OnboardingSteps
          itemName={itemName}
          repo={repo}
          maskedLicenseKey={maskLicenseKey(
            setup.licenseKey ?? purchase.licenseKey
          )}
          githubUsername={purchase.githubUsername || null}
          discordUrl={process.env.DISCORD_INVITE_URL || null}
          cliCommand={process.env.WAREKIT_CLI_COMMAND || null}
          tier={tier}
          delivered={delivered}
          seats={setup.seats}
          licenseUrl={setup.licenseUrl}
          licenseExpired={setup.licenseExpired}
        />
      )}

      <p className="mt-12 text-sm text-zinc-600 dark:text-zinc-400">
        Keep the link to this page. It is in your purchase email, and it is how
        you get back here.
      </p>
    </Shell>
  )
}

type KitDoc = {
  id?: number | string
  seats?: number | null
} | null

/* What the license adds to a Creem buyer's page: the developer count, the
   current key, the license page to end on, and the account a Lite claim on the
   same license used. All of it is a convenience. A purchase whose first attach
   failed has no license, and a lookup can fail, so every part has a fallback
   and nothing here throws at a buyer who has already paid. */
async function creemSetup(
  purchase: Purchase,
  itemDoc: KitDoc,
  unanswered: boolean
) {
  const out: {
    seats: number
    /** The license's seats, or null when there is no license to read. */
    members: Array<{ githubUsername?: string | null }> | null
    licenseKey: string | null
    licenseUrl: string | null
    licenseExpired: boolean
    liteUsername: string
  } = {
    seats: licenseLimits(null, itemDoc).seats,
    members: null,
    licenseKey: null,
    licenseUrl: null,
    licenseExpired: false,
    liteUsername: '',
  }

  let licenseId: number | string | null = null
  try {
    const payload = await getPayloadClient()
    const found = await licenseFromClaims(payload, {
      purchaseId: purchase.id,
    })
    if (found?.license) {
      licenseId = found.license.id
      out.seats = licenseLimits(found.license, found.product ?? itemDoc).seats
      out.members = found.license.seatMembers ?? []
      out.licenseKey = await currentKey(payload, found.license.id)

      if (unanswered) {
        const lite = await payload.find({
          collection: 'purchases',
          where: {
            and: [
              { license: { equals: found.license.id } },
              { grantsTier: { equals: 'lite' } },
              { status: { equals: 'paid' } },
              { githubUsername: { exists: true } },
            ],
          },
          sort: '-createdAt',
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
        out.liteUsername = lite.docs?.[0]?.githubUsername || ''
      }
    }
  } catch (err) {
    console.error('Onboarding license lookup failed', purchase.id, err)
  }

  /* The license page link is minted only once the buyer has answered, and
     only while the purchase is young. The onboarding link never expires, so
     without both limits every visit to it would hand out a fresh 30-day link.
     Past the window the step points at the resend route instead. The page
     lives at the existing seats route until it becomes the license page. */
  if (purchase.githubUsername) {
    const minted = licenseLinkFor({
      purchase,
      licenseId: licenseId ?? undefined,
      itemId: itemDoc?.id,
    })
    out.licenseUrl = minted.url
    out.licenseExpired = minted.expired
  }

  return out
}

import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { OnboardingSteps } from '@/components/commerce/OnboardingSteps'
import { NextStep } from '@/components/commerce/NextStep'
import {
  PendingRefresh,
  MAX_ATTEMPTS,
} from '@/components/commerce/PendingRefresh'
import {
  firstParam,
  maskLicenseKey,
  tierFromSlug,
} from '@/lib/commerce/onboardingDisplay'
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
 * the time this renders), so all a payment_id unlocks is a look at your own
 * purchase: the item name, the repo, a masked licence key, the GitHub
 * username on file, and one relevant next step. Never the full key, the
 * email or the amount -- those stay in the receipt only you received.
 *
 * The webhook is server-to-server and the browser redirect regularly beats
 * it, so "no purchase yet" is a normal state for the first few seconds
 * after paying, not an error: it refreshes itself a bounded number of times
 * rather than showing a 404 to someone who has just been charged.
 *
 * Only that case waits. A payment Whop reports as failed (?status=error on
 * the way back from a bank redirect) says so and offers another try; a link
 * with no payment id, or one whose purchase is no longer paid, can never
 * turn into a purchase by waiting, so it points at the email straight away.
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
 * no payment id at all (Whop gave none, so there is nothing to look up), or
 * a purchase that is no longer paid (a revoked licence is marked refunded).
 * It says nothing about any purchase -- no item, repo, key or account -- so
 * it is safe in front of whoever holds the link, and it points at the one
 * thing that always works: the purchase email and a human. */
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

/* Whop's word that the payment failed, on the way back from a method that
 * left the page. Mirrors the deposit's return page: nothing was charged, so
 * the one useful thing is another try. */
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
    payment_id?: string | string[]
    attempt?: string | string[]
    status?: string | string[]
  }>
}) {
  /* A repeated param arrives as an array; firstParam takes the first, so an
     array never reaches the query, the refresh URL or the status check. */
  const params = await searchParams
  const paymentId = firstParam(params.payment_id)
  const status = firstParam(params.status)
  const attempt = Math.max(0, parseInt(firstParam(params.attempt), 10) || 0)

  /* Before any lookup: whatever a payment id would find, Whop has just said
     this payment failed, and "you do not need to pay again" would be a lie. */
  if (status === 'error') return <PaymentFailed />

  // Without an id the lookup can never succeed, so nothing waits for it.
  if (!paymentId) return <ManualState />

  let purchase: Purchase | null = null
  let loadError = false

  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { whopPaymentId: { equals: paymentId } },
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

  if (loadError) {
    return (
      <Shell title="Something went wrong">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          This page could not load just now. Your payment is safe either way —
          refresh to try again, or reply to your receipt and I will sort it by
          hand.
        </p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/contact" className={linkClass}>
            Get in touch
          </Link>
        </p>
      </Shell>
    )
  }

  /* Only a paid purchase is described. A revoked licence is marked refunded,
     and its payment id still finds the row -- so the page has to refuse it
     here, or it would go on showing the repo and account it no longer
     grants. */
  if (purchase && purchase.status !== 'paid') {
    return <ManualState />
  }

  if (!purchase) {
    const manualHref = `/checkout/onboarding?payment_id=${encodeURIComponent(
      paymentId
    )}`

    return (
      <Shell title="Confirming your payment">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          You do not need to pay again. Your payment is safe either way, and the
          receipt in your inbox has a link back to this page.
        </p>
        {attempt < MAX_ATTEMPTS ? (
          <>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              This checks again automatically every few seconds.
            </p>
            <PendingRefresh paymentId={paymentId} attempt={attempt} />
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Still nothing after a minute or two?{' '}
            <Link href={manualHref} className={linkClass}>
              Refresh the page
            </Link>
            , reply to that receipt and I will sort it by hand, or{' '}
            <Link href="/contact" className={linkClass}>
              get in touch
            </Link>
            .
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
  } | null

  const tier = tierFromSlug(itemDoc?.slug)

  /* Not a kit: a guide, another product, a course. Nothing here delivers
     one -- the owner does, by hand -- and nothing of ours was emailed for
     it, so there is no repository, clone command, licence or "it is in
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
  const maskedLicenseKey = maskLicenseKey(purchase.licenseKey)
  const delivered = purchase.fulfillmentStatus === 'sent'

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
        maskedLicenseKey={maskedLicenseKey}
        githubUsername={purchase.githubUsername || null}
        /* Only when a server actually exists. Everything on this page is
           either real or absent. */
        discordUrl={process.env.DISCORD_INVITE_URL || null}
        cliCommand={process.env.WAREKIT_CLI_COMMAND || null}
        tier={tier}
        delivered={delivered}
      />

      <p className="mt-12 text-sm text-zinc-600 dark:text-zinc-400">
        Keep the link to this page. It is in your purchase email, and it is how
        you get back here.
      </p>
    </Shell>
  )
}

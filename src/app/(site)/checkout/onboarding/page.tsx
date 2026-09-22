import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { OnboardingSteps } from '@/components/commerce/OnboardingSteps'
import {
  PendingRefresh,
  MAX_ATTEMPTS,
} from '@/components/commerce/PendingRefresh'
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

type Tier = 'lite' | 'pro' | 'team'

/* Deliberately the slug, not the product's own `tier` select field: the
 * slug is what the checkout, the catalogue and this page all agree on, and
 * it can't drift out of sync with an admin-edited field the way a second
 * source of truth could. */
function tierFromSlug(slug: string | null | undefined): Tier {
  if (slug?.endsWith('-lite')) return 'lite'
  if (slug?.endsWith('-team')) return 'team'
  return 'pro'
}

/* Enough of the key to recognise, never enough to use. `null` rather than a
 * shorter mask when the key is too short to mask safely -- 11 is 7 kept +
 * 4 kept, so anything at or under that would show the whole thing. */
function maskLicenseKey(key: string | null | undefined): string | null {
  if (!key || key.length <= 11) return null
  return `${key.slice(0, 7)}…${key.slice(-4)}`
}

const linkClass =
  'text-teal-700 underline underline-offset-4 dark:text-teal-300'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; attempt?: string }>
}) {
  const { payment_id: paymentId = '', attempt: attemptParam = '' } =
    await searchParams
  const attempt = Math.max(0, parseInt(attemptParam, 10) || 0)

  let purchase: Purchase | null = null
  let loadError = false

  if (paymentId) {
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

  if (!purchase) {
    const manualHref = paymentId
      ? `/checkout/onboarding?payment_id=${encodeURIComponent(paymentId)}`
      : '/checkout/onboarding'

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
            <PendingRefresh paymentId={paymentId || null} attempt={attempt} />
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
    slug?: string | null
    githubRepo?: string | null
  } | null

  const itemName = itemDoc?.name || 'Your kit'
  const repo = purchase.githubRepo || itemDoc?.githubRepo || null
  const tier = tierFromSlug(itemDoc?.slug)
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

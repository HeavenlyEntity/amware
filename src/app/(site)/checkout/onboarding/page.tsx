import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyOnboardingLink } from '@/lib/commerce/onboardingLink'
import { OnboardingSteps } from '@/components/commerce/OnboardingSteps'
import { TrackPurchase } from '@/components/analytics/TrackPurchase'
import { centsToValue } from '@/lib/analytics/whop'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Set up your kit',
  robots: { index: false },
}

/*
 * Where Creem sends a buyer after payment.
 *
 * The page renders from the signed link alone and then looks for the purchase
 * the webhook created. Those two can arrive out of order: the browser redirect
 * regularly beats a server-to-server webhook, so "no purchase yet" is a normal
 * state a few seconds after paying, not an error. It says so and offers a
 * refresh, rather than showing a 404 to someone who has just been charged.
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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; s?: string }>
}) {
  const { r: requestId = '', s: signature = '' } = await searchParams

  if (!verifyOnboardingLink(requestId, signature)) {
    return (
      <Shell title="This setup link is not valid">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          Use the link in your purchase email. If you no longer have it, reply
          to your receipt and I will send a new one, or{' '}
          <Link
            href="/contact"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            get in touch
          </Link>
          .
        </p>
      </Shell>
    )
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'purchases',
    where: { creemRequestId: { equals: requestId } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  const purchase = docs[0]

  if (!purchase || purchase.status !== 'paid') {
    return (
      <Shell title="Just confirming your payment">
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          This usually takes a few seconds. Refresh the page and it should be
          here. Your payment is safe either way, and the receipt in your inbox
          has a link back to this page.
        </p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Still nothing after a minute or two? Reply to that receipt and I will
          sort it by hand.
        </p>
      </Shell>
    )
  }

  const product =
    purchase.item && typeof purchase.item === 'object'
      ? (purchase.item as { value?: unknown }).value
      : null
  const productDoc = (
    product && typeof product === 'object' ? product : null
  ) as { name?: string | null; githubRepo?: string | null } | null

  const itemName = productDoc?.name || 'Your kit'
  const repo = productDoc?.githubRepo || purchase.githubRepo || null

  return (
    <Shell title={`${itemName} is yours`}>
      {/* Only reachable past the signature and the paid check above, so the
          sale is real and the viewer is the buyer: the email can go with it. */}
      <TrackPurchase
        eventId={requestId}
        value={centsToValue(purchase.amount ?? 0)}
        currency={(purchase.currency || 'USD').toUpperCase()}
        email={purchase.email}
        contentName={itemName}
      />
      <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Payment received. One step to go and the repository is in your hands.
      </p>

      <OnboardingSteps
        requestId={requestId}
        signature={signature}
        itemName={itemName}
        repo={repo}
        licenseKey={purchase.licenseKey ?? null}
        /* Only when a server actually exists. Everything on this page is
           either real or absent. */
        discordUrl={process.env.DISCORD_INVITE_URL || null}
        cliCommand={process.env.WAREKIT_CLI_COMMAND || null}
      />

      <p className="mt-12 text-sm text-zinc-600 dark:text-zinc-400">
        Keep the link to this page. It is in your purchase email, and it is how
        you get back here.
      </p>
    </Shell>
  )
}

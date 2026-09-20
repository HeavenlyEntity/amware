import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { TrackPurchase } from '@/components/analytics/TrackPurchase'
import { centsToValue } from '@/lib/analytics/whop'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Payment received',
  robots: { index: false },
}

/* Where a download buyer lands after Creem. Delivery is the access link the
   webhook emails, so this page grants nothing and knows nothing it has to
   protect; what it does do is report the sale to the ads pixel with its real
   amount.

   The request id in the URL is unsigned, which is fine for that one job: it
   is a UUID, so it cannot be enumerated, and the worst a guessed one reveals
   is that a sale of some amount happened. The webhook can arrive after the
   browser does, so "no paid row yet" is normal for a few seconds and simply
   means no event -- the emailed receipt does not link back here, and a
   missing pixel event costs nothing a buyer would notice. No email goes with
   it: this page cannot verify who is looking, and the signed onboarding page
   is the one that can. */
async function paidPurchase(requestId) {
  if (!requestId) return null
  const payload = await getPayloadClient()
  const { docs } = await payload
    .find({
      collection: 'purchases',
      where: {
        creemRequestId: { equals: requestId },
        status: { equals: 'paid' },
      },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] }))
  return docs[0] || null
}

export default async function CheckoutSuccess({ searchParams }) {
  const { r: requestId = '' } = await searchParams
  const purchase = await paidPurchase(requestId)
  const itemName =
    purchase?.item && typeof purchase.item === 'object'
      ? purchase.item.value?.name || purchase.item.value?.title
      : undefined

  return (
    <Container className="mt-16 sm:mt-32">
      {purchase && (
        <TrackPurchase
          eventId={requestId}
          value={centsToValue(purchase.amount ?? 0)}
          currency={(purchase.currency || 'USD').toUpperCase()}
          contentName={itemName}
        />
      )}
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          Thank you — payment received
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          Check your email. For a kit it carries the link that sets up your
          repository access; for a download it carries the file. Didn&apos;t get
          it?{' '}
          <Link
            href="/access/resend"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            Resend my access link
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}

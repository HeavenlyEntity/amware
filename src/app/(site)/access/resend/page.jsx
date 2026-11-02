import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import { sendAccessLinkEmail } from '@/lib/commerce/fulfillment'

export const metadata = {
  title: 'Resend access link',
  robots: { index: false },
}

async function resendLink(formData) {
  'use server'
  const email = String(formData.get('email') || '').trim()
  if (!email) return
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { email: { equals: email } },
        { status: { equals: 'paid' } },
        { fulfillmentStatus: { not_equals: 'pending_invite' } },
        // Nothing to link to: Creem delivers digital products itself, and a
        // retainer has no access page.
        { fulfillmentStatus: { not_equals: 'not_required' } },
      ],
    },
    sort: '-createdAt',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const purchase = docs[0]
  if (purchase) {
    /* Same reason as the webhook: this threw on a missing
       ACCESS_LINK_SECRET, and the throw reached the error boundary -- so the
       one page a customer visits when delivery has already gone wrong was the
       page that broke hardest. A failure here is logged and swallowed, which
       leaves the identical no-enumeration response below. */
    const signed = tryCreateAccessToken({
      purchaseId: purchase.id,
      itemType: purchase.itemType,
      itemId:
        typeof purchase.item === 'object' && purchase.item
          ? purchase.item.value
          : purchase.item,
    })
    if (signed.ok) {
      try {
        await sendAccessLinkEmail({
          to: email,
          itemName: 'your purchase',
          token: signed.token,
        })
      } catch {
        console.error('Resend: access link email failed')
      }
    } else {
      console.error('Resend: could not sign an access link —', signed.reason)
    }
  }
  // Always behaves identically (no account enumeration).
}

export default function ResendPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
          Resend your access link
        </h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the email you purchased with. If we find a purchase, we&apos;ll
          email a fresh link. For a digital product, the download link is in
          your receipt from Creem.
        </p>
        <form action={resendLink} className="mt-6 flex gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="min-w-0 flex-auto rounded-md border border-zinc-900/10 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-teal-500 focus:outline-hidden focus:ring-4 focus:ring-teal-500/10 dark:border-zinc-700 dark:bg-zinc-700/[0.15] dark:text-zinc-200"
          />
          <Button type="submit">Send link</Button>
        </form>
      </div>
    </Container>
  )
}

import Link from 'next/link'
import { Container } from '@/components/Container'
import { CourseBody } from '@/components/site/CourseBody'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your access', robots: { index: false } }

function InvalidLink() {
  return (
    <Container className="mt-16 sm:mt-32">
      <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
        This link is invalid or expired
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Request a fresh link:{' '}
        <Link
          href="/access/resend"
          className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
        >
          resend my access link
        </Link>
        .
      </p>
    </Container>
  )
}

export default async function AccessPage({ params }) {
  const { token } = await params
  const claims = verifyAccessToken(token)
  if (!claims) return <InvalidLink />

  const payload = await getPayloadClient()
  const purchase = await payload
    .findByID({
      collection: 'purchases',
      id: claims.purchaseId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  if (!purchase || purchase.status !== 'paid') return <InvalidLink />
  if (purchase.fulfillmentStatus === 'pending_invite') {
    return (
      <Container className="mt-16 sm:mt-32">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Repository access on the way
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Your access is delivered via a GitHub repository invitation to the
            username you provided at checkout. If you haven’t received it,{' '}
            <Link
              href="/contact"
              className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
            >
              contact us
            </Link>
            .
          </p>
        </div>
      </Container>
    )
  }
  // Cross-check the token's item against what the purchase actually recorded.
  const storedItemId =
    purchase.item && typeof purchase.item === 'object'
      ? purchase.item.value
      : purchase.item
  if (String(storedItemId) !== String(claims.itemId)) return <InvalidLink />

  const collection =
    claims.itemType === 'product'
      ? 'products'
      : claims.itemType === 'course'
      ? 'courses'
      : 'services'
  const item = await payload
    .findByID({ collection, id: claims.itemId, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!item) return <InvalidLink />

  if (claims.itemType === 'course') {
    const { docs: lessons } = await payload.find({
      collection: 'lessons',
      where: { course: { equals: item.id }, status: { equals: 'published' } },
      sort: 'order',
      depth: 0,
      limit: 1000,
      overrideAccess: true,
    })
    return (
      <Container className="mt-16 sm:mt-32">
        <CourseBody course={item} lessons={lessons} />
      </Container>
    )
  }

  // product download or service package
  const fileUrl =
    item.downloadFile && typeof item.downloadFile === 'object'
      ? item.downloadFile.url
      : item.downloadUrl || null
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          {item.name || item.title}
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          Thanks for your purchase. Your access is below.
        </p>
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-8 inline-flex rounded-md bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            Download
          </a>
        ) : (
          <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
            Your purchase is confirmed. We&apos;ll follow up by email with next
            steps.
          </p>
        )}
      </div>
    </Container>
  )
}

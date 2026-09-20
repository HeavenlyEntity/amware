import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
import { listSeats, seatLimit } from '@/lib/commerce/seats'
import { SeatManager } from '@/components/commerce/SeatManager'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Your team licence',
  robots: { index: false },
}

function InvalidLink() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          This link is invalid or expired
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Seat links expire. Request a fresh one:{' '}
          <Link
            href="/access/resend"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            resend my access link
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}

export default async function SeatsPage({ params }) {
  const { token } = await params
  const claims = verifyAccessToken(token)
  if (!claims) return <InvalidLink />

  const payload = await getPayloadClient()
  const purchase = await payload
    .findByID({
      collection: 'purchases',
      id: claims.purchaseId,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!purchase || purchase.status !== 'paid') return <InvalidLink />

  const product =
    purchase.item && typeof purchase.item === 'object'
      ? purchase.item.value
      : null
  const repo = product?.githubRepo || purchase.githubRepo
  const limit = seatLimit(product)

  /* A single-seat licence has nothing to manage. Rather than rendering a
     seat page that can only ever refuse, say what they have and where it
     went -- the invitation is the product for these. */
  if (limit <= 1) {
    return (
      <Container className="mt-16 sm:mt-32">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            {product?.name || 'Your kit'}
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            This licence covers one GitHub account, and it is already assigned
            to{' '}
            <span className="font-medium">
              @{purchase.githubUsername || 'the account you gave at checkout'}
            </span>
            {repo ? (
              <>
                {' '}
                on{' '}
                <a
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
                >
                  {repo}
                </a>
              </>
            ) : null}
            .
          </p>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Need it on more accounts?{' '}
            <Link
              href="/products"
              className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
            >
              The Team licence
            </Link>{' '}
            covers five.
          </p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-xl">
        <p className="amw-kicker">team licence</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {product?.name || 'Your kit'}
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Add the GitHub accounts that should have the repository. Each one gets
          its own invitation.
        </p>

        <div className="mt-10">
          <SeatManager
            token={token}
            repo={repo}
            initialSeats={{
              used: listSeats(purchase.seatMembers),
              limit,
            }}
          />
        </div>
      </div>
    </Container>
  )
}

import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyAccessToken } from '@/lib/commerce/accessToken'
import { currentKey, licenseFromClaims } from '@/lib/commerce/licenseRecord'
import { licenseLimits, nextAction } from '@/lib/commerce/license'
import { listSeats } from '@/lib/commerce/seats'
import { LicensePanel } from '@/components/commerce/LicensePanel'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Your license',
  robots: { index: false },
}

const linkClass =
  'text-teal-700 underline underline-offset-4 dark:text-teal-300'

function Shell({ title, children }) {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="amw mx-auto max-w-xl">
        {title && (
          <h1
            className="text-2xl font-bold text-zinc-800 dark:text-zinc-100"
            style={{ fontFamily: 'Layer, sans-serif' }}
          >
            {title}
          </h1>
        )}
        {children}
      </div>
    </Container>
  )
}

function InvalidLink() {
  return (
    <Shell title="This link is invalid or expired">
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        License links expire. Request a fresh one:{' '}
        <Link href="/access/resend" className={linkClass}>
          resend my access link
        </Link>
        .
      </p>
    </Shell>
  )
}

/* A buyer is never shown a thrown error. Either the database blinked and a
   refresh may fix it, or this link reaches no license and a person has to. */
function GetInTouch({ title, children }) {
  return (
    <Shell title={title}>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        {children}{' '}
        <Link href="/contact" className={linkClass}>
          Get in touch
        </Link>{' '}
        and I will sort it out.
      </p>
    </Shell>
  )
}

export default async function LicensePage({ params }) {
  const { token } = await params
  const claims = verifyAccessToken(token)
  if (!claims) return <InvalidLink />

  let found
  let keyValue = null
  try {
    const payload = await getPayloadClient()
    found = await licenseFromClaims(payload, claims)
    if (found) keyValue = await currentKey(payload, found.license.id)
  } catch (err) {
    console.error('License page load failed', err)
    return (
      <Shell title="Your license could not be loaded">
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Nothing is wrong with the license. Refresh in a moment, or{' '}
          <Link href="/contact" className={linkClass}>
            get in touch
          </Link>{' '}
          if it keeps happening.
        </p>
      </Shell>
    )
  }

  /* An old link whose purchase never reached a license (a failed attach), or
     one that names nothing at all. */
  if (!found) {
    return (
      <GetInTouch title="I could not find this license">
        The payment is safe, but this link does not lead to a license yet.
      </GetInTouch>
    )
  }

  const { license, purchase, product } = found

  /* Every limit comes from the kit row for this stack and tier. Without it
     the page would show a limit it made up, so it says so instead. Enterprise
     has no row and takes its limits from the license. */
  if (license.tier && license.tier !== 'enterprise' && !product) {
    return (
      <GetInTouch title="I could not read this license">
        The limits for this tier did not load.
      </GetInTouch>
    )
  }

  const limits = licenseLimits(license, product)
  const accounts = license.accounts ?? []
  const action = nextAction({
    license,
    hasQuote: Boolean(license.quoteCreemProductId),
    seatsUsed: listSeats(license.seatMembers).length,
    seatLimit: limits.seats,
    accountsUsed: accounts.filter((row) => row.status !== 'over_limit').length,
    accountLimit: limits.accounts,
  })

  return (
    <Container className="mt-16 sm:mt-32">
      <div className="amw mx-auto max-w-xl">
        <LicensePanel
          token={token}
          license={license}
          product={product}
          limits={limits}
          keyValue={keyValue}
          action={action}
          repo={product?.githubRepo || purchase?.githubRepo}
        />
      </div>
    </Container>
  )
}

import Link from 'next/link'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { readAccessToken } from '@/lib/commerce/accessToken'
import {
  currentKey,
  licenseFromClaims,
  teamProductFor,
  upgradeSaleFor,
} from '@/lib/commerce/licenseRecord'
import {
  creemEnvironment,
  creemUpgradeProductIdFor,
} from '@/lib/commerce/creemEnv'
import { centsToValue } from '@/lib/analytics/whop'
import {
  kitName,
  licenseLimits,
  nextAction,
  upgradeCost,
  upgradeReturn,
} from '@/lib/commerce/license'
import { maskEmail } from '@/lib/commerce/onboardingDisplay'
import { listSeats } from '@/lib/commerce/seats'
import { LicensePanel } from '@/components/commerce/LicensePanel'
import { FreshLinkButton } from '@/components/commerce/FreshLinkButton'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Your license',
  robots: { index: false },
}

const firstParam = (value) => (Array.isArray(value) ? value[0] : value)

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

/* A link that was signed by us and has since run out. Access links last 30
   days and an upgrade usually comes months later, so this is a door rather
   than a dead end: one button that emails a fresh link to the license's
   owner. Nothing of the license is shown but the owner's address, masked,
   which is the owner's own to recognise. The address is read here only to
   mask it; the action behind the button reads it again and is what sends.

   A token can also run out during checkout, so `upgraded` still gets its
   reassurance: an expired link is not a reason to pay twice. A failed read
   keeps the door and drops only the address. */
async function expiredLink({ token, claims, upgraded }) {
  let masked = null
  try {
    const payload = await getPayloadClient()
    const found = await licenseFromClaims(payload, claims)
    // A signed link that reaches no license has nothing to email.
    if (!found) return <InvalidLink />
    masked = maskEmail(found.license.ownerEmail)
  } catch (err) {
    console.error('Expired license link lookup failed', err)
  }

  const returning = upgradeReturn(null, upgraded)?.target ?? null

  return (
    <Shell title="This link has expired">
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        {`Email a new one to ${masked ?? 'the address on the license'}.`}
      </p>
      {returning && (
        <p
          role="status"
          className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          You don&apos;t need to pay again. If you just upgraded, it shows on
          your license page once the new link opens.
        </p>
      )}
      <FreshLinkButton token={token} upgraded={returning} />
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

export default async function LicensePage({ params, searchParams }) {
  const { token } = await params

  /* A tampered link is the invalid page, before anything is read. An expired
     one that we signed is a door to a fresh link; only a live one opens the
     license. */
  const read = readAccessToken(token)
  if (read.state === 'invalid') return <InvalidLink />
  const { claims } = read

  /* Both come from the URL, so both are only wording: `upgraded` says which
     tier a buyer just paid for, `attempt` counts the page's own re-checks. */
  const query = (await searchParams) ?? {}
  const upgraded = firstParam(query.upgraded) || null
  const attempt = Math.max(0, parseInt(firstParam(query.attempt), 10) || 0)

  if (read.state === 'expired') {
    return expiredLink({ token, claims, upgraded })
  }

  let payload
  let found
  let keyValue = null
  try {
    payload = await getPayloadClient()
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
  /* The quote stays on the license after it is paid. `nextAction` puts a
     quote ahead of everything, so without this a license already on
     Enterprise would be asked to pay again. */
  const action = nextAction({
    license,
    hasQuote:
      Boolean(license.quoteCreemProductId) && license.tier !== 'enterprise',
    seatsUsed: listSeats(license.seatMembers).length,
    seatLimit: limits.seats,
    accountsUsed: accounts.filter((row) => row.status !== 'over_limit').length,
    accountLimit: limits.accounts,
  })

  /* What moving to Team costs, from the two kit rows: Team's price less
     this tier's. A failed read, a missing row, a price that is not a number
     or no upgrade product for this Creem environment leaves nothing honest to
     show, and the panel then shows no button: `startUpgrade` would only refuse
     it. That is logged, because a Pro owner who cannot find the upgrade is a
     fault here, and the rest of the license still loads. */
  let upgrade = null
  if (action.kind === 'upgrade-team') {
    try {
      const team = await teamProductFor(payload, license.stack)
      const cost = upgradeCost(product?.price, team?.price)
      const productId = creemUpgradeProductIdFor(team, creemEnvironment())
      if (cost == null || !productId) {
        console.error('No upgrade to offer', {
          license: license.id,
          hasTeamRow: Boolean(team),
          hasUpgradeProduct: Boolean(productId),
        })
      } else {
        const teamLimits = licenseLimits({ tier: 'team' }, team)
        upgrade = {
          cost,
          seats: teamLimits.seats,
          accounts: teamLimits.accounts,
          slug: team.slug,
          name: team.name,
        }
      }
    } catch (err) {
      console.error('Upgrade price lookup failed', err)
    }
  }

  /* The sale to report once an upgrade has landed: the row that paid for it,
     read here because the row on this link is usually the older sale. The
     amount is what Creem charged. It is only a report, so a failed read
     leaves the page as it is. */
  let sale = null
  const returned = upgradeReturn(license.tier, upgraded)
  if (returned?.phase === 'done') {
    try {
      const row = await upgradeSaleFor(payload, license.id, returned.target)
      if (row?.creemRequestId && row.amount > 0) {
        sale = {
          eventId: row.creemRequestId,
          value: centsToValue(row.amount),
          currency: (row.currency || 'USD').toUpperCase(),
          contentName: product?.name || kitName(license.stack) || undefined,
        }
      }
    } catch (err) {
      console.error('Upgrade sale lookup failed', err)
    }
  }

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
          upgrade={upgrade}
          upgraded={upgraded}
          attempt={attempt}
          repo={product?.githubRepo || purchase?.githubRepo}
          refunded={purchase?.status === 'refunded'}
          sale={sale}
        />
      </div>
    </Container>
  )
}

import Link from 'next/link'
import { AccountList, SeatManager } from '@/components/commerce/SeatManager'
import { LicenseKey } from '@/components/commerce/LicenseKey'
import { listSeats } from '@/lib/commerce/seats'

/* The license page, for the whole license rather than one purchase.
 *
 * Order is the point: which kit and tier, then what is used against what the
 * tier allows, then the key. Whatever the buyer can act on sits under the
 * usage it relates to. Developers are in SeatManager because that count
 * changes without a reload; the NetSuite accounts are static, so they go into
 * the same usage card as its children.
 *
 * A server component. Only the key (a button needs state) and the developer
 * form are client components, so the rest of the license -- ids, invite links,
 * Creem instance ids -- never reaches the browser. It receives plain data and
 * never reads the database, which is the page's job.
 *
 * Remove for a developer or an account lives in the same client components
 * (a Creem instance id is dropped here, before the list is handed over).
 * Other tasks add to this, so each section stands alone: the upgrade button
 * and its states, an expired link, and Enterprise. `action` is what
 * `nextAction` decided; nothing renders from it yet.
 *
 * @param {{
 *   token: string,
 *   license: {
 *     tier?: string | null,
 *     seatMembers?: Array<{ githubUsername?: string | null }> | null,
 *     accounts?: Array<{ accountId: string, status?: string | null }> | null,
 *   },
 *   product: { name?: string | null, githubRepo?: string | null } | null,
 *   limits: { seats: number, accounts: number | null },
 *   keyValue: string | null,
 *   action?: { kind: string | null, urgent: boolean } | null,
 *   repo?: string | null,
 * }} props
 */

const linkClass =
  'text-teal-700 underline underline-offset-4 dark:text-teal-300'

const TIER_LABEL = {
  lite: 'Lite',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}

function Heading({ kicker, children }) {
  return (
    <>
      <p className="amw-kicker">{kicker}</p>
      <h1
        className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl"
        style={{ fontFamily: 'Layer, sans-serif' }}
      >
        {children}
      </h1>
    </>
  )
}

export function LicensePanel({
  token,
  license,
  product,
  limits,
  keyValue,
  repo,
}) {
  if (!license?.tier) {
    return (
      <>
        <Heading kicker="license">{product?.name || 'Your kit'}</Heading>
        <p role="status" className="mt-4 text-zinc-600 dark:text-zinc-400">
          This license was refunded. If that is not what you expected,{' '}
          <Link href="/contact" className={linkClass}>
            get in touch
          </Link>
          .
        </p>
      </>
    )
  }

  const seats = listSeats(license.seatMembers)
  const tracksAccounts = limits.accounts != null
  const showsKey = license.tier !== 'lite'

  return (
    <>
      <Heading kicker={`${TIER_LABEL[license.tier] ?? license.tier} license`}>
        {product?.name || 'Your kit'}
      </Heading>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        {tracksAccounts
          ? 'The developers, NetSuite accounts and key this license covers.'
          : 'The developers this license covers.'}
      </p>

      <div className="mt-10">
        <SeatManager
          token={token}
          repo={repo ?? product?.githubRepo}
          initialSeats={{ used: seats, limit: limits.seats }}
        >
          {tracksAccounts && (
            <AccountList
              token={token}
              accounts={(license.accounts ?? []).map((row) => ({
                accountId: row.accountId,
                status: row.status,
              }))}
              limit={limits.accounts}
            />
          )}
        </SeatManager>
      </div>

      {showsKey && (
        <section className="mt-10" aria-labelledby="license-key-heading">
          <h2
            id="license-key-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your license key
          </h2>
          {keyValue ? (
            <div className="mt-3">
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                Copy it into your <code className="amw-mono">.env</code> as{' '}
                <code className="amw-mono">WAREKIT_LICENSE_KEY</code>, beside{' '}
                <code className="amw-mono">NS_ACCOUNT_ID</code>.
              </p>
              <LicenseKey keyValue={keyValue} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Get in touch for your key.{' '}
              <Link href="/contact" className={linkClass}>
                Contact me
              </Link>
              .
            </p>
          )}
        </section>
      )}
    </>
  )
}

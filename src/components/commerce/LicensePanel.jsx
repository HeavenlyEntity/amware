import Link from 'next/link'
import { AccountList, SeatManager } from '@/components/commerce/SeatManager'
import { LicenseKey } from '@/components/commerce/LicenseKey'
import { PendingRefresh } from '@/components/commerce/PendingRefresh'
import { UpgradeButton } from '@/components/commerce/UpgradeButton'
/* From the plain module, never from PendingRefresh.jsx: on the server this
   file would get a client reference for the constant, not the number. */
import { MAX_ATTEMPTS } from '@/lib/commerce/pendingRefresh'
import { upgradeReturn } from '@/lib/commerce/license'
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
 * Other tasks add to this, so each section stands alone: the upgrade action
 * and its states, an expired link, and Enterprise. `action` is what
 * `nextAction` decided.
 *
 * The one action sits between the usage and the add form, in SeatManager's
 * `afterUsage` slot. It is, in turn:
 *  - "Confirming your upgrade" while `upgraded` names a tier the license has
 *    not reached yet, with no button at all, so no one pays twice. The page
 *    checks again until `attempt` runs out, then offers a refresh and contact.
 *  - "You're on Team." once the license has reached it.
 *  - "Move to Team" for a Pro license, when `upgrade` has the numbers.
 *  - "Complete your Enterprise upgrade" when the license holds a quote and is
 *    not Enterprise yet, with the terms the quote sets. A brand new Enterprise
 *    license has no tier until this is paid, which is not a refund, so it gets
 *    the same offer instead of the refunded notice.
 *  - "Talk to me about Enterprise" for a Team license at a limit.
 * The action is the page's one teal button. The add-developer button is quiet
 * so that this is the only one, whenever there is one.
 * `upgraded` is read from the URL, which anyone can write. It only picks
 * wording, compared with the tier the database holds. It unlocks nothing.
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
 *   upgrade?: { cost: number, seats: number, accounts: number | null } | null,
 *   upgraded?: string | null,
 *   attempt?: number,
 *   repo?: string | null,
 * }} props
 */

const linkClass =
  'text-teal-700 underline underline-offset-4 dark:text-teal-300'

/* Where "Talk to me about Enterprise" goes. The kit and tier travel as ids and
   are turned into words on the far side, which only accepts the ones it knows;
   `kitEnterpriseSubject` builds the subject there. */
const enterpriseContactHref = (license) =>
  `/contact/enterprise?${new URLSearchParams({
    kit: license.stack ?? '',
    tier: license.tier ?? '',
  })}`

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

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/* What the higher tier adds, from the kit row rather than from copy. */
const gains = ({ seats, accounts }) =>
  accounts == null
    ? plural(seats, 'developer')
    : `${plural(seats, 'developer')} and ${plural(
        accounts,
        'NetSuite account'
      )}`

/* The terms of a quote, from the license's own overrides. Said only when both
   numbers are there, since half a quote is not one. */
const quoteTerms = (license) =>
  Number.isFinite(license?.seatOverride) &&
  Number.isFinite(license?.accountOverride)
    ? `Your quote covers ${gains({
        seats: license.seatOverride,
        accounts: license.accountOverride,
      })}.`
    : null

/* The Enterprise payment. It is the page's one action, so it is always the
   teal one. */
function EnterpriseQuote({ token, license }) {
  const terms = quoteTerms(license)
  return (
    <div>
      <UpgradeButton token={token} target="enterprise" urgent>
        Complete your Enterprise upgrade
      </UpgradeButton>
      {terms && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{terms}</p>
      )}
    </div>
  )
}

/* Said while a payment is on its way and again once the checks run out, so a
   buyer who has just paid is never invited to pay a second time. */
function Confirming({ token, returned, attempt }) {
  const checking = attempt < MAX_ATTEMPTS
  return (
    <div>
      <p
        role="status"
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        Confirming your upgrade. You don&apos;t need to pay again.
      </p>
      {checking ? (
        <>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            This checks again automatically every few seconds.
          </p>
          <PendingRefresh
            attempt={attempt}
            keepParams={{ upgraded: returned.target }}
          />
        </>
      ) : (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          It can take a minute to show here.{' '}
          <Link
            href={`/access/seats/${token}?upgraded=${returned.target}`}
            className={linkClass}
          >
            Refresh the page
          </Link>{' '}
          to check once more, or{' '}
          <Link href="/contact" className={linkClass}>
            get in touch
          </Link>{' '}
          and I will sort it by hand.
        </p>
      )}
    </div>
  )
}

export function LicensePanel({
  token,
  license,
  product,
  limits,
  keyValue,
  action,
  upgrade,
  upgraded,
  attempt = 0,
  repo,
}) {
  const returned = upgradeReturn(license?.tier, upgraded)

  if (!license?.tier) {
    /* A new Enterprise license has no tier until its first payment lands. A
       buyer who has just paid for it must not be told it was refunded. */
    if (returned?.phase === 'confirming') {
      return (
        <>
          <Heading kicker="license">{product?.name || 'Your kit'}</Heading>
          <div className="mt-4">
            <Confirming token={token} returned={returned} attempt={attempt} />
          </div>
        </>
      )
    }
    /* A quote on a license with no tier is a license waiting to be paid for. */
    if (action?.kind === 'enterprise-quote') {
      return (
        <>
          <Heading kicker="Enterprise quote">
            {product?.name || 'Your kit'}
          </Heading>
          <div className="mt-6">
            <EnterpriseQuote token={token} license={license} />
          </div>
        </>
      )
    }
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

  /* One action at most. A payment on its way hides the button entirely
     rather than disabling it, and so does a missing price: with no number to
     show there is nothing honest to offer. Only Pro pays the difference; the
     server refuses anyone else too. */
  let upgradeAction = null
  if (returned?.phase === 'confirming') {
    upgradeAction = (
      <Confirming token={token} returned={returned} attempt={attempt} />
    )
  } else if (returned?.phase === 'done') {
    upgradeAction = (
      <p
        role="status"
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {`You're on ${TIER_LABEL[returned.target]}.`}
      </p>
    )
  } else if (
    action?.kind === 'enterprise-quote' &&
    license.tier !== 'enterprise'
  ) {
    upgradeAction = <EnterpriseQuote token={token} license={license} />
  } else if (action?.kind === 'enterprise-contact' && license.tier === 'team') {
    upgradeAction = (
      <Link href={enterpriseContactHref(license)} className="amw-cta">
        Talk to me about Enterprise
      </Link>
    )
  } else if (
    action?.kind === 'upgrade-team' &&
    license.tier === 'pro' &&
    upgrade
  ) {
    upgradeAction = (
      <div>
        <UpgradeButton token={token} target="team" urgent={action.urgent}>
          {`Move to Team · $${upgrade.cost.toFixed(2)}`}
        </UpgradeButton>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {`Your code, repo and key stay the same. You get ${gains(upgrade)}.`}
        </p>
      </div>
    )
  }

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
          afterUsage={upgradeAction}
          focusAdd={returned?.phase === 'done'}
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

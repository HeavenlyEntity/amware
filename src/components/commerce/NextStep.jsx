import Link from 'next/link'

/* The one next step worth offering, after the buyer already has what they
 * paid for — never before, and never in the way of it.
 *
 * Lite members are shown Pro, because Lite is the architecture and Pro is
 * the implementation. Pro buyers are shown Team, for the colleagues who
 * need source access. Everyone is shown implementation help, because the
 * kit is where a NetSuite build starts, not where it ends. No urgency, no
 * invented discount: the 2026-09-11 plan rules both out. */

const UPGRADE = {
  lite: {
    title: 'Ready for the built-out kit?',
    body: 'Pro is the same architecture with the UI, NetSuite packages and updates in place.',
    cta: 'See WareKit Pro',
  },
  pro: {
    title: 'Working with a team?',
    body: 'Team covers five GitHub accounts on the same repository, with the same updates.',
    cta: 'Compare Team',
  },
}

export function NextStep({ tier }) {
  const upgrade = UPGRADE[tier]
  return (
    <aside className="mt-12 space-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      {upgrade && (
        <div>
          <h2 className="text-base font-semibold">{upgrade.title}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {upgrade.body}
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            {upgrade.cta}
          </Link>
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold">Want it built with you?</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The kit is where a NetSuite build starts. If you want help taking it
          to production, that is what an engagement is for.
        </p>
        <Link
          href="/services"
          className="mt-3 inline-block text-sm font-medium underline"
        >
          Book an intro call
        </Link>
      </div>
    </aside>
  )
}

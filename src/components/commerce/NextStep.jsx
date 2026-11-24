import { RingLink } from '@/components/site/ChevronCta'

/* The one next step worth offering, after the buyer already has what they
 * paid for — never before, and never in the way of it.
 *
 * Lite members are shown Pro, because Lite is the architecture and Pro is
 * the implementation. Pro buyers are shown Team, for the colleagues who
 * need source access. Everyone is shown implementation help, because the
 * kit is where a NetSuite build starts, not where it ends. No urgency, no
 * invented discount: the 2026-09-11 plan rules both out.
 *
 * A purchase that is not a kit has no tier (`null`), and gets implementation
 * help alone: offering Team to someone who bought a guide is an upsell for a
 * thing they never had. */

const UPGRADE = {
  lite: {
    title: 'Ready for the built-out kit?',
    body: 'Pro is the same architecture with the UI, NetSuite packages and updates in place.',
    cta: 'See WareKit Pro',
  },
  pro: {
    title: 'Working with a team?',
    body: 'Team covers five developers on the same repository, with the same updates.',
    cta: 'Compare Team',
  },
}

const CARD = 'amw-kit-card flex flex-col p-5 sm:p-6'

export function NextStep({ tier }) {
  const upgrade = tier ? UPGRADE[tier] : null
  return (
    <aside className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {upgrade && (
        <div className={CARD}>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {upgrade.title}
          </h2>
          <p className="text-[var(--amw-mut)] mt-1.5 flex-1 text-sm leading-relaxed">
            {upgrade.body}
          </p>
          <RingLink href="/pricing" className="mt-4">
            {upgrade.cta}
          </RingLink>
        </div>
      )}
      <div className={`${CARD} ${upgrade ? '' : 'sm:col-span-2'}`}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Want it built with you?
        </h2>
        <p className="text-[var(--amw-mut)] mt-1.5 flex-1 text-sm leading-relaxed">
          The kit is where a NetSuite build starts. If you want help taking it
          to production, that is what an engagement is for.
        </p>
        <RingLink href="/services" className="mt-4">
          Book an intro call
        </RingLink>
      </div>
    </aside>
  )
}

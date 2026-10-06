/* Text colours for the two grounds the terms sit on: a regular card, and a
   popular service card's deep-teal gradient (.amw-on-teal in
   storefront.css), where the text turns white. */
const TONE = {
  default: {
    lead: 'text-zinc-900 dark:text-zinc-100',
    body: 'text-zinc-600 dark:text-zinc-400',
    fine: 'text-zinc-500 dark:text-zinc-400',
  },
  popular: {
    lead: 'text-white',
    body: 'text-white/90',
    fine: 'text-white/90',
  },
}

/**
 * The same first-call value and refund line wherever a service deposit
 * appears, wrapped around the checkout action so their order cannot drift.
 *
 * Value sits immediately before the decision. The one-line risk reversal
 * sits immediately after it. On a popular card the rule and kicker follow
 * the tokens that card re-points, so only the text needs `tone`.
 */
export function DepositRiskReversal({
  children,
  className = '',
  tone = 'default',
}) {
  const t = TONE[tone] ?? TONE.default
  return (
    <div className={className}>
      <div
        role="note"
        aria-label="First call value and refund terms"
        className="border-(--amw-line) border-t pt-4"
      >
        <p className={`text-base font-medium tracking-tight ${t.lead}`}>
          Know what to fix next in 60 minutes.
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${t.body}`}>
          You leave knowing your highest-priority technical risk and the next
          move to make.
        </p>
        <p className="amw-kicker text-(--amw-accent-ink) mt-3">
          Free tool included: CTO Systems Audit Prompt
        </p>
      </div>
      <div className="mt-4">{children}</div>
      <p className={`mt-2.5 text-center text-xs leading-relaxed ${t.fine}`}>
        Full refund if we don’t work together.
      </p>
    </div>
  )
}

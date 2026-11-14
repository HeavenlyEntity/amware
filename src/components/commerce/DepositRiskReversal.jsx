/* Text colours for the two grounds the terms sit on: a regular card, and a
   popular service card's deep-teal gradient (.amw-on-teal in
   storefront.css), where the text turns white. */
export const TONE = {
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
 * The same terms wherever a service deposit is taken
 * directly ("Reserve your start", for a service with no Cal.com link),
 * wrapped around the checkout action so their order cannot drift. A Cal.com
 * link books the free intro call instead, under IntroCallTerms.
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
        aria-label="Deposit terms"
        className="border-(--amw-line) border-t pt-4"
      >
        <p className={`text-base font-medium tracking-tight ${t.lead}`}>
          Hold your start with a deposit.
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${t.body}`}>
          The amount shows in the checkout before anything is charged.
        </p>
      </div>
      <div className="mt-4">{children}</div>
      <p className={`mt-2.5 text-center text-xs leading-relaxed ${t.fine}`}>
        Credited in full to month one, or returned before work begins.
      </p>
    </div>
  )
}

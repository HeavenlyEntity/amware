/**
 * The same first-call value and refund line wherever a service deposit
 * appears, wrapped around the checkout action so their order cannot drift.
 *
 * Value sits immediately before the decision. The one-line risk reversal
 * sits immediately after it.
 */
export function DepositRiskReversal({ children, className = '' }) {
  return (
    <div className={className}>
      <div
        role="note"
        aria-label="First call value and refund terms"
        className="border-(--amw-line) border-t pt-4"
      >
        <p className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
          Know what to fix next in 60 minutes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          You leave knowing your highest-priority technical risk and the next
          move to make.
        </p>
        <p className="amw-kicker text-(--amw-accent-ink) mt-3">
          Free tool included: CTO Systems Audit Prompt
        </p>
      </div>
      <div className="mt-4">{children}</div>
      <p className="mt-2.5 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Full refund if we don’t work together.
      </p>
    </div>
  )
}

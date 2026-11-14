import { TONE } from './DepositRiskReversal'
import { FreeEbook } from './free-ebook'

/**
 * What the free intro call is, wrapped around its booking button wherever a
 * service's Cal.com link appears. Same layout and tones as
 * DepositRiskReversal, which it replaced when both calls became free
 * (owner decision 2026-11-13): the only deposit left is the Codebase
 * Diagnostic's, taken after the strategy call, so nothing here mentions one.
 * The free ebook box under the copy is what booking earns (FreeEbook).
 */
export function IntroCallTerms({ children, className = '', tone = 'default' }) {
  const t = TONE[tone] ?? TONE.default
  return (
    <div className={className}>
      <div
        role="note"
        aria-label="What the intro call is"
        className="border-(--amw-line) border-t pt-4"
      >
        <p className={`text-base font-medium tracking-tight ${t.lead}`}>
          Start with a free 15-minute call.
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${t.body}`}>
          A quick hello to see whether we’re a fit, before you pay for anything.
        </p>
        <FreeEbook tone={t} />
      </div>
      <div className="mt-4">{children}</div>
      <p className={`mt-2.5 text-center text-xs leading-relaxed ${t.fine}`}>
        Intro call · 15 min · free
      </p>
    </div>
  )
}

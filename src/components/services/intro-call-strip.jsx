import { TONE } from '@/components/commerce/DepositRiskReversal'
import { FreeEbook } from '@/components/commerce/free-ebook'
import { SERVICES_PAGE } from '@/content/site/services-page'

/**
 * The intro call's terms and the free ebook, said once above the retainer
 * cards (owner decision 2026-11-13). Each card used to carry the same note
 * and ebook box, about 280px of every card; now the cards keep only their
 * button and fine print, and all three fit one screen.
 *
 * Copy on the left, the ebook box on the right from tablet width; stacked
 * on a phone.
 */
export function IntroCallStrip() {
  const { lead, body } = SERVICES_PAGE.introStrip
  const t = TONE.default
  return (
    <div
      role="note"
      aria-label="Intro call terms for every retainer"
      className="bg-[var(--amw-card)] ring-[var(--amw-line)] mb-4 grid items-center gap-5 rounded-2xl p-5 ring-1 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-8 md:p-6"
    >
      <div>
        <p className={`text-lg font-medium tracking-tight ${t.lead}`}>{lead}</p>
        <p className={`mt-1.5 max-w-[46ch] text-sm leading-relaxed ${t.body}`}>
          {body}
        </p>
      </div>
      <FreeEbook tone={t} className="fe--flush" />
    </div>
  )
}

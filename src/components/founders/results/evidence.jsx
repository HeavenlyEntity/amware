'use client'

import { fmtMoney, fmtPct, fmtPts } from '@/components/founders/format'

/* The proof behind the range: what moved it from the benchmark band. The
   band figure and the gap sentence now live on the verdict card, so this is
   the three adjustment rows as a mono list, under "The fine print". */

const INSTRUMENT_LABELS = {
  options: 'options',
  restricted_stock: 'restricted stock',
  unsure: 'instrument not sure',
}

export function Evidence({ read }) {
  const { adjustments, inputs, band } = read
  return (
    <section aria-labelledby="results-evidence">
      <h3 id="results-evidence" className="amw-wz-kicker">
        Evidence
      </h3>
      <dl className="amw-mono text-[var(--wz-ink-2)] mt-4 space-y-2 text-sm">
        <Row
          label="benchmark band"
          value={`${fmtPct(band.lo)}–${fmtPct(band.hi)} · ${band.label}`}
        />
        <Row
          label="banked work"
          value={
            adjustments.banked.applied
              ? `≈ ${fmtMoney(adjustments.banked.dollars)} → ${fmtPts(
                  adjustments.banked.pts
                )}`
              : 'n/a (salaried)'
          }
        />
        <Row
          label="salary"
          value={
            adjustments.salary.applied
              ? `${fmtMoney(Math.abs(adjustments.salary.gap))} ${
                  adjustments.salary.gap >= 0 ? 'below' : 'above'
                } market → ${fmtPts(adjustments.salary.pts)}`
              : 'not entered'
          }
        />
        <Row
          label="terms"
          value={`${inputs.vestingYears}-yr vest · ${
            inputs.cliffMonths
          }-mo cliff · ${
            INSTRUMENT_LABELS[inputs.instrument] ?? INSTRUMENT_LABELS.unsure
          }`}
        />
      </dl>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="border-[var(--wz-edge)] flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-dashed pb-2">
      <dt className="text-[var(--amw-mut)]">{label}</dt>
      <dd className="m-0 text-right tabular-nums">{value}</dd>
    </div>
  )
}

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { compareTable } from '@/lib/commerce/kitEditions'
import { Reveal } from './reveal'

const recClass = (i, rec) => (i === rec ? 'pr-col-rec' : undefined)

export function CompareTable({ family, states }) {
  const {
    family: heading,
    head,
    rec,
    rows,
    notes,
    enterprise,
  } = compareTable(family, states)
  return (
    <section aria-labelledby="pr-cmp-title" className="pj-wrap pj-section">
      <Reveal>
        <p className="pj-kicker">03 · Compare</p>
        <h2 id="pr-cmp-title" className="pj-h2">
          Only the differences that matter.
        </h2>
      </Reveal>
      <Reveal
        delay={0.1}
        className="pr-table-wrap"
        role="region"
        aria-labelledby="pr-cmp-title"
        tabIndex={0}
      >
        <table className="pr-table">
          <thead>
            <tr>
              <th scope="col" className="pr-table-corner">
                <span className="pj-kicker">{heading}</span>
              </th>
              {head.map((label, i) => (
                <th key={label} scope="col" className={recClass(i, rec)}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">
                  {row.label}
                  {row.note && (
                    <small className="pr-row-note">{row.note}</small>
                  )}
                </th>
                {row.cells.map(({ value, hi }, i) => (
                  <td key={head[i]} className={recClass(i, rec)} data-hi={hi}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
      <Reveal delay={0.15} className="pr-after">
        {notes.length > 0 && (
          <ul className="pr-after-notes">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {/* No price here, and the quiet action: teal belongs to the buy
            button, and Enterprise is a conversation. */}
        <div className="pr-enterprise">
          <p>{enterprise.lead}</p>{' '}
          <Link href={enterprise.href} className="pr-cta" data-tone="quiet">
            {enterprise.cta}
            <i aria-hidden="true">
              <ChevronRight width={14} height={14} strokeWidth={2.5} />
            </i>
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

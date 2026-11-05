'use client'

import { Check } from 'lucide-react'

import '@/styles/founders-wizard.css'
import { PackIcon } from '@/components/icon-pack'

/*
 * The live rail beside the wizard (board `.eq-railcard`) and its unlock
 * checklist (board `.pi-xp` / `.eq-need`).
 *
 * RailCard: an `aside` named by `title`, with the title as a kicker and a
 *   static "Live" status on the right (the dot does not pulse).
 *   Props: { title, children, className, as }
 *
 * RailChecklist: "{n} of {total} unlocked", an XP bar, and one row per step
 *   still to answer, each with an icon-pack tile and a check that fills when
 *   done. Rows not done yet may carry a mono `note` (e.g. "step 2").
 *   The shimmer on the bar and the ring on a fresh unlock are CSS animations,
 *   so the site's motion switch stops them.
 *   Props: { title = 'Your read', items: [{ id, label, icon, done, note? }],
 *     className, children (rendered after the rows) }
 */

export function RailCard({ title, children, className = '', as = 'aside' }) {
  const Tag = as
  return (
    <Tag
      aria-label={as === 'aside' ? title : undefined}
      className={`amw-wz-railcard ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="amw-wz-kicker">{title}</p>
        <span className="amw-wz-live">Live</span>
      </div>
      {children}
    </Tag>
  )
}

export function RailChecklist({
  title = 'Your read',
  items,
  className = '',
  children,
}) {
  const done = items.filter((item) => item.done).length
  const total = items.length
  const xp = total > 0 ? `${(done / total) * 100}%` : '0%'
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="amw-wz-kicker">{title}</p>
        <p className="amw-wz-kicker amw-wz-kicker--accent">
          {done} of {total} unlocked
        </p>
      </div>
      <div className="amw-wz-xp" aria-hidden="true" style={{ '--xp': xp }}>
        <i />
      </div>
      <ul role="list" className="amw-wz-needs">
        {items.map((item) => (
          <li
            key={item.id}
            className="amw-wz-need"
            data-done={item.done ? 'true' : undefined}
          >
            <span className="amw-wz-need-badge" aria-hidden="true">
              {item.icon && <PackIcon name={item.icon} size={20} />}
            </span>
            <span className="amw-wz-need-label">
              {item.label}
              <span className="sr-only">
                {item.done ? ', done' : ', still to answer'}
              </span>
            </span>
            {!item.done && item.note && (
              <span className="amw-wz-need-note">{item.note}</span>
            )}
            <span className="amw-wz-need-ico" aria-hidden="true">
              <Check className="size-3" strokeWidth={3.5} />
            </span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}

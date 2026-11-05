'use client'

import '@/styles/founders-offer.css'
import { RailCard, RailChecklist } from '@/components/founders/wizard/rail'
import { Badge } from '@/components/founders/wizard/badge'
import { CLASS_LABELS, fmtMoney, fmtPct } from '@/components/founders/format'
import { INDUSTRY_OPTIONS, OFFER_STEPS } from '@/lib/founders/offer-steps'

/*
 * "Your ask so far", the Offer board's live rail: what is known, the class
 * badge (or the cash bucket while the class is pending), the target, the
 * three rungs, and the checklist of what is still to answer. The desktop
 * column and the body of the phone sheet.
 *
 * Every figure is the engine's `computeAsk`, recomputed on every answer, so
 * the rail can never disagree with the results it previews.
 *
 * BEFORE A CLASS EXISTS (spec fork F4). The target is shown muted and
 * labelled "Possible" until the classification stops pending: a confident
 * number at display weight for a seat the engine has not read yet is the
 * "confident wrong answer" the hydration gate exists to prevent.
 *
 * TEAL (spec fork F2). The target row is dominant by weight, not by fill;
 * teal stays on the live dot, the class badge and the checklist.
 */

/* TODO(alec): the board says "Hire rate so far"; the engine's own word for
   the non-founding bucket is "market rate" (`ask.labels.bucket`), so the rail
   says that. Pick one term for the whole desk. */
const bucketText = (ask) =>
  ask
    ? `${ask.labels.bucket[0].toUpperCase()}${ask.labels.bucket.slice(
        1
      )} so far`
    : 'No read yet'

export function offerKnownLine({ read, store, step }) {
  const industry = INDUSTRY_OPTIONS.find((o) => o.value === store.industry)
  return [
    read.labels.role ?? '—',
    step >= 2 ? read.labels.stage ?? '—' : '—',
    step >= 2 ? industry?.short ?? '—' : '—',
  ].join(' · ')
}

/* The checklist: a step counts once it is behind the reader, and the offer
   step as soon as the engine can compare an offer (either mode). */
export function offerChecklist({ ask, step }) {
  return OFFER_STEPS.filter((s) => s.pending).map((s) => ({
    id: s.id,
    label: s.pending,
    icon: s.railIcon,
    note: `step ${s.index}`,
    done: step > s.index || (s.id === 'offer' && Boolean(ask?.offer)),
  }))
}

export function OfferRail({ read, ask, store, step, className = '' }) {
  const { classification } = read
  const pending = classification.pending
  const target = ask?.target ?? null

  return (
    <RailCard title="Your ask so far" className={className}>
      <p className="amw-mono text-[var(--wz-ink-2)] mt-3.5 text-xs">
        {offerKnownLine({ read, store, step })}
      </p>
      <div className="mt-3.5 min-h-[26px]">
        {pending ? (
          <Badge quiet pop={false}>
            {bucketText(ask)}
          </Badge>
        ) : (
          <Badge>{CLASS_LABELS[classification.class] ?? '?'}</Badge>
        )}
      </div>

      {target && (
        <>
          <p className="amw-wz-kicker mt-4">
            {pending ? 'Possible aim' : target.label}
          </p>
          <p
            className="amw-jo-rail-aim"
            data-pending={pending ? 'true' : undefined}
          >
            <span
              key={`${target.cash}-${target.equityPct}`}
              className="amw-wz-pop"
            >
              {fmtMoney(target.cash)} <span aria-hidden="true">+</span>{' '}
              <span className="sr-only">and</span> {fmtPct(target.equityPct)}
            </span>
          </p>
          <ul
            role="list"
            aria-label="The ladder so far"
            className="amw-jo-mini"
          >
            {ask.order.map((id) => (
              <li
                key={id}
                className="amw-jo-mini-row"
                data-main={id === 'target' ? 'true' : undefined}
              >
                <span>{ask[id].label}</span>
                <b>
                  {fmtMoney(ask[id].cash)} · {fmtPct(ask[id].equityPct)}
                </b>
              </li>
            ))}
          </ul>
        </>
      )}

      <RailChecklist items={offerChecklist({ ask, step })} className="mt-4" />
    </RailCard>
  )
}

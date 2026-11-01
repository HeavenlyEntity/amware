import React from 'react'
import type { Where } from 'payload'

import { getPayloadClient } from '@/lib/getPayloadClient'

/*
 * The numbers above the Purchases list.
 *
 * Free claims and paid orders share one collection, which is right -- both
 * are a kit delivered to a GitHub account, and both need the same invitation
 * to be chased when it fails. But it means the list alone cannot answer
 * "how many Lite kits went out this week", because a free claim and a $999
 * licence look identical until you read the amount column.
 *
 * `amount` is the discriminator: 0 is a free claim, anything else is a sale.
 * Creem never sees the free ones, and never sees the GitHub account on any of
 * them, so this is the only place the whole picture exists.
 *
 * Awaiting invite is first on purpose. It is the only number here that is a
 * job rather than a statistic: every one of those is a person who has been
 * promised repository access and does not have it yet.
 */

const WINDOW_DAYS = 7
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

type Stat = {
  label: string
  value: string
  note?: string
  urgent?: boolean
}

export const PurchaseLedger = async () => {
  let stats: Stat[] = []

  try {
    const payload = await getPayloadClient()
    /* A server component renders once per request, on the server, and "the
       last seven days" has to mean the seven days before this request. The
       purity rule guards a client component re-rendering to a different
       answer, which cannot happen here. */
    // eslint-disable-next-line react-hooks/purity
    const since = new Date(Date.now() - WINDOW_MS).toISOString()

    const count = async (where: Where) =>
      (
        await payload.find({
          collection: 'purchases',
          where,
          limit: 0,
          depth: 0,
          overrideAccess: true,
        })
      ).totalDocs

    /* Paid rows are fetched rather than counted because the total has to be
       summed, and there is no aggregate in the Local API. Capped: past a few
       thousand orders this wants a real query, and a wrong number here would
       be worse than no number. */
    /* Sandbox rows are Whop or Creem test payments, kept so the flow can be
       checked end to end; they are money in no sense. Rows written before
       the fields existed have no value and are real. */
    const notSandbox = {
      and: [
        {
          or: [
            { whopEnvironment: { not_equals: 'sandbox' } },
            { whopEnvironment: { exists: false } },
          ],
        },
        {
          or: [
            { creemEnvironment: { not_equals: 'sandbox' } },
            { creemEnvironment: { exists: false } },
          ],
        },
      ],
    }
    const paid = await payload.find({
      collection: 'purchases',
      where: {
        and: [
          { status: { equals: 'paid' } },
          { amount: { greater_than: 0 } },
          notSandbox,
        ],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })

    const revenue = paid.docs.reduce(
      (sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0),
      0
    )

    const [pending, failed, free, freeRecent, paidRecent] = await Promise.all([
      count({ fulfillmentStatus: { equals: 'pending_invite' } }),
      count({ fulfillmentStatus: { equals: 'failed' } }),
      count({ amount: { equals: 0 } }),
      count({
        and: [
          { amount: { equals: 0 } },
          { createdAt: { greater_than: since } },
        ],
      }),
      count({
        and: [
          { amount: { greater_than: 0 } },
          { createdAt: { greater_than: since } },
          notSandbox,
        ],
      }),
    ])

    stats = [
      {
        label: 'Awaiting invite',
        value: String(pending),
        note: pending ? 'each one is owed repo access' : 'nothing outstanding',
        urgent: pending > 0,
      },
      {
        label: 'Free claims',
        value: String(free),
        note: `${freeRecent} in the last ${WINDOW_DAYS} days`,
      },
      {
        label: 'Paid orders',
        value: String(paid.totalDocs),
        note: `${paidRecent} in the last ${WINDOW_DAYS} days`,
      },
      {
        label: 'Revenue',
        value: money(revenue),
        note:
          paid.totalDocs > paid.docs.length
            ? `first ${paid.docs.length} orders`
            : 'all time, before fees',
      },
    ]

    if (failed > 0) {
      stats.splice(1, 0, {
        label: 'Failed delivery',
        value: String(failed),
        note: 'paid, nothing sent',
        urgent: true,
      })
    }
  } catch {
    // The list is the point; a broken summary must not take it down with it.
    return null
  }

  return (
    <section className="amware-admin-ledger">
      <p className="amware-admin-kicker">{'// DELIVERY LEDGER'}</p>
      <dl className="amware-admin-ledger__grid">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`amware-admin-ledger__stat${
              s.urgent ? ' amware-admin-ledger__stat--urgent' : ''
            }`}
          >
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
            {s.note && <p>{s.note}</p>}
          </div>
        ))}
      </dl>
    </section>
  )
}

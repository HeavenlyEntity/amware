import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { PurchaseLedger } from '@/components/admin/PurchaseLedger'

let find

/* Answers the count queries from the `where` they carry, so the number shown
   is whatever the query actually asks the database for. */
beforeEach(() => {
  find = vi.fn(({ where, limit }) =>
    Promise.resolve({
      docs: [],
      totalDocs:
        limit === 0 && JSON.stringify(where).includes('pending_invite') ? 3 : 0,
    })
  )
  getPayloadClient.mockResolvedValue({ find })
})

describe('PurchaseLedger awaiting invite', () => {
  it('counts only pending rows that name an account', async () => {
    render(await PurchaseLedger())

    const pendingQuery = find.mock.calls
      .map(([arg]) => arg.where)
      .find((where) => JSON.stringify(where).includes('pending_invite'))

    expect(pendingQuery).toEqual({
      and: [
        { fulfillmentStatus: { equals: 'pending_invite' } },
        { githubUsername: { exists: true } },
        { githubUsername: { not_equals: '' } },
      ],
    })
    expect(screen.getByText('Awaiting invite').nextSibling).toHaveTextContent(
      '3'
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/warekit/standard-edition', () => ({
  StandardEdition: () => null,
}))

import StandardEditionPage from '../standard/page'

const props = async () => (await StandardEditionPage()).props.children.props

const freeLite = {
  slug: 'warekit-next-netsuite-lite',
  stack: 'next-netsuite',
  tier: 'lite',
  type: 'boilerplate',
  price: 0,
  status: 'published',
  whopPlanId: 'plan_secret',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})

describe('/products/standard', () => {
  it('passes both true when a free edition is on sale', async () => {
    payload.find.mockResolvedValue({ docs: [freeLite] })
    expect(await props()).toEqual({ anyOnSale: true, liteFree: true })
  })

  it('passes liteFree false when only a paid edition is on sale', async () => {
    payload.find.mockResolvedValue({
      docs: [
        {
          slug: 'warekit-next-netsuite-pro',
          stack: 'next-netsuite',
          tier: 'pro',
          type: 'boilerplate',
          price: 499,
          seats: 1,
          status: 'published',
          whopPlanId: 'plan_secret',
        },
      ],
    })
    expect(await props()).toEqual({ anyOnSale: true, liteFree: false })
  })

  it('passes false when every edition is still a draft', async () => {
    payload.find.mockResolvedValue({
      docs: [{ ...freeLite, status: 'draft' }],
    })
    expect(await props()).toEqual({ anyOnSale: false, liteFree: false })
  })

  it('reads the same NetSuite rows as /products', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    await props()
    expect(payload.find.mock.calls[0][0]).toMatchObject({
      collection: 'products',
      where: {
        line: { equals: 'warekit' },
        edition: { equals: 'netsuite' },
      },
    })
  })

  it('claims nothing when the query fails', async () => {
    payload.find.mockRejectedValue(new Error('column does not exist'))
    expect(await props()).toEqual({ anyOnSale: false, liteFree: false })
  })

  it('claims nothing when Payload will not start', async () => {
    payload.client.mockRejectedValue(new Error('no database'))
    expect(await props()).toEqual({ anyOnSale: false, liteFree: false })
  })
})

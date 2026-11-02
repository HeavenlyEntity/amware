import { beforeEach, describe, expect, it, vi } from 'vitest'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/warekit/netsuite-edition', () => ({
  NetsuiteEdition: () => null,
}))

import ProductsPage from '../page'

const states = async () => (await ProductsPage()).props.children.props.states

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})

describe('/products', () => {
  it('reads NetSuite kits without a status filter', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    await states()
    expect(payload.find.mock.calls[0][0]).toMatchObject({
      collection: 'products',
      where: {
        line: { equals: 'warekit' },
        edition: { equals: 'netsuite' },
      },
    })
    expect(payload.find.mock.calls[0][0].where.status).toBeUndefined()
  })

  // Review Focus 2
  it('passes only the reduced shape', async () => {
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
          githubRepo: 'org/private',
          description: 'draft words',
        },
      ],
    })
    const passed = await states()
    expect(passed['next-pro'].state).toBe('ready')
    expect(JSON.stringify(passed)).not.toMatch(
      /plan_secret|private|draft words/
    )
  })

  it('renders with {} when the query fails', async () => {
    payload.find.mockRejectedValue(new Error('column does not exist'))
    expect(await states()).toEqual({})
  })

  it('renders with {} when Payload will not start', async () => {
    payload.client.mockRejectedValue(new Error('no database'))
    expect(await states()).toEqual({})
  })
})

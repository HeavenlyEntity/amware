import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/warekit/standard-edition', () => ({
  StandardEdition: () => null,
}))
vi.mock('@/components/analytics/TrackView', () => ({
  TrackView: () => null,
}))

import StandardEditionPage, { metadata } from '../standard/page'
import { StandardEdition } from '@/components/warekit/standard-edition'
import { TrackView } from '@/components/analytics/TrackView'

/* The props the page hands StandardEdition, found by component in the tree
   it returns. */
const childrenOf = (node) => [node?.props?.children].flat().filter(Boolean)
function find(node, type) {
  if (!node || typeof node !== 'object') return null
  if (node.type === type) return node
  for (const child of childrenOf(node)) {
    const hit = find(child, type)
    if (hit) return hit
  }
  return null
}
const render = async () => StandardEditionPage()
const props = async () => find(await render(), StandardEdition).props

const CLOSED = {
  open: false,
  pro: { state: 'planned', price: null, slug: null },
  team: { state: 'planned', price: null, slug: null },
}

const freeLite = {
  slug: 'warekit-next-netsuite-lite',
  line: 'warekit',
  edition: 'netsuite',
  stack: 'next-netsuite',
  tier: 'lite',
  type: 'boilerplate',
  price: 0,
  status: 'published',
  creemProductId: 'prod_secret',
}
const paidPro = {
  slug: 'warekit-next-netsuite-pro',
  line: 'warekit',
  edition: 'netsuite',
  stack: 'next-netsuite',
  tier: 'pro',
  type: 'boilerplate',
  price: 499,
  seats: 1,
  status: 'published',
  creemProductId: 'prod_secret',
}
const standardPro = {
  slug: 'warekit-standard-pro',
  line: 'warekit',
  edition: 'standard',
  stack: 'standard',
  tier: 'pro',
  type: 'boilerplate',
  price: 149,
  status: 'published',
  githubRepo: 'amware/warekit-standard',
  creemProductId: 'prod_live_pro',
  creemSandboxProductId: 'prod_test_pro',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('NEXT_PUBLIC_CREEM_ENV', '')
  vi.stubEnv('CREEM_ENV', '')
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/products/standard', () => {
  it('reads every WareKit row in one query', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    await props()
    expect(payload.find).toHaveBeenCalledTimes(1)
    expect(payload.find.mock.calls[0][0]).toEqual({
      collection: 'products',
      where: { line: { equals: 'warekit' } },
      depth: 0,
      limit: 100,
    })
  })

  it('opens the presale for a deliverable Standard row', async () => {
    payload.find.mockResolvedValue({ docs: [freeLite, standardPro] })
    const { presale } = await props()
    expect(presale).toEqual({
      open: true,
      pro: { state: 'ready', price: 149, slug: 'warekit-standard-pro' },
      team: { state: 'planned', price: null, slug: null },
    })
  })

  it('sells the row only through the Creem environment the checkout uses', async () => {
    vi.stubEnv('CREEM_ENV', 'sandbox')
    payload.find.mockResolvedValue({
      docs: [{ ...standardPro, creemSandboxProductId: null }],
    })
    expect((await props()).presale).toEqual(CLOSED)
  })

  it('splits the rows by edition', async () => {
    /* Each row is complete for the other reader, but filed under the wrong
       edition, so neither counts it. */
    payload.find.mockResolvedValue({
      docs: [
        { ...freeLite, edition: 'standard' },
        { ...standardPro, edition: 'netsuite' },
      ],
    })
    expect(await props()).toEqual({
      anyOnSale: false,
      liteFree: false,
      presale: CLOSED,
    })
  })

  it('keeps the two NetSuite claims it made before', async () => {
    /* A free edition on sale: both true. */
    payload.find.mockResolvedValue({ docs: [freeLite] })
    expect(await props()).toMatchObject({ anyOnSale: true, liteFree: true })

    /* Only a paid edition on sale: available, nothing free. */
    payload.find.mockResolvedValue({ docs: [paidPro] })
    expect(await props()).toMatchObject({ anyOnSale: true, liteFree: false })

    /* Every edition still a draft: nothing claimed. */
    payload.find.mockResolvedValue({
      docs: [{ ...freeLite, status: 'draft' }],
    })
    expect(await props()).toMatchObject({ anyOnSale: false, liteFree: false })
  })

  it('renders a closed presale when the query fails', async () => {
    payload.find.mockRejectedValue(new Error('column does not exist'))
    expect(await props()).toEqual({
      anyOnSale: false,
      liteFree: false,
      presale: CLOSED,
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('renders a closed presale when Payload will not start', async () => {
    payload.client.mockRejectedValue(new Error('no database'))
    expect(await props()).toEqual({
      anyOnSale: false,
      liteFree: false,
      presale: CLOSED,
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('counts the view and describes the kit', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    expect(find(await render(), TrackView).props).toEqual({
      type: 'boilerplate',
      id: 'warekit-standard',
      name: 'WareKit Standard',
    })
    expect(metadata.description).toBe(
      'A Next.js starter for people building with an AI agent. Accounts, teams, payments and AI are wired on day one, and the rules are checks the build has to pass.'
    )
  })
})

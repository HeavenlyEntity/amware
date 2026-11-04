import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Relative imports and mocks for the three things that reach the outside
   world: the CMS, Creem, and Next's redirect. The token is signed and
   verified for real, because "only the token and the target come from the
   form" is the property worth testing. */
vi.mock('../../getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('../creem', () => ({
  createCheckoutSession: vi.fn(),
  CreemError: class CreemError extends Error {
    constructor(message, status) {
      super(message)
      this.name = 'CreemError'
      this.status = status
    }
  },
}))
// The real redirect throws; the stand-in does too, so nothing after it runs.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { getPayloadClient } from '../../getPayloadClient'
import { CreemError, createCheckoutSession } from '../creem'
import { redirect } from 'next/navigation'
import { createAccessToken } from '../accessToken'
import { startUpgrade } from '../licenseUpgrade'
import { expectedProductIds, licenseIdFrom } from '../licenseRecord'

const STACK = 'next-netsuite'

const proRow = {
  id: 6,
  slug: 'warekit-next-netsuite-pro',
  stack: STACK,
  tier: 'pro',
  status: 'published',
  price: 499,
}
const teamRow = {
  id: 7,
  slug: 'warekit-next-netsuite-team',
  stack: STACK,
  tier: 'team',
  status: 'published',
  price: 999,
  creemUpgradeProductId: 'prod_upgrade_live',
  creemUpgradeSandboxProductId: 'prod_upgrade_test',
}

const ALREADY_TEAM = "You're already on Team."
const NOTHING_CHARGED = 'Nothing was charged. Try again or get in touch.'

/* The database as the action sees it: one license, the purchase that opened
   it, and the kit rows. `find` answers the way Payload does for the `and`
   queries the action makes, matching on stack and tier. */
function world({
  license = {},
  products = [proRow, teamRow],
  purchase = { id: 42, license: 9 },
} = {}) {
  const rows = {
    licenses: { id: 9, tier: 'pro', stack: STACK, ...license },
    purchases: purchase,
  }
  const find = vi.fn(async ({ collection, where }) => {
    if (collection !== 'products') return { docs: [] }
    const clauses = Object.assign(
      {},
      ...where.and.map((clause) => {
        const [field, test] = Object.entries(clause)[0]
        return { [field]: test.equals }
      })
    )
    return {
      docs: products.filter(
        (row) =>
          row.stack === clauses.stack &&
          row.tier === clauses.tier &&
          (clauses.status == null || row.status === clauses.status)
      ),
    }
  })
  const findByID = vi.fn(async ({ collection, id }) => {
    const row = rows[collection]
    if (!row || row.id !== id) {
      throw Object.assign(new Error('Not Found'), { status: 404 })
    }
    return row
  })
  getPayloadClient.mockResolvedValue({ find, findByID })
  return { find, findByID }
}

const token = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 6,
    ...claims,
  }).token

const form = (fields) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const run = (fields = {}) =>
  startUpgrade(
    { error: null },
    form({ token: token(), target: 'team', ...fields })
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
  process.env.CREEM_WEBHOOK_SECRET = 'test-webhook-secret'
  process.env.ACCESS_LINK_SECRET = 'upgrade-test-secret'
  delete process.env.ACCESS_TOKEN_SECRET
  delete process.env.CREEM_ENV
  delete process.env.NEXT_PUBLIC_CREEM_ENV
  createCheckoutSession.mockResolvedValue({
    checkoutUrl: 'https://creem.io/pay/upgrade',
  })
})

describe('startUpgrade: Pro to Team', () => {
  it('starts a Pro to Team checkout at the upgrade product', async () => {
    world()
    const tok = token()
    await expect(
      startUpgrade({ error: null }, form({ token: tok, target: 'team' }))
    ).rejects.toThrow('NEXT_REDIRECT:https://creem.io/pay/upgrade')

    expect(redirect).toHaveBeenCalledWith('https://creem.io/pay/upgrade')
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
    const args = createCheckoutSession.mock.calls[0][0]
    expect(args.productId).toBe('prod_upgrade_live')
    expect(args.metadata).toEqual({
      itemType: 'product',
      itemId: '7',
      slug: 'warekit-next-netsuite-team',
      licenseId: '9',
      upgrade: 'team',
    })
    // The buyer comes back to the license page, never to onboarding: an
    // upgrade row needs no invitation, so onboarding would wait forever.
    expect(args.successUrl).toBe(
      `https://example.com/access/seats/${tok}?upgraded=team`
    )
    expect(args.successUrl).not.toContain('onboarding')
    expect(args.requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('uses the Team row of the same stack as the item', async () => {
    const otherStackTeam = {
      ...teamRow,
      id: 70,
      stack: 'react-netsuite',
      slug: 'warekit-react-netsuite-team',
      creemUpgradeProductId: 'prod_other_stack',
    }
    world({ products: [otherStackTeam, proRow, teamRow] })
    await expect(run()).rejects.toThrow('NEXT_REDIRECT')
    const args = createCheckoutSession.mock.calls[0][0]
    expect(args.metadata.itemId).toBe('7')
    expect(args.productId).toBe('prod_upgrade_live')
  })

  it('reads the license, never the form, for who is upgrading', async () => {
    const { findByID } = world()
    // A forged licenseId and itemId in the form are not read.
    await expect(
      run({ licenseId: '999', itemId: '1', price: '1' })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(createCheckoutSession.mock.calls[0][0].metadata.licenseId).toBe('9')
    expect(findByID.mock.calls.every(([arg]) => arg.id !== 999)).toBe(true)
  })

  it('uses the sandbox upgrade product when Creem is in sandbox', async () => {
    process.env.CREEM_ENV = 'sandbox'
    world({ license: { creemEnvironment: 'sandbox' } })
    await expect(run()).rejects.toThrow('NEXT_REDIRECT')
    expect(createCheckoutSession.mock.calls[0][0].productId).toBe(
      'prod_upgrade_test'
    )
  })

  it('refuses when the license is already on the target tier', async () => {
    world({ license: { tier: 'team' } })
    await expect(run()).resolves.toEqual({
      error: { message: ALREADY_TEAM },
    })
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a license above Team the same way', async () => {
    world({ license: { tier: 'enterprise' } })
    await expect(run()).resolves.toEqual({
      error: { message: ALREADY_TEAM },
    })
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it.each([
    ['Lite', 'lite'],
    ['a refunded', null],
  ])(
    'refuses %s license: the difference is not their price',
    async (_n, tier) => {
      world({ license: { tier } })
      const result = await run()
      expect(result.error.message).toMatch(/nothing was charged/i)
      expect(createCheckoutSession).not.toHaveBeenCalled()
    }
  )

  it('refuses a bad token', async () => {
    world()
    for (const bad of ['', 'not.a.token', `${token()}x`]) {
      const result = await run({ token: bad })
      expect(result.error.message).toMatch(/no longer valid/i)
    }
    expect(getPayloadClient).not.toHaveBeenCalled()
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a target that is not team or enterprise', async () => {
    world()
    for (const target of ['pro', 'lite', '', 'free', 'constructor']) {
      const result = await run({ target })
      expect(result.error.message).toMatch(/nothing was charged/i)
    }
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses when the stack has no Team row', async () => {
    world({ products: [proRow] })
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a Team row with no upgrade product in this environment', async () => {
    world({
      products: [proRow, { ...teamRow, creemUpgradeProductId: '' }],
    })
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a license from the other Creem world', async () => {
    // The webhook would refuse to attach the purchase, after it was paid.
    world({ license: { creemEnvironment: 'sandbox' } })
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('says nothing was charged when the database cannot be read', async () => {
    getPayloadClient.mockRejectedValue(new Error('connection refused'))
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(result.error.message).not.toMatch(/connection refused/)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('says the link is invalid when the token leads to no license', async () => {
    world({ purchase: { id: 41, license: 9 } })
    const result = await run()
    expect(result.error.message).toMatch(/no longer valid/i)
  })

  it('returns "Nothing was charged" when Creem fails', async () => {
    world()
    createCheckoutSession.mockRejectedValue(
      new CreemError('Creem checkout failed (500)', 500)
    )
    await expect(run()).resolves.toEqual({
      error: { message: NOTHING_CHARGED },
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('says the same when Creem cannot be reached at all', async () => {
    world()
    createCheckoutSession.mockRejectedValue(new TypeError('fetch failed'))
    await expect(run()).resolves.toEqual({
      error: { message: NOTHING_CHARGED },
    })
  })

  it('says nothing was charged when the site url is not configured', async () => {
    world()
    delete process.env.NEXT_PUBLIC_SITE_URL
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('says nothing was charged when the webhook secret is missing', async () => {
    // Without it every webhook is rejected, so a payment would go unrecorded.
    world()
    delete process.env.CREEM_WEBHOOK_SECRET
    const result = await run()
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })
})

describe('startUpgrade: Enterprise', () => {
  const quoted = { quoteCreemProductId: 'prod_quote' }

  it('uses the quote product for enterprise', async () => {
    world({ license: { tier: 'team', ...quoted } })
    const tok = token()
    await expect(
      startUpgrade({ error: null }, form({ token: tok, target: 'enterprise' }))
    ).rejects.toThrow('NEXT_REDIRECT')
    const args = createCheckoutSession.mock.calls[0][0]
    expect(args.productId).toBe('prod_quote')
    // The Team row of the same stack is the item, so the webhook's stack
    // check passes.
    expect(args.metadata).toEqual({
      itemType: 'product',
      itemId: '7',
      slug: 'warekit-next-netsuite-team',
      licenseId: '9',
      upgrade: 'enterprise',
    })
    expect(args.successUrl).toBe(
      `https://example.com/access/seats/${tok}?upgraded=enterprise`
    )
  })

  it('works for a new Enterprise license that has no tier yet', async () => {
    world({ license: { tier: null, ...quoted }, purchase: null })
    await expect(
      startUpgrade(
        { error: null },
        form({
          token: token({ purchaseId: null, licenseId: 9 }),
          target: 'enterprise',
        })
      )
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(createCheckoutSession.mock.calls[0][0].productId).toBe('prod_quote')
  })

  it('refuses a license with no quote', async () => {
    world({ license: { tier: 'team' } })
    const result = await run({ target: 'enterprise' })
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a quote that belongs to the other Creem world', async () => {
    world({
      license: { ...quoted, creemEnvironment: 'sandbox' },
    })
    const result = await run({ target: 'enterprise' })
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses gracefully when the stack has no Team row', async () => {
    world({ license: { ...quoted }, products: [proRow] })
    const result = await run({ target: 'enterprise' })
    expect(result.error.message).toMatch(/nothing was charged/i)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('does not need the Team upgrade product', async () => {
    world({
      license: { ...quoted },
      products: [proRow, { ...teamRow, creemUpgradeProductId: '' }],
    })
    await expect(run({ target: 'enterprise' })).rejects.toThrow('NEXT_REDIRECT')
  })

  it('refuses a license that is already Enterprise', async () => {
    world({ license: { tier: 'enterprise', ...quoted } })
    const result = await run({ target: 'enterprise' })
    expect(result.error.message).toBe("You're already on Enterprise.")
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns "Nothing was charged" when Creem fails', async () => {
    world({ license: { ...quoted } })
    createCheckoutSession.mockRejectedValue(new CreemError('gone', 404))
    await expect(run({ target: 'enterprise' })).resolves.toEqual({
      error: { message: NOTHING_CHARGED },
    })
  })
})

/* The two ends of an upgrade never meet in a unit test, and a key renamed on
   one side fails only on a real payment. So the action's real output goes
   through the same functions the webhook reads it with. */
describe('startUpgrade output, read the way the webhook reads it', () => {
  const quoted = { tier: 'team', quoteCreemProductId: 'prod_quote' }

  const checkout = async (fields, license) => {
    world({ license })
    await expect(run(fields)).rejects.toThrow('NEXT_REDIRECT')
    return createCheckoutSession.mock.calls[0][0]
  }
  const webhookView = ({ productId, metadata }, license, env) => ({
    licenseId: licenseIdFrom(metadata.licenseId),
    expected: expectedProductIds({
      item: teamRow,
      license: { id: 9, stack: STACK, ...license },
      upgrade: metadata.upgrade,
      env,
    }),
    productId,
    itemId: metadata.itemId,
    itemType: metadata.itemType,
  })

  it.each([
    ['production', 'prod_upgrade_live'],
    ['sandbox', 'prod_upgrade_test'],
  ])('lines a Team upgrade up in %s', async (env, productId) => {
    process.env.CREEM_ENV = env
    const license = { tier: 'pro', creemEnvironment: env }

    const seen = webhookView(await checkout({}, license), license, env)

    expect(seen.productId).toBe(productId)
    expect(seen.expected).toEqual([productId])
    expect(seen.licenseId).toBe(9)
    expect(seen.itemId).toBe(String(teamRow.id))
    expect(seen.itemType).toBe('product')
  })

  it.each(['production', 'sandbox'])(
    'lines an Enterprise quote up in %s',
    async (env) => {
      process.env.CREEM_ENV = env
      const license = { ...quoted, creemEnvironment: env }

      const session = await checkout({ target: 'enterprise' }, license)
      const seen = webhookView(session, license, env)

      expect(session.metadata.upgrade).toBe('enterprise')
      expect(seen.productId).toBe('prod_quote')
      expect(seen.expected).toEqual(['prod_quote'])
      expect(seen.licenseId).toBe(9)
      expect(seen.itemId).toBe(String(teamRow.id))
    }
  )
})

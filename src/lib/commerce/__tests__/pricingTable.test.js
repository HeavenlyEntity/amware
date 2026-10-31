import { describe, expect, it } from 'vitest'

/* Relative import: the engine project defines no `@/` alias, and this module
   reaches nothing. */
import {
  buildPricingTable,
  cta,
  highlights,
  popularId,
  priceLabel,
  seatLine,
} from '../pricingTable'

const kit = (over = {}) => ({
  id: 1,
  name: 'A kit',
  slug: 'a-kit',
  stack: 'next-netsuite',
  tier: 'pro',
  price: 499,
  seats: 1,
  type: 'boilerplate',
  whopPlanId: 'plan_x',
  ...over,
})

describe('priceLabel', () => {
  it('says Free for exactly zero', () => {
    expect(priceLabel(kit({ price: 0 }))).toBe('Free')
  })

  it('says Soon when no price is set, rather than $0', () => {
    // A kit with no price is unfinished. Rendering it as free would give it
    // away; rendering $NaN would be worse.
    expect(priceLabel(kit({ price: undefined }))).toBe('Soon')
    expect(priceLabel(kit({ price: null }))).toBe('Soon')
  })

  it('drops the cents, because every price here is whole dollars', () => {
    expect(priceLabel(kit({ price: 499 }))).toBe('$499')
    expect(priceLabel(kit({ price: 999 }))).toBe('$999')
  })
})

describe('seatLine', () => {
  it('matches MakerKit’s framing for a single seat', () => {
    expect(seatLine(kit({ seats: 1 }))).toBe('Access for 1 user (only you)')
  })

  it('counts collaborators above one', () => {
    expect(seatLine(kit({ seats: 5 }))).toBe('Up to 5 collaborators')
  })

  /* The page must never promise more seats than the seat page enforces, and
     the seat rules treat a missing limit as one. These two have to agree. */
  it('treats a missing seat count as one, never as unlimited', () => {
    expect(seatLine(kit({ seats: null }))).toMatch(/1 user/)
    expect(seatLine(kit({ seats: 0 }))).toMatch(/1 user/)
    expect(seatLine(kit({ seats: undefined }))).toMatch(/1 user/)
  })
})

describe('cta', () => {
  it('offers a free kit without needing a Whop plan', () => {
    expect(cta(kit({ price: 0, whopPlanId: null }))).toEqual({
      label: 'Get it free',
      live: true,
      soon: false,
    })
  })

  it('marks a paid kit with nothing behind it as in development', () => {
    /* It still belongs on the table -- hiding it makes the stack look
       half-finished -- but the checkout could not complete and there is no
       repository to invite anyone to, so it must never say Buy. */
    expect(cta(kit({ whopPlanId: null }))).toEqual({
      label: 'In development',
      live: false,
      soon: true,
    })
  })

  it('offers a paid kit that has a Whop plan', () => {
    expect(cta(kit())).toEqual({
      label: 'Buy this kit',
      live: true,
      soon: false,
    })
  })

  it('does not treat a Creem id as a way to buy a kit', () => {
    expect(cta(kit({ whopPlanId: null, creemProductId: 'prod_x' })).live).toBe(
      false
    )
  })

  it('reads the sandbox plan only when the environment asks for it', () => {
    const sandboxOnly = kit({ whopPlanId: null, whopSandboxPlanId: 'plan_sbx' })
    expect(cta(sandboxOnly).live).toBe(false)
  })

  it('never marks a free kit as coming soon, plan or not', () => {
    // Free needs nothing to charge against; it is claimable today.
    expect(cta(kit({ price: 0, whopPlanId: null })).soon).toBe(false)
  })
})

describe('highlights', () => {
  it('drops blank bullets rather than rendering empty rows', () => {
    expect(
      highlights(
        kit({
          pricingHighlights: [
            { highlight: 'One' },
            { highlight: '' },
            { highlight: '   ' },
            {},
            { highlight: 'Two' },
          ],
        })
      )
    ).toEqual(['One', 'Two'])
  })

  it('handles a kit with none at all', () => {
    expect(highlights(kit({ pricingHighlights: null }))).toEqual([])
  })
})

describe('popularId', () => {
  it('picks the one marked popular', () => {
    expect(popularId([kit({ id: 1 }), kit({ id: 2, popular: true })])).toBe(2)
  })

  it('picks only the first, so marking everything marks nothing special', () => {
    expect(
      popularId([kit({ id: 1, popular: true }), kit({ id: 2, popular: true })])
    ).toBe(1)
  })

  it('is null when nothing is marked', () => {
    expect(popularId([kit()])).toBeNull()
  })
})

describe('buildPricingTable', () => {
  const catalogue = [
    kit({ id: 1, stack: 'next-netsuite', tier: 'team', price: 999, seats: 5 }),
    kit({ id: 2, stack: 'next-netsuite', tier: 'lite', price: 0 }),
    kit({ id: 3, stack: 'next-netsuite', tier: 'pro' }),
    kit({ id: 4, stack: 'react-netsuite', tier: 'lite', price: 0 }),
  ]

  it('orders tiers lite, pro, team however the rows arrived', () => {
    const [next] = buildPricingTable(catalogue)
    expect(next.tiers.map((t) => t.tier)).toEqual(['lite', 'pro', 'team'])
  })

  it('puts the stack with more tiers first, by fixed order not by count', () => {
    // Deliberate: the order is editorial, so it lives in the code, not in
    // whatever the database happened to return.
    expect(buildPricingTable(catalogue).map((s) => s.stack)).toEqual([
      'next-netsuite',
      'react-netsuite',
    ])
  })

  it('renders a stack that only has some tiers', () => {
    const [, react] = buildPricingTable(catalogue)
    expect(react.tiers).toHaveLength(1)
  })

  it('drops a stack with nothing published', () => {
    expect(
      buildPricingTable([kit({ stack: 'next-netsuite', tier: 'pro' })])
    ).toHaveLength(1)
  })

  /* A kit missing its stack or tier is a missing field in the admin, not a
     pricing decision. Guessing a column for it would look like a bug in the
     prices. */
  it('leaves out a kit with no stack or tier rather than guessing', () => {
    const table = buildPricingTable([
      kit({ id: 9, stack: null, tier: 'pro' }),
      kit({ id: 10, stack: 'next-netsuite', tier: null }),
      kit({ id: 11, stack: 'next-netsuite', tier: 'lite', price: 0 }),
    ])
    expect(table).toHaveLength(1)
    expect(table[0].tiers.map((t) => t.id)).toEqual([11])
  })

  it('returns nothing for an empty catalogue', () => {
    expect(buildPricingTable([])).toEqual([])
  })
})

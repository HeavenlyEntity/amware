import { describe, expect, it } from 'vitest'

import {
  BUILDING_CHOICES,
  STANDARD_STACK,
  buildingAnswer,
  standardPresale,
  standardRowReady,
} from '../standardPresale'

function row(over = {}) {
  return {
    status: 'published',
    type: 'boilerplate',
    stack: 'standard',
    tier: 'pro',
    slug: 'warekit-standard-pro',
    price: 149,
    githubRepo: 'amwaredotdev/warekit-standard',
    creemProductId: 'prod_live',
    creemSandboxProductId: 'prod_test',
    seats: over.tier === 'team' ? 5 : 1,
    ...over,
  }
}

/* Each way a published Standard row can fail to be deliverable. */
const NOT_READY = [
  ['no repository', { githubRepo: '' }],
  ['a missing repository', { githubRepo: undefined }],
  ['a price of 0', { price: 0 }],
  ['no price', { price: null }],
  ['a price that is a string', { price: '149' }],
  ['a price that is not finite', { price: Infinity }],
  ['a slug that is null', { slug: null }],
  [
    'a slug the onboarding page reads as another tier',
    { slug: 'warekit-standard-team' },
  ],
  ['a slug that is not a kit', { slug: 'standard-pro' }],
  ['a NetSuite stack', { stack: 'next-netsuite' }],
  ['a product type that is not a kit', { type: 'digital' }],
  ['no Creem product for this environment', { creemProductId: null }],
  ['a whitespace-only repository', { githubRepo: '   ' }],
  ['a numeric Creem product id', { creemProductId: 123 }],
  ['an object Creem product id', { creemProductId: {} }],
  ['a boolean Creem product id', { creemProductId: true }],
  ['a blank Creem product id', { creemProductId: '  ' }],
  ['a slug with a suffix', { slug: 'warekit-standard-pro-early' }],
  ['another stack’s slug', { slug: 'warekit-next-netsuite-pro' }],
  ['only a Whop plan id', { creemProductId: null, whopPlanId: 'plan_1' }],
  [
    'a repository given as a URL',
    { githubRepo: 'https://github.com/amwaredotdev/warekit-standard' },
  ],
  ['a repository with no owner', { githubRepo: 'warekit-standard' }],
  ['a Pro row with five seats', { seats: 5 }],
  ['a missing seat count', { seats: undefined }],
  ['a seat count that is a string', { seats: '1' }],
  ['a fractional seat count', { seats: 1.5 }],
  ['a padded Creem product id', { creemProductId: ' prod_live ' }],
]

/* The Team tier promises five developers, so its row must say exactly 5. */
const TEAM_NOT_READY = [
  ['a Team row with one seat', { seats: 1 }],
  ['a Team row with no seat count', { seats: undefined }],
  ['a Team row with six seats', { seats: 6 }],
]

const closed = {
  open: false,
  pro: { state: 'planned', price: null, slug: null },
  team: { state: 'planned', price: null, slug: null },
}

describe('standardPresale', () => {
  it('names the stack and the building choices', () => {
    expect(STANDARD_STACK).toBe('standard')
    expect(BUILDING_CHOICES.map((c) => c.id)).toEqual([
      'ai-product',
      'team-saas',
      'membership',
      'other',
    ])
  })

  it('is closed with nothing to show for no rows, undefined, or drafts', () => {
    expect(standardPresale([], 'production')).toEqual(closed)
    expect(standardPresale(undefined, 'production')).toEqual(closed)
    expect(standardPresale([row({ status: 'draft' })], 'production')).toEqual(
      closed
    )
  })

  it('opens for a deliverable Pro row and reports its price and slug', () => {
    expect(standardPresale([row()], 'production').pro).toEqual({
      state: 'ready',
      price: 149,
      slug: 'warekit-standard-pro',
    })
  })

  it('sells one tier while the other waits', () => {
    const state = standardPresale(
      [
        row(),
        row({ tier: 'team', slug: 'warekit-standard-team', status: 'draft' }),
      ],
      'production'
    )
    expect(state.open).toBe(true)
    expect(state.pro.state).toBe('ready')
    expect(state.team).toEqual({ state: 'planned', price: null, slug: null })
  })

  it('sells the Team tier from its own row', () => {
    const state = standardPresale(
      [row({ tier: 'team', slug: 'warekit-standard-team', price: 399 })],
      'production'
    )
    expect(state.open).toBe(true)
    expect(state.pro.state).toBe('planned')
    expect(state.team).toEqual({
      state: 'ready',
      price: 399,
      slug: 'warekit-standard-team',
    })
  })

  it.each([
    ['a ready Pro row', {}, true],
    ['a ready Team row', { tier: 'team', slug: 'warekit-standard-team' }, true],
    ['a draft', { status: 'draft' }, false],
    [
      'a tier that is not sold',
      { tier: 'lite', slug: 'warekit-standard-lite' },
      false,
    ],
    ...NOT_READY.map(([name, over]) => [name, over, false]),
  ])(
    'standardRowReady agrees with standardPresale for %s',
    (_name, over, ready) => {
      const candidate = row(over)
      expect(standardRowReady(candidate, 'production')).toBe(ready)
      const tier = candidate.tier === 'team' ? 'team' : 'pro'
      expect(
        standardPresale([candidate], 'production')[tier].state === 'ready'
      ).toBe(ready)
    }
  )

  it('standardRowReady follows the environment and survives junk', () => {
    const sandboxOnly = row({ creemProductId: null })
    expect(standardRowReady(sandboxOnly, 'sandbox')).toBe(true)
    expect(standardRowReady(sandboxOnly, 'production')).toBe(false)
    for (const junk of [null, undefined, 7, 'x']) {
      expect(standardRowReady(junk, 'production')).toBe(false)
    }
  })

  it.each(NOT_READY)('does not sell a row with %s', (_name, over) => {
    expect(standardPresale([row(over)], 'production').pro.state).toBe('planned')
  })

  it.each(TEAM_NOT_READY)('does not sell %s', (_name, over) => {
    const candidate = row({
      tier: 'team',
      slug: 'warekit-standard-team',
      ...over,
    })
    expect(standardRowReady(candidate, 'production')).toBe(false)
    expect(standardPresale([candidate], 'production').team.state).toBe(
      'planned'
    )
  })

  it('does not sell a padded sandbox id in the sandbox', () => {
    const padded = row({ creemSandboxProductId: 'prod_test ' })
    expect(standardRowReady(padded, 'sandbox')).toBe(false)
    expect(standardRowReady(padded, 'production')).toBe(true)
  })

  it('sells a repository written with surrounding spaces, as the invite trims it', () => {
    expect(
      standardRowReady(
        row({ githubRepo: ' amwaredotdev/warekit-standard ' }),
        'production'
      )
    ).toBe(true)
  })

  it('sells a row with both a Whop plan id and a Creem id', () => {
    const state = standardPresale([row({ whopPlanId: 'plan_1' })], 'production')
    expect(state.pro.state).toBe('ready')
  })

  it('rejects a wrong-typed sandbox id in the sandbox', () => {
    const bad = row({ creemSandboxProductId: 5 })
    expect(standardPresale([bad], 'sandbox').pro.state).toBe('planned')
    expect(standardPresale([bad], 'production').pro.state).toBe('ready')
  })

  it('follows the Creem environment', () => {
    const sandboxOnly = row({ creemProductId: null })
    expect(standardPresale([sandboxOnly], 'sandbox').pro.state).toBe('ready')
    expect(standardPresale([sandboxOnly], 'production').pro.state).toBe(
      'planned'
    )
  })

  it('treats a malformed entry as not ready and does not throw', () => {
    const state = standardPresale([null, 7, 'x', row()], 'production')
    expect(state.pro.state).toBe('ready')
  })

  it('is closed when rows is not an array', () => {
    expect(standardPresale(null, 'production')).toEqual(closed)
    expect(standardPresale({ docs: [row()] }, 'production')).toEqual(closed)
    expect(standardPresale('rows', 'production')).toEqual(closed)
  })

  it('reports the first ready row for a tier', () => {
    const state = standardPresale(
      [row({ price: 149, slug: 'warekit-standard-pro' }), row({ price: 99 })],
      'production'
    )
    expect(state.pro).toEqual({
      state: 'ready',
      price: 149,
      slug: 'warekit-standard-pro',
    })
  })

  it('skips an unready row to reach a later ready one', () => {
    const state = standardPresale(
      [row({ githubRepo: '' }), row({ price: 99 })],
      'production'
    )
    expect(state.pro.price).toBe(99)
  })

  it('returns only the three plan fields, so nothing else can leak', () => {
    const state = standardPresale(
      [row({ creemProductId: 'secret', githubRepo: 'private/repo' })],
      'production'
    )
    expect(Object.keys(state).sort()).toEqual(['open', 'pro', 'team'])
    expect(Object.keys(state.pro).sort()).toEqual(['price', 'slug', 'state'])
    expect(JSON.stringify(state)).not.toContain('secret')
    expect(JSON.stringify(state)).not.toContain('private/repo')
  })
})

describe('buildingAnswer', () => {
  it('accepts only the listed answers', () => {
    expect(buildingAnswer('team-saas')).toBe('team-saas')
    for (const bad of ['', 'x', null, undefined, 7, '<script>'])
      expect(buildingAnswer(bad)).toBeNull()
  })
})

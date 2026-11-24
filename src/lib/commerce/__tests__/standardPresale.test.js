import { describe, expect, it } from 'vitest'

import {
  BUILDING_CHOICES,
  STANDARD_STACK,
  buildingAnswer,
  standardPresale,
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
    ...over,
  }
}

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
  ])('does not sell a row with %s', (_name, over) => {
    expect(standardPresale([row(over)], 'production').pro.state).toBe('planned')
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
      [
        row({ price: 149, slug: 'warekit-standard-pro' }),
        row({ price: 99, slug: 'warekit-standard-pro-early' }),
      ],
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

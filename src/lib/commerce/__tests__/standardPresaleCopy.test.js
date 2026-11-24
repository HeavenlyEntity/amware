import { describe, expect, it } from 'vitest'
import { KIT_TREE, PAYMENTS, STACKS } from '../../../content/site/warekit'
import { PRESALE } from '../../../content/site/standard-presale'
import { BRAND_ICONS } from '../../../components/warekit/standard/brand-icons'

describe('Standard presale copy', () => {
  it('offers five data layers and five payment providers', () => {
    expect(STACKS.map((s) => s.id)).toEqual([
      'supabase',
      'drizzle',
      'prisma',
      'manifest',
      'appwrite',
    ])
    expect(PAYMENTS.map((p) => p.id)).toEqual([
      'creem',
      'stripe',
      'dodo',
      'polar',
      'whop',
    ])
  })
  it('puts the two picks in the tree and marks only them new', () => {
    const tree = KIT_TREE('drizzle', 'polar')
    expect(tree.filter((l) => l.isNew).map((l) => l.path)).toEqual([
      'packages/data/drizzle/',
      'packages/billing/polar/',
    ])
    expect(tree).toHaveLength(10)
  })
  it('names Lemon Squeezy once, as not supported', () => {
    const text = JSON.stringify(PRESALE)
    expect(text.match(/Lemon Squeezy/g)).toHaveLength(1)
    expect(PRESALE.picker.lemon).toMatch(/not supported/)
  })
  it('holds the approved figures and no others', () => {
    expect(PRESALE.founding.fallback).toEqual({ pro: 149, team: 299 })
    expect(PRESALE.founding.regular).toEqual({ pro: 299, team: 599 })
    expect(PRESALE.founding.seats).toBe(50)
  })
  it('has a value for every plan in every comparison row', () => {
    for (const group of PRESALE.founding.groups)
      for (const row of group.rows) expect(row.values).toHaveLength(3)
  })
  it('keeps the counts the board draws', () => {
    expect(PRESALE.pains.items).toHaveLength(6)
    expect(PRESALE.ships.items).toHaveLength(6)
    expect(PRESALE.guards.items).toHaveLength(6)
    expect(PRESALE.waves.columns).toHaveLength(4)
    expect(PRESALE.faqs.items).toHaveLength(5)
  })
  it('carries no placeholder, no NetSuite and no straight apostrophe', () => {
    const text = JSON.stringify(PRESALE)
    expect(text).not.toMatch(/\[WAVE|TODO|netsuite|demo data/i)
    expect(text).not.toMatch(/[a-z]'[a-z]/i)
  })
  it('keys every wave icon to a brand icon', () => {
    for (const col of PRESALE.waves.columns)
      for (const icon of col.icons ?? [])
        expect(BRAND_ICONS[icon.icon]).toBeDefined()
  })
  it('makes no price-lock or popularity claim', () => {
    expect(JSON.stringify(PRESALE)).not.toMatch(
      /kept for good|keep that price|most pick/i
    )
  })
  it('marks only the Manifest icon as a stroke icon', () => {
    const stroked = Object.entries(BRAND_ICONS).filter(([, v]) => v.stroke)
    expect(stroked.map(([k]) => k)).toEqual(['file'])
  })
})

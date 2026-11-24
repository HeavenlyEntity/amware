import { describe, expect, it } from 'vitest'

import { kitStory, storyFor } from '@/content/site/warekit'

/* The content module's lookups. A product with no story must get null, so
   the page renders none of the illustrated sections for it. */
describe('storyFor', () => {
  it('finds every Next tier', () => {
    for (const tier of ['lite', 'pro', 'team']) {
      expect(storyFor('next-netsuite', tier)).toBe(
        kitStory['next-netsuite'][tier]
      )
    }
  })

  it('has no story for the React kits, which have no facts written yet', () => {
    for (const tier of ['lite', 'pro', 'team']) {
      expect(storyFor('react-netsuite', tier)).toBeNull()
    }
  })

  it('returns null for anything that is not a stack and a tier', () => {
    expect(storyFor(null, 'pro')).toBeNull()
    expect(storyFor('next-netsuite', null)).toBeNull()
    expect(storyFor(undefined, undefined)).toBeNull()
    expect(storyFor('next-netsuite', 'enterprise')).toBeNull()
    expect(storyFor('a-guide', 'pro')).toBeNull()
  })

  it('never treats an object key as a story', () => {
    expect(storyFor('constructor', 'pro')).toBeNull()
    expect(storyFor('next-netsuite', 'constructor')).toBeNull()
    expect(storyFor('next-netsuite', '__proto__')).toBeNull()
  })
})

describe('kitStory', () => {
  const lite = storyFor('next-netsuite', 'lite')
  const pro = storyFor('next-netsuite', 'pro')
  const team = storyFor('next-netsuite', 'team')

  it('explains the session layers on Pro and Team only', () => {
    expect(pro.layers.items).toHaveLength(4)
    expect(team.layers).toBe(pro.layers)
    expect(lite.layers).toBeNull()
  })

  it('states NetSuite’s limit as the kit docs do', () => {
    expect(pro.layers.copy).toContain(
      '15 concurrent requests on Service Tier 1, plus 10 per SuiteCloud Plus licence'
    )
  })

  it('shows the repository each tier actually ships', () => {
    expect(pro.repo.name).toBe('amwaredotdev/warekit-next-netsuite')
    expect(team.repo.name).toBe(pro.repo.name)
    expect(lite.repo.name).toBe('amwaredotdev/warekit-next-netsuite-lite')
    const names = (story) => story.repo.tree.map((row) => row.name)
    expect(names(pro)).toContain('netsuite-sessions/')
    expect(names(lite)).not.toContain('netsuite-sessions/')
  })

  it('uses the README’s three quick-start commands everywhere', () => {
    for (const story of [lite, pro, team]) {
      expect(story.quickStart.commands).toEqual([
        'pnpm install',
        'cp .env.example .env',
        'pnpm dev',
      ])
    }
  })

  it('keeps the roadmap paragraph on the editions it describes', () => {
    expect(pro.roadmap).toMatch(/the rest|roadmap/)
    expect(team.roadmap).toBe(pro.roadmap)
    expect(lite.roadmap).toBeNull()
  })

  it('has no license-key card for Lite, which has no key', () => {
    expect(lite.next.key).toBeNull()
    expect(pro.next.key.title).toBe('Add your key')
  })
})

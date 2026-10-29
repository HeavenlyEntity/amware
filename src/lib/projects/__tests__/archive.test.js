import { describe, expect, it } from 'vitest'
import { projects } from '../../../content/site/projects'
import {
  countByKind,
  filterArchive,
  heroStats,
  matchesQuery,
  timelineYears,
} from '../archive'

const archive = projects.slice(3)
const names = (list) => list.map((p) => p.name)

describe('archive filter', () => {
  it('filters by kind', () => {
    const oss = filterArchive(archive, { kind: 'oss' })
    expect(oss.length).toBeGreaterThan(0)
    expect(oss.every((p) => p.kind === 'oss')).toBe(true)
  })

  it('matches tags', () => {
    expect(names(filterArchive(archive, { query: 'headless' }))).toContain(
      'Furious Froth Coffee®'
    )
  })

  it('matches the description', () => {
    expect(names(filterArchive(archive, { query: 'gitmoji' }))).toEqual([
      'Chamoji',
    ])
  })

  it('matches the org', () => {
    const newgen = names(filterArchive(archive, { query: 'newgen' }))
    expect(newgen).toEqual(
      expect.arrayContaining([
        'ConventionSuite - GSC™',
        'Exhibit House Platform',
        'PortalGen™',
      ])
    )
  })

  it('matches the kind label', () => {
    const internal = filterArchive(archive, { query: 'internal tools' })
    expect(internal.length).toBeGreaterThan(0)
    expect(internal.every((p) => p.kind === 'internal')).toBe(true)
  })

  it('is case-insensitive and trims', () => {
    expect(
      matchesQuery(archive[0], `  ${archive[0].name.toUpperCase()} `)
    ).toBe(true)
  })

  it('combines kind and search', () => {
    expect(
      filterArchive(archive, { kind: 'venture', query: 'newgen' })
    ).toEqual([])
  })

  it('sorts by year newest first, and by name', () => {
    const byYear = filterArchive(archive)
    expect(byYear[0].name).toBe('Kingdom Kode')
    expect(byYear.at(-1).name).toBe('VB Remote Sat')
    const byName = filterArchive(archive, { sortKey: 'name' })
    expect(byName[0].name).toBe('@neatsuite/http')
  })

  it('counts each kind under the current search', () => {
    const counts = countByKind(archive)
    expect(counts.all).toBe(archive.length)
    expect(counts.venture + counts.client + counts.oss + counts.internal).toBe(
      archive.length
    )
    expect(countByKind(archive, 'newgen').venture).toBe(0)
  })
})

describe('hero data', () => {
  it('computes years shipping from the earliest build', () => {
    const stats = heroStats(projects, 2026)
    expect(stats.years).toBe(7)
    expect(heroStats(projects, 2027).years).toBe(8)
  })

  it('builds one timeline column per year', () => {
    const years = timelineYears(projects, 2026)
    expect(years.map((y) => y.year)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ])
    expect(years.flatMap((y) => y.items)).toHaveLength(projects.length)
  })
})

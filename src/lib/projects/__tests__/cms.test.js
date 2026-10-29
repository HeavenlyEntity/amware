import { describe, expect, it } from 'vitest'
import { projects } from '../../../content/site/projects'
import {
  dateFromIso,
  fromPayload,
  isoFromDate,
  pageOrder,
  toPayload,
} from '../cms'

/* What Payload hands back after a save: an id on the doc and on every
   array row. */
function asSavedDoc(data, id) {
  const rows = (list) => list.map((row, i) => ({ ...row, id: `${id}-${i}` }))
  return {
    ...data,
    id,
    tags: rows(data.tags),
    story: {
      ...data.story,
      chapters: rows(data.story.chapters),
      results: rows(data.story.results),
      stack: rows(data.story.stack),
    },
    updatedAt: '2026-10-29T00:00:00.000Z',
    createdAt: '2026-10-29T00:00:00.000Z',
  }
}

describe('projects CMS mapping', () => {
  it.each(projects.map((p, i) => [p.key, p, i]))(
    'round-trips %s without loss',
    (_key, project, index) => {
      const doc = asSavedDoc(toPayload(project, index), index + 1)
      expect(fromPayload(doc)).toStrictEqual(project)
    }
  )

  it('keeps the static order and bench', () => {
    const docs = projects
      .map((p, i) => asSavedDoc(toPayload(p, i), i + 1))
      .reverse()
    expect(pageOrder(docs).map(fromPayload)).toStrictEqual(projects)
  })

  it('puts bench projects first whatever their order', () => {
    const docs = [
      { key: 'a', order: 0, onBench: false },
      { key: 'b', order: 5, onBench: true },
      { key: 'c', order: 1, onBench: true },
    ]
    expect(pageOrder(docs).map((d) => d.key)).toEqual(['c', 'b', 'a'])
  })

  it('sorts the archive by date whatever the order', () => {
    const docs = [
      { key: 'old', order: 3, date: '2021-04-11T12:00:00.000Z' },
      { key: 'tie-b', order: 5, date: '2024-09-30T12:00:00.000Z' },
      { key: 'tie-a', order: 4, date: '2024-09-30T12:00:00.000Z' },
      /* Added in the admin with the default order of 0. */
      { key: 'new', order: 0, date: '2023-10-14T12:00:00.000Z' },
    ]
    expect(pageOrder(docs).map((d) => d.key)).toEqual([
      'tie-a',
      'tie-b',
      'new',
      'old',
    ])
  })

  it('seeds a private link as empty and reads it back as #', () => {
    const project = projects.find((p) => p.link.href === '#')
    expect(toPayload(project, 0).link.url).toBeNull()
  })

  it('converts dates at noon UTC', () => {
    expect(isoFromDate('08/21/26')).toBe('2026-08-21T12:00:00.000Z')
    expect(dateFromIso('2020-07-08T12:00:00.000Z')).toBe('07/08/20')
    /* The picker's noon in Phoenix (UTC-7) is 19:00 UTC, the same day. */
    expect(dateFromIso('2024-01-20T19:00:00.000Z')).toBe('01/20/24')
  })

  it('fills defaults for a sparse admin entry', () => {
    const project = fromPayload({
      name: 'New thing',
      key: 'new-thing',
      kind: 'venture',
      status: 'development',
      date: '2026-10-29T12:00:00.000Z',
    })
    expect(project).toMatchObject({
      tags: [],
      description: '',
      link: { href: '#', label: '' },
      activity: [],
      story: {
        lede: '',
        chapters: [],
        results: [],
        team: { size: 0, label: '', note: '' },
        stack: [],
      },
    })
    expect(project).not.toHaveProperty('org')
    expect(project.story).not.toHaveProperty('netsuite')
  })
})

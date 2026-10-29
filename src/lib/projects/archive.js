import { KINDS } from '../../content/site/projects'

/* Pure helpers behind the Projects page: the hero counts, the archive's
   kind filter, search and sort. Kept free of React so the engine tests can
   run them in node. */

export function yearOf(date) {
  const y = parseInt(date.split('/')[2], 10)
  return y < 100 ? 2000 + y : y
}

/* MM/DD/YY as a sortable number, without engine-dependent Date parsing. */
export function dateKey(date) {
  const [month, day] = date.split('/').map(Number)
  return yearOf(date) * 10000 + month * 100 + day
}

export function isPublicLink(href) {
  return (
    typeof href === 'string' &&
    href !== '#' &&
    (href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('/'))
  )
}

/* What the page says instead of a Visit link. */
export function privateNoteFor(project) {
  if (project.privateNote) return project.privateNote
  return project.kind === 'internal'
    ? 'Internal tool. Not public.'
    : 'No longer online.'
}

/* Search covers the name, tags, kind label, description and org. */
export function matchesQuery(project, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    project.name,
    project.tags.join(' '),
    KINDS[project.kind],
    project.description,
    project.org || '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

export function countByKind(list, query = '') {
  const counts = { all: 0 }
  for (const kind of Object.keys(KINDS)) counts[kind] = 0
  for (const project of list) {
    if (!matchesQuery(project, query)) continue
    counts.all += 1
    counts[project.kind] += 1
  }
  return counts
}

/* Year sorts newest first by default, name A to Z; `dir` flips either. */
export function filterArchive(
  list,
  { kind = 'all', query = '', sortKey = 'year', sortDir } = {}
) {
  const dir = sortDir ?? (sortKey === 'year' ? -1 : 1)
  return list
    .filter(
      (p) => (kind === 'all' || p.kind === kind) && matchesQuery(p, query)
    )
    .sort((a, b) =>
      sortKey === 'name'
        ? dir * a.name.localeCompare(b.name)
        : dir * (dateKey(a.date) - dateKey(b.date))
    )
}

/* Hero tiles, all computed from the data. Years shipping runs from the
   earliest project year through `currentYear`, inclusive. The year comes
   from the server render so the client hydrates the same numbers. */
export function heroStats(list, currentYear) {
  const earliest = Math.min(...list.map((p) => yearOf(p.date)))
  return {
    live: list.filter((p) => p.status === 'live').length,
    development: list.filter((p) => p.status === 'development').length,
    oss: list.filter((p) => p.kind === 'oss').length,
    years: currentYear - earliest + 1,
  }
}

/* One timeline column per year from the earliest build to the current
   year, oldest build first inside each column. */
export function timelineYears(list, currentYear) {
  const earliest = Math.min(...list.map((p) => yearOf(p.date)))
  const years = []
  for (let y = earliest; y <= currentYear; y++) {
    years.push({
      year: y,
      items: list.filter((p) => yearOf(p.date) === y).reverse(),
    })
  }
  return years
}

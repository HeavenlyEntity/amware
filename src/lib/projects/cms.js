/* Maps a Payload `projects` doc to the shape in content/site/projects.js and
   back. The page, drawer and AI documents only ever see the static shape;
   field names that read well in the admin (title/icon/body, value/label,
   link.url) stay on this side. Pure, so it runs in the unit tests. */

const pad = (n) => String(n).padStart(2, '0')

/* MM/DD/YY to an ISO timestamp at noon UTC. The admin's day-only picker
   saves noon in the editor's own time zone, which reads back as the same
   UTC day anywhere from UTC-11 to UTC+11, Phoenix included. */
export function isoFromDate(date) {
  const [month, day, year] = date.split('/').map(Number)
  const fullYear = year < 100 ? 2000 + year : year
  return `${fullYear}-${pad(month)}-${pad(day)}T12:00:00.000Z`
}

export function dateFromIso(iso) {
  const d = new Date(iso)
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${pad(
    d.getUTCFullYear() % 100
  )}`
}

const labels = (rows) => (rows ?? []).map((row) => row.label)

export function fromPayload(doc) {
  const story = doc.story ?? {}
  return {
    name: doc.name,
    key: doc.key,
    kind: doc.kind,
    tags: labels(doc.tags),
    date: dateFromIso(doc.date),
    description: doc.description ?? '',
    link: { href: doc.link?.url || '#', label: doc.link?.label ?? '' },
    status: doc.status,
    whatHappened: doc.whatHappened ?? '',
    activity: Array.isArray(doc.activity) ? doc.activity : [],
    ...(doc.org ? { org: doc.org } : {}),
    ...(doc.privateNote ? { privateNote: doc.privateNote } : {}),
    story: {
      lede: story.lede ?? '',
      chapters: (story.chapters ?? []).map((c) => ({
        t: c.title,
        i: c.icon,
        b: c.body,
      })),
      results: (story.results ?? []).map((r) => ({ v: r.value, l: r.label })),
      team: {
        size: story.team?.size ?? 0,
        label: story.team?.label ?? '',
        note: story.team?.note ?? '',
      },
      stack: labels(story.stack),
      ...(story.netsuite ? { netsuite: true } : {}),
    },
  }
}

/* `index` is the project's place in content/site/projects.js: the first
   three are the bench features, and the order carries over as-is. */
export function toPayload(project, index) {
  const { story } = project
  return {
    name: project.name,
    key: project.key,
    kind: project.kind,
    status: project.status,
    date: isoFromDate(project.date),
    onBench: index < 3,
    order: index,
    tags: project.tags.map((label) => ({ label })),
    description: project.description,
    /* '#' is the static file's "no public link"; the admin shows it empty. */
    link: {
      url: project.link.href === '#' ? null : project.link.href,
      label: project.link.label,
    },
    whatHappened: project.whatHappened,
    org: project.org ?? null,
    privateNote: project.privateNote ?? null,
    story: {
      lede: story.lede,
      chapters: story.chapters.map((c) => ({
        title: c.t,
        icon: c.i,
        body: c.b,
      })),
      results: story.results.map((r) => ({ value: r.v, label: r.l })),
      team: { ...story.team },
      stack: story.stack.map((label) => ({ label })),
      netsuite: Boolean(story.netsuite),
    },
    activity: project.activity,
  }
}

/* Bench features first in `order`, then the archive newest first, with
   `order` breaking same-day ties. That is the static file's order, which the
   timeline relies on: it reverses the list inside each year. The page takes
   the first three as the bench, as it does with the static list. */
export function pageOrder(docs) {
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)
  const newestFirst = (a, b) =>
    Date.parse(b.date) - Date.parse(a.date) || byOrder(a, b)
  return [
    ...docs.filter((d) => d.onBench).sort(byOrder),
    ...docs.filter((d) => !d.onBench).sort(newestFirst),
  ]
}

/* The two ways into an engagement on /services, and which services sit
   under each. The value is stored on the Service (Payload `category`); the
   label is only ever displayed, so it can change without a migration. */

export const SERVICE_TRACKS = [
  { id: 'consulting', label: 'Consulting', hash: 'consulting' },
  { id: 'technical', label: 'Build & support', hash: 'build-support' },
]

const KNOWN = new Set(SERVICE_TRACKS.map((t) => t.id))

/* Anything without a known category counts as consulting: every service
   that existed before the field did is a consulting retainer. Input order
   is kept, and Payload already sorts by `order`. */
export function groupServices(docs = []) {
  const groups = { consulting: [], technical: [] }
  for (const doc of docs) {
    groups[KNOWN.has(doc?.category) ? doc.category : 'consulting'].push(doc)
  }
  return groups
}

export function trackFromHash(hash) {
  const clean = String(hash || '').replace(/^#/, '')
  return SERVICE_TRACKS.find((t) => t.hash === clean)?.id ?? null
}

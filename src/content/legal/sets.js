/* The three policy sets, one per revenue line, and the three documents in
   each. The routes are /legal/<set>/<doc>; the pages are static, so this list
   is the whole of them. Each line's facts live in its own document
   components under src/components/legal, filled in from General Legal's
   CC0 templates. Anything not confirmed in the repo is a visible
   TODO(alec) on the page, never a guess. */

export const LEGAL_SETS = [
  {
    key: 'warekit',
    name: 'WareKit',
    title: 'WareKit boilerplates',
    offering: 'WareKit boilerplate and starter kits for NetSuite',
    catalogHref: '/products',
    catalogLabel: 'WareKit kits',
  },
  {
    key: 'services',
    name: 'Fractional CTO services',
    title: 'Fractional CTO services',
    offering: 'fractional CTO and technical advisory services',
    catalogHref: '/services',
    catalogLabel: 'Services',
  },
  {
    key: 'products',
    name: 'Digital products',
    title: 'Digital products',
    offering: 'digital guides and checklists',
    catalogHref: '/digital-products',
    catalogLabel: 'Digital products',
  },
]

export const LEGAL_DOCS = [
  { key: 'terms', label: 'Terms of service' },
  { key: 'privacy', label: 'Privacy policy' },
  { key: 'refund', label: 'Refund policy' },
]

export function legalSet(key) {
  return LEGAL_SETS.find((set) => set.key === key) ?? null
}

export function legalDoc(key) {
  return LEGAL_DOCS.find((doc) => doc.key === key) ?? null
}

export function legalHref(setKey, docKey) {
  return `/legal/${setKey}/${docKey}`
}

import { describe, expect, it } from 'vitest'
import { pricedGridClass, splitByPrice } from '../layout.js'

/* /services lays a track out the way the studio template's pricing section
   does: priced services side by side as pricing cards, unpriced ones (a
   "Custom work" ask) as a wide strip underneath. */

const svc = (slug, startingPrice) => ({ slug, startingPrice })

describe('splitByPrice', () => {
  it('separates priced from unpriced services, keeping each in order', () => {
    const { priced, unpriced } = splitByPrice([
      svc('one-pager', 2500),
      svc('custom-work', null),
      svc('company-site', 4500),
      svc('scoped', undefined),
    ])
    expect(priced.map((s) => s.slug)).toEqual(['one-pager', 'company-site'])
    expect(unpriced.map((s) => s.slug)).toEqual(['custom-work', 'scoped'])
  })

  it('treats a price of zero as a price', () => {
    expect(splitByPrice([svc('free-audit', 0)]).priced).toHaveLength(1)
  })

  it('handles an empty or missing list', () => {
    expect(splitByPrice([])).toEqual({ priced: [], unpriced: [] })
    expect(splitByPrice(undefined)).toEqual({ priced: [], unpriced: [] })
  })
})

describe('pricedGridClass', () => {
  /* Columns follow the count so no card sits alone on a row: two pair up
     from tablet width, three wait for a desktop row of three. */
  it.each([
    [1, ''],
    [2, 'md:grid-cols-2'],
    [3, 'lg:grid-cols-3'],
    [4, 'md:grid-cols-2'],
    [5, 'md:grid-cols-2 lg:grid-cols-3'],
    [6, 'md:grid-cols-2 lg:grid-cols-3'],
  ])('%i priced → "%s"', (count, cls) => {
    expect(pricedGridClass(count)).toBe(cls)
  })
})

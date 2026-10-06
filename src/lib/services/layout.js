/* How /services lays out one track, after the studio template's pricing
   section: priced services sit side by side as pricing cards, and anything
   without a price (a "Custom work" ask) runs as a wide strip underneath. */

export function splitByPrice(services = []) {
  const priced = []
  const unpriced = []
  for (const service of services ?? []) {
    if (typeof service?.startingPrice === 'number') priced.push(service)
    else unpriced.push(service)
  }
  return { priced, unpriced }
}

/* Column classes for the priced grid. The count decides, so no card sits
   alone on a row where it can be avoided: two or four pair up from tablet
   width, three wait for a desktop row of three, and six fill both. An odd
   count past three cannot avoid a lone card, so it takes the wider grid,
   and its empty cell shows the frame's seam colour: fine while each track
   has three or fewer priced services. */
export function pricedGridClass(count) {
  if (count <= 1) return ''
  if (count === 3) return 'lg:grid-cols-3'
  if (count % 2 === 0 && count % 3 !== 0) return 'md:grid-cols-2'
  return 'md:grid-cols-2 lg:grid-cols-3'
}

/* The /services page's own words, in one place so the tests can hold the
   page to them (design: the services board, Main.dc.html and
   HeroMobile.dc.html). Prices, tier names and the booking link are not here:
   they come from the Payload `services` rows, so the page cannot drift from
   what the cards and the deposit say.

   No figures, client counts or outcomes: the board has none, and nothing
   here may claim one. */

export const SERVICES_PAGE = {
  hero: {
    /* "SERVICES", not the board's "ENGAGEMENTS": the section below is
       already // SEC.01 / ENGAGEMENTS, and two eyebrows saying the same
       thing read as a typo (owner decision F13). */
    eyebrow: { index: '00', label: 'Services' },
    location: 'Remote-first · Phoenix, AZ',
    title: 'Work with the engineer behind the tools.',
    lede: 'Fractional CTO leadership and focused build engagements — scoped, senior, and pointed at the outcome instead of the hours.',
    cta: 'book a strategy call',
    compare: 'compare engagements',
    priceLabel: 'Strategy call',
  },
  engagements: {
    index: '01',
    eyebrow: 'Engagements',
    title: 'Two ways in.',
    copy: 'Steer the technology with me as your CTO, or have me build the product alongside your team.',
  },
  band: {
    eyebrow: { index: '02', label: 'Start here' },
    title: 'Not sure which engagement fits?',
    // TODO(alec): confirm the promise "We scope the right engagement
    // together before anything starts" is how every engagement begins.
    copy: 'Bring the problem to a strategy call. We scope the right engagement together before anything starts.',
    glass: 'Scope\nfirst.',
    hint: 'Move to look closer · click to reshape',
  },
  /* What the strategy-call popup records against a booking made from the
     hero or the band, where no tier has been chosen yet. */
  booking: {
    serviceName: 'Strategy call',
    notes: 'Engagement: not sure yet (from /services)',
    namespaceSuffix: 'services',
  },
}

/** "3 retainers · published pricing", or nothing when none is priced. */
export function retainerMeta(count) {
  if (!count) return null
  return `${count} ${
    count === 1 ? 'retainer' : 'retainers'
  } · published pricing`
}

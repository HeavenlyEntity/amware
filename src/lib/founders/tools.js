/* The Founders' Desk tool registry. One source of truth for the nav
   dropdown (live tools only), the desk dock, the landing's
   "coming to the desk" line, and the tests that assert every live tool
   has a real route. Icons are lucide names resolved by the components.
   `cta` is the live tool's action on the landing's path cards. */

export const TOOLS = [
  {
    id: 'equity',
    label: 'Equity calculator',
    href: '/founders/equity',
    icon: 'Percent',
    status: 'live',
    kicker: '/founders/equity · no account',
    blurb: 'Are you being sized as a hire while doing founder work?',
    cta: 'Read my offer',
  },
  {
    id: 'dilution',
    label: 'Dilution modeler',
    href: null,
    icon: 'TrendingDown',
    status: 'soon',
    kicker: 'soon',
    blurb: 'Your stake through seed, A, B, C and an IPO.',
  },
  {
    /* Absorbs the old "Salary ⇄ equity" slot: the ask ladder is that trade
       priced at both ends, so shipping both would advertise one idea twice. */
    id: 'job-offer',
    label: 'Job offer calculator',
    href: '/founders/job-offer',
    icon: 'ArrowLeftRight',
    status: 'live',
    kicker: '/founders/job-offer · no account',
    blurb: 'What to ask for, in cash and equity, and where to stop.',
    cta: 'Build my ask',
  },
  {
    id: 'glossary',
    label: 'Offer glossary',
    href: null,
    icon: 'BookOpen',
    status: 'soon',
    kicker: 'soon',
    blurb: 'Every term on a term sheet, in plain words.',
  },
  {
    id: 'vesting',
    label: 'Vesting timeline',
    href: null,
    icon: 'CalendarClock',
    status: 'soon',
    kicker: 'soon',
    blurb: 'Cliffs, acceleration, and what you keep if you leave.',
  },
]

export const DESK_HREF = '/founders'

export const REVIEW_HREF = '/contact/offer-review'

/* The two tool routes, named, because the hand-off links between them live in
   components that should not be reaching into the TOOLS array by index. Both
   are asserted against the registry by the registries test. */
export const ASK_HREF = '/founders/job-offer'

export const EQUITY_HREF = '/founders/equity'

export const liveTools = () => TOOLS.filter((tool) => tool.status === 'live')

export const soonTools = () => TOOLS.filter((tool) => tool.status === 'soon')

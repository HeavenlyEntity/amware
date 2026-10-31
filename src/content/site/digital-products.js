/* Digital products copy, from the approved board
   (docs/design/2026-10-27-portfolio-upgrade/reference/digital-products.design.html).
   Only words live here. The guide's price, page count and whether it is on
   sale come from Payload through the page. The clauses match the checklist
   PDF in public/downloads: 2 pages, 7 clauses, a green flag each. */

/* The name the page sells under. The CMS name stays until it is renamed in
   admin, so Creem receipts show the old one until then. */
export const GUIDE_NAME = 'The 15-Minute Key Rotation Playbook'

export const NOT_ON_SALE = 'Not on sale yet'

export const CLAUSES = [
  {
    title: 'Who owns the code?',
    look: 'Look for "work made for hire" and an IP assignment, not a licence.',
    green:
      'Full IP assignment to your company on payment, with any reused libraries listed by name in an exhibit.',
  },
  {
    title: 'What does "done" mean?',
    look: 'If acceptance criteria are not written down, done is whatever the shop says.',
    green:
      'Written acceptance criteria per milestone, plus a 5 to 10 business day window to reject with specifics.',
  },
  {
    title: 'The hourly-overage trapdoor',
    look: 'A "fixed price" that bills anything outside a vague spec by the hour.',
    green:
      'Change requests need a written estimate you approve before work starts. No silent meter.',
  },
  {
    title: 'Who holds the keys?',
    look: "Repos, cloud accounts and domains that live under the shop's accounts.",
    green:
      'Everything runs in your GitHub org, your cloud account and your registrar from day one. They get invited in.',
  },
  {
    title: 'The maintenance handcuff',
    look: 'Auto-renewing retainers, or a warranty void once anyone else touches the code.',
    green:
      'Support is month to month after launch, and the warranty survives maintenance by your own team.',
  },
  {
    title: 'No exit plan',
    look: 'Terminate mid-build and they keep the money and the work in progress.',
    green:
      "Termination for convenience on 14 to 30 days' notice, with all paid-for work handed over within 10 days.",
  },
  {
    title: 'The documentation black hole',
    look: 'No obligation to document means only they can maintain it.',
    green:
      'README, architecture overview, deploy runbook and setup docs are named deliverables with their own milestone.',
  },
]

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'founders', label: 'For founders' },
  { id: 'devs', label: 'For developers' },
]

/* `kicker` on the playbook gets its page count from Payload, and its price
   and price line come from Payload too, so neither is written here.
   TODO(alec): "Eight provider runbooks" is the board's. The Switch Clone PDF
   is not in this repo, so confirm it against the file. */
export const LIB = [
  {
    id: 'play',
    for: ['founders', 'devs'],
    badge: 'Guide',
    dot: '#3ce8ce',
    kicker: 'PDF guide',
    title: GUIDE_NAME,
    copy: 'The Switch Clone method for rotating API keys and webhooks without taking production down. Eight provider runbooks included.',
    tags: ['Founders', 'Developers'],
    cta: 'See the method',
    tone: 'solid',
    target: 'gd-switch',
  },
  {
    id: 'check',
    for: ['founders'],
    badge: 'Free',
    dot: '#a7f3d0',
    kicker: 'Checklist · 2 pages',
    title: 'Dev Shop Contract Red Flags',
    copy: 'The seven clauses that cost non-technical founders money, time and sometimes their IP. Check them before you sign.',
    tags: ['Founders'],
    price: 'Free',
    priceSub: 'Email delivery',
    cta: 'Score my contract',
    tone: 'quiet',
    target: 'gd-flags',
  },
]

/* TODO(alec): "about fifteen minutes per service" is the board's; confirm
   against the PDF. */
export const SC = [
  {
    title: 'Clone',
    copy: 'Create the new key beside the old one. Both work, and nothing changes for users yet.',
  },
  {
    title: 'Switch',
    copy: 'Point your app at the new key and deploy. Traffic moves over while the old key still answers.',
  },
  {
    title: 'Retire',
    copy: 'Once nothing calls the old key, revoke it. Plan on about fifteen minutes per service.',
  },
]

/* TODO(alec): the board's list, confirm each line against the Switch Clone
   PDF: eight providers, the diagrams and the copyable checklists. */
export const INCLUDED = [
  'The Switch Clone method, step by step',
  'Runbooks for eight providers',
  'Architecture diagrams',
  'Checklists you can copy into a ticket',
]

export const NEXT_LINKS = [
  {
    href: '/courses',
    title: 'Secure the Stack',
    copy: 'The security course for developers. Waitlist open.',
    icon: 'programmer',
  },
  {
    href: '/products',
    title: 'WareKit boilerplates',
    copy: 'React and Next.js foundations for NetSuite apps.',
    icon: 'blocks',
  },
  {
    href: '/services',
    title: 'Fractional CTO services',
    copy: 'A security audit or ongoing technical leadership.',
    icon: 'rocket',
  },
]

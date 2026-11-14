/* The free checklist on the /services Build & support tab (owner decision
   2026-11-13): an email in exchange for the PDF, then the free intro call.
   The checklist is the one from Entrepedia's "Get Found on Google and AI
   Search" course, rebuilt in AMWARE teal; its source is in
   docs/design/2026-11-13-ai-search-checklist/. The five steps below are the
   PDF's own section names. */

export const AI_SEARCH_CHECKLIST = {
  kicker: 'Free checklist · 3 pages',
  title: 'Does AI name your business?',
  lead: 'Ask the questions your buyers ask, see who the answers name instead of you, and fix the page the engines read.',
  steps: [
    'Get your baseline',
    'Open the door to the crawlers',
    'Rewrite the page they read',
    'Earn the mentions and links',
    'Run the monthly loop',
  ],
  form: {
    message:
      'Asked for the Does AI Name Your Business? checklist on /services (Build & support).',
    cta: 'Send it',
    // TODO(alec): "No newsletter" is a promise about mail handling. Confirm
    // the contact flow never subscribes the address.
    note: 'One email with the PDF. No newsletter.',
  },
  next: {
    title: 'Next: bring it to a free 15-minute intro call.',
    copy: 'We look at your site together and see whether a One Pager, a Company Site or custom work fits.',
    cta: 'Book a free intro call',
  },
  /* What the intro-call popup records against a booking made from here. */
  booking: {
    serviceName: 'Intro call',
    notes: 'From the AI search checklist (Build & support, /services)',
    namespaceSuffix: 'checklist',
  },
}

/* The free checklist on the /services Build & support tab. Since
   2026-11-14 it is a reward for booking the Build & support intro call,
   never for an email alone: the visitor gets it right after the booking is
   confirmed (BookingReward on the page, and by email from the Cal.com
   webhook), with the ebook. The checklist is the one from Entrepedia's
   "Get Found on Google and AI Search" course, rebuilt in AMWARE teal; its
   source is in docs/design/2026-11-13-ai-search-checklist/. The five steps
   below are the PDF's own section names. */

export const AI_SEARCH_CHECKLIST = {
  kicker: 'Free with your intro call · 3 pages',
  title: 'Does AI name your business?',
  lead: 'Ask the questions your buyers ask, see who the answers name instead of you, and fix the page the engines read.',
  steps: [
    'Get your baseline',
    'Open the door to the crawlers',
    'Rewrite the page they read',
    'Earn the mentions and links',
    'Run the monthly loop',
  ],
  offer: {
    title: 'Book the free 15-minute intro call. Get the checklist right after.',
    copy: 'With a site or starting from scratch, we go over what you need. The checklist and the Turn Website Visitors Into Buyers ebook are yours the moment you book.',
    cta: 'Book a free intro call',
    fine: 'Intro call · 15 min · free',
    fallback: 'Ask for a free 15-minute intro call.',
  },
  /* What the Build & support intro-call popup records against a booking
     made from here. */
  booking: {
    serviceName: 'Build & support intro call',
    notes: 'From the AI search checklist (Build & support, /services)',
    namespaceSuffix: 'checklist',
  },
}

/* What a free intro-call booking earns, and only a booking (owner decision
   2026-11-14): the visitor gets it right after the booking is confirmed, on
   the page (BookingReward) and by email from the Cal.com webhook. Nothing
   here is handed out for an email address alone.

   Both calls earn the ebook; the Build & support call also earns the AI
   search checklist. The PDFs are static files under unlisted names, kept
   out of search engines (robots.js); they are not advertised anywhere but
   here, though anyone handed a link can open it. Constants and pure
   functions only: the client panel and the server mail both import this
   file. */

export const EBOOK = {
  id: 'ebook',
  kind: 'Ebook',
  title: 'Turn Website Visitors Into Buyers',
  path: '/downloads/amware-turn-website-visitors-into-buyers-4e0774d13d6c.pdf',
}

export const CHECKLIST = {
  id: 'checklist',
  kind: 'Checklist',
  title: 'Does AI Name Your Business?',
  path: '/downloads/amware-does-ai-name-your-business-d8ec7903f20f.pdf',
}

/** The window event BookCallButton raises when Cal.com confirms a booking. */
export const BOOKED_EVENT = 'amw:booked'

/** The gifts for a lead track ('consulting' | 'build'). */
export function giftsFor(track) {
  return track === 'build' ? [CHECKLIST, EBOOK] : [EBOOK]
}

/* A popup's namespace starts with its event slug ("intro-call-advisor",
   "build-intro-call-checklist"); only the two intro calls earn a gift. */
export function trackOfNamespace(namespace) {
  const ns = typeof namespace === 'string' ? namespace : ''
  if (ns.startsWith('build-intro-call')) return 'build'
  if (ns.startsWith('intro-call')) return 'consulting'
  return null
}

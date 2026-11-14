/* The free ebook every intro call earns (owner decisions 2026-11-13 and
   2026-11-14). It replaced the "CTO Systems Audit Prompt": a prompt invites
   the visitor to ask an AI to fix the code instead of booking, while a
   sales ebook helps a founder with a live app without replacing the work.

   It is Entrepedia's "Turn Website Visitors Into Buyers" workbook (private
   label rights) with an AMWARE cover and closing page, at an unlisted path
   kept out of search engines (robots.js). It goes out by email after the
   intro call, when Cal.com reports the meeting ended (the booking webhook,
   sendEbookAfterCall), once per lead, on either intro call.
   TODO(alec): confirm the Entrepedia private label rights cover this. */

export const FREE_EBOOK = {
  kicker: 'Free ebook included',
  title: 'Turn Website Visitors Into Buyers',
  pdfPath:
    '/downloads/amware-turn-website-visitors-into-buyers-4e0774d13d6c.pdf',
  steps: [
    { icon: 'call', label: 'Book the call', sub: '15 min · free' },
    { icon: 'mail', label: 'Get the ebook', sub: 'after your call' },
    { icon: 'grow', label: 'Win more buyers', sub: 'yours to keep' },
  ],
}

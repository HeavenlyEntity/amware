/* Where a lead is in the funnel (decided 2026-11-13): a free 15-minute intro
   call, a free 45-minute strategy call, then a proposal link sent only when
   they ask for the price. The first five stages move automatically from
   Cal.com and the contact form; the last four are set by hand in the admin
   and are never overwritten. */

export const LEAD_STAGES = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'intro-booked', label: 'Intro call booked' },
  { value: 'intro-done', label: 'Intro call done' },
  { value: 'strategy-booked', label: 'Strategy call booked' },
  { value: 'strategy-done', label: 'Strategy call done' },
  { value: 'proposal-sent', label: 'Proposal sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'not-a-fit', label: 'Not a fit' },
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]['value']

const AUTOMATIC: LeadStage[] = [
  'contacted',
  'intro-booked',
  'intro-done',
  'strategy-booked',
  'strategy-done',
]

/** The stage after an automatic event. A lead only moves forward, and a
    stage set by hand (proposal sent, won, lost, not a fit) is left alone. */
export function advanceStage(
  current: string | null | undefined,
  next: LeadStage
): LeadStage {
  if (!current) return next
  const from = AUTOMATIC.indexOf(current as LeadStage)
  if (from === -1) return current as LeadStage
  return AUTOMATIC.indexOf(next) > from ? next : (current as LeadStage)
}

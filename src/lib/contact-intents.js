/* Subjects that the contact endpoint treats differently. Client capture forms
   and the server-side mail routing both import this file, so it holds only
   constants and pure functions. */

export const RED_FLAGS_SUBJECT = 'Red Flags checklist'

/* The free 15-minute intro call, the same event the consulting rows'
   booking_url points at (Cal.com, set up 2026-11-13). */
export const INTRO_CALL_URL = 'https://cal.com/amware/intro-call'

/* The Build & support side's own free intro call (Cal.com, set up
   2026-11-13): its own questions, kept apart from the consulting call, and
   the link the Build & support rows' booking_url points at. */
export const BUILD_INTRO_CALL_URL = 'https://cal.com/amware/build-intro-call'

const KIT_WAITLIST_PREFIX = 'WareKit waitlist'

export function kitWaitlistSubject(edition, pick) {
  return `${KIT_WAITLIST_PREFIX} · ${edition} · ${pick}`
}

export function isKitWaitlist(subject) {
  return typeof subject === 'string' && subject.startsWith(KIT_WAITLIST_PREFIX)
}

/* A consulting enquiry, the kind that joins the Leads list. Product and
   course sign-ups (WareKit waitlist or Enterprise, the courses waitlist) and
   the Red Flags checklist download post here too, but they are buyers of a
   product, not people in the consulting funnel. */
export function isConsultingEnquiry(subject) {
  if (typeof subject !== 'string') return true
  return !(
    subject.startsWith('WareKit') ||
    subject.startsWith('Courses waitlist') ||
    subject === RED_FLAGS_SUBJECT
  )
}

/* The subject on the contact form when a license holder asks about
   Enterprise, so the enquiry arrives already naming the kit and the tier. */
export function kitEnterpriseSubject(kit, tier) {
  return `WareKit Enterprise · ${kit} · ${tier}`
}

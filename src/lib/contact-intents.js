/* Subjects that the contact endpoint treats differently. Client capture forms
   and the server-side mail routing both import this file, so it holds only
   constants and pure functions. */

export const RED_FLAGS_SUBJECT = 'Red Flags checklist'

const KIT_WAITLIST_PREFIX = 'WareKit waitlist'

export function kitWaitlistSubject(edition, pick) {
  return `${KIT_WAITLIST_PREFIX} · ${edition} · ${pick}`
}

export function isKitWaitlist(subject) {
  return typeof subject === 'string' && subject.startsWith(KIT_WAITLIST_PREFIX)
}

/* The subject on the contact form when a license holder asks about
   Enterprise, so the enquiry arrives already naming the kit and the tier. */
export function kitEnterpriseSubject(kit, tier) {
  return `WareKit Enterprise · ${kit} · ${tier}`
}

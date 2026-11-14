import { Resend } from 'resend'

import { RED_FLAGS_SUBJECT, isKitWaitlist } from './contact-intents'
import { giftsFor } from './booking-gifts'

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export type ContactSubmission = {
  name: string
  email: string
  subject?: string
  message: string
}

export async function sendContactEmails(
  submission: ContactSubmission
): Promise<void> {
  const from = process.env.RESEND_FROM || 'Amware <hello@amware.dev>'
  const notifyTo = process.env.CONTACT_NOTIFY_TO

  if (notifyTo) {
    await getResend().emails.send({
      from,
      to: notifyTo,
      replyTo: submission.email,
      subject: `New contact submission: ${
        submission.subject || '(no subject)'
      }`,
      text: `Name: ${submission.name}\nEmail: ${submission.email}\n\n${submission.message}`,
    })
  }

  /* A kit waitlist sign-up promises one email when the kit ships, so the
     visitor hears nothing now. The owner notification above is the record. */
  if (isKitWaitlist(submission.subject)) return

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.amware.dev'
  ).replace(/\/+$/, '')

  if (submission.subject === RED_FLAGS_SUBJECT) {
    const { error } = await getResend().emails.send({
      from,
      to: submission.email,
      subject: 'Your Dev Shop Contract Red Flags checklist',
      text: `Here is the checklist you asked for:\n\n${site}/downloads/amware-dev-shop-contract-red-flags.pdf\n\nTwo pages: the seven clauses to check, with the green-flag fix for each.\n\n— Alec`,
    })
    /* The SDK resolves with an error object instead of throwing on an API
       rejection. The caller needs to know this mail never left. */
    if (error) throw new Error(`Red Flags mail rejected: ${error.message}`)
    return
  }

  await getResend().emails.send({
    from,
    to: submission.email,
    subject: 'Thanks for reaching out',
    text: `Hi ${submission.name},\n\nThanks for getting in touch — I received your message and will get back to you soon.\n\n— Alec`,
  })
}

/* The reward for booking a free intro call (owner decision 2026-11-14):
   the downloads it earned, mailed as soon as Cal.com reports the booking,
   for anyone who booked on cal.com itself or closed the page before the
   panel showed. The same gifts as the page's BookingReward. Throws when
   Resend rejects the mail, so the caller can log it. */
export async function sendBookingGifts({
  email,
  name,
  track,
}: {
  email: string
  name: string
  track: 'consulting' | 'build'
}): Promise<void> {
  const from = process.env.RESEND_FROM || 'Amware <hello@amware.dev>'
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.amware.dev'
  ).replace(/\/+$/, '')
  const gifts = giftsFor(track) as { title: string; path: string }[]
  const first = String(name || '')
    .trim()
    .split(/\s+/)[0]
  const greeting = first && !first.includes('@') ? `Hi ${first},` : 'Hi,'
  const list = gifts
    .map((gift) => `${gift.title}\n${site}${gift.path}`)
    .join('\n\n')
  const { error } = await getResend().emails.send({
    from,
    to: email,
    subject:
      gifts.length > 1
        ? 'Your free checklist and ebook'
        : 'Your free ebook: Turn Website Visitors Into Buyers',
    text: `${greeting}\n\nThanks for booking your free intro call. As promised, here ${
      gifts.length > 1 ? 'are your downloads' : 'is your ebook'
    }:\n\n${list}\n\nThey are yours to keep. See you on the call.\n\n— Alec`,
  })
  if (error) throw new Error(`Booking gift mail rejected: ${error.message}`)
}

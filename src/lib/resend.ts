import { Resend } from 'resend'

import {
  AI_SEARCH_CHECKLIST_SUBJECT,
  INTRO_CALL_URL,
  RED_FLAGS_SUBJECT,
  isKitWaitlist,
} from './contact-intents'

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

  if (submission.subject === AI_SEARCH_CHECKLIST_SUBJECT) {
    const { error } = await getResend().emails.send({
      from,
      to: submission.email,
      subject: 'Your "Does AI Name Your Business?" checklist',
      text: `Here is the checklist you asked for:\n\n${site}/downloads/amware-does-ai-name-your-business.pdf\n\nThree pages, five steps: get your baseline, open the door to the crawlers, rewrite the page they read, earn the mentions and links, and run the monthly loop.\n\nWhen you want a second pair of eyes on your site, book a free 15-minute intro call:\n${INTRO_CALL_URL}\n\n— Alec`,
    })
    if (error) {
      throw new Error(`AI search checklist mail rejected: ${error.message}`)
    }
    return
  }

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

import { after } from 'next/server'
import { APIError, type CollectionConfig } from 'payload'

import { RED_FLAGS_SUBJECT, isConsultingEnquiry } from '../lib/contact-intents'
import { recordContact } from '../lib/leads/record'
import { sendContactEmails } from '../lib/resend'
import { verifyContactToken } from '../lib/turnstile'

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'],
  },
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'subject', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'new',
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        // Protect REST and GraphQL creation before persistence or email hooks.
        if (operation === 'create') {
          await verifyContactToken(req.headers.get('x-turnstile-token'))
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          try {
            await sendContactEmails({
              name: doc.name,
              email: doc.email,
              subject: doc.subject,
              message: doc.message,
            })
          } catch (err) {
            console.error('Resend contact emails failed:', err)
            /* The checklist email is the whole point of that sign-up. Failing
               the request rolls the row back with it, so the visitor sees an
               error instead of a promise, and a retry is not blocked. */
            if (doc.subject === RED_FLAGS_SUBJECT) {
              throw new APIError(
                'We could not send the checklist. Try again in a moment.',
                502,
                undefined,
                true
              )
            }
          }
        }
        const payload = req?.payload
        if (
          operation === 'create' &&
          payload &&
          isConsultingEnquiry(doc.subject)
        ) {
          /* A consulting enquiry joins the Leads list. Last, so a message
             that failed above never makes a lead, and after the response, by
             when this row's transaction has committed and its connection is
             back in the pool: a failed lead write can neither roll the
             message back nor wait on a second connection. The owner gets the
             message by email either way. */
          const record = async () => {
            try {
              await recordContact(payload, {
                name: doc.name,
                email: doc.email,
                message: doc.message,
              })
            } catch (err) {
              console.error('Recording the contact as a lead failed:', err)
            }
          }
          try {
            after(record)
          } catch {
            // Outside a request (a script or test): just run it.
            await record()
          }
        }
        return doc
      },
    ],
  },
}

import { APIError, type CollectionConfig } from 'payload'

import { RED_FLAGS_SUBJECT } from '../lib/contact-intents'
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
      async ({ doc, operation }) => {
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
        return doc
      },
    ],
  },
}

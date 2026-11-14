import type { CollectionConfig } from 'payload'

import { normalizeEmail } from '../lib/leads/calcom'
import { LEAD_STAGES } from '../lib/leads/stages'

/* Everyone coming into the consulting funnel, one row per email. Cal.com
   bookings arrive through /webhooks/calcom and contact-form messages through
   ContactSubmissions; both go through src/lib/leads/record.ts. The profile
   comes from their booking answers; research, sales notes and the fit call
   are filled in by hand. Staff only: nothing here is public. */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'business', 'track', 'stage', 'fit', 'updatedAt'],
    description:
      'People coming in through either side, consulting or Build & support (see Track). Bookings and contact-form messages add them automatically.',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeValidate: [
      /* One lead per person: the unique index is on the lower-cased email,
         so one typed by hand in the admin matches a booking's. */
      ({ data }) => {
        if (data && typeof data.email === 'string') {
          data.email = normalizeEmail(data.email)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'phone', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'business', type: 'text' },
        {
          name: 'website',
          type: 'text',
          admin: {
            description:
              'Or where they are online. Blank for referral-only businesses.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'basedIn', type: 'text', label: 'Based in' },
        { name: 'yearsInBusiness', type: 'text', label: 'Years in business' },
      ],
    },
    { name: 'sells', type: 'text', label: 'What they sell' },
    { name: 'foundVia', type: 'text', label: 'How customers find them' },
    { name: 'helpWith', type: 'textarea', label: 'How they want help' },
    {
      name: 'researchNotes',
      type: 'textarea',
      admin: {
        description:
          'Before the intro call: pricing and packages, rough size and revenue range, stack, visible problems.',
      },
    },
    {
      name: 'salesNotes',
      type: 'textarea',
      admin: {
        description: 'From the calls: problems, goals, what they asked.',
      },
    },
    {
      name: 'calls',
      type: 'array',
      admin: { description: 'Filled in from Cal.com.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'kind',
              type: 'select',
              required: true,
              options: [
                { label: 'Intro (15 min)', value: 'intro' },
                { label: 'Strategy (45 min)', value: 'strategy' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'booked',
              options: [
                { label: 'Booked', value: 'booked' },
                { label: 'Rescheduled', value: 'rescheduled' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Completed', value: 'completed' },
              ],
            },
            {
              name: 'startsAt',
              type: 'date',
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        { name: 'bookingUid', type: 'text', admin: { readOnly: true } },
      ],
    },
    {
      name: 'stage',
      type: 'select',
      required: true,
      defaultValue: 'contacted',
      options: LEAD_STAGES.map(({ label, value }) => ({ label, value })),
      admin: {
        position: 'sidebar',
        description:
          'Moves forward on its own up to "Strategy call done". Set the rest by hand.',
      },
    },
    {
      name: 'fit',
      type: 'select',
      options: [
        { label: 'Fit', value: 'fit' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Not a fit', value: 'not-a-fit' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'track',
      type: 'select',
      options: [
        { label: 'Consulting', value: 'consulting' },
        { label: 'Build & support', value: 'build' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Which side they came in through: the consulting intro call, or the Build & support call and checklist. The first booking decides it; a contact-form message starts as Consulting.',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Cal.com booking', value: 'calcom' },
        { label: 'Contact form', value: 'contact-form' },
        { label: 'Added by hand', value: 'manual' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}

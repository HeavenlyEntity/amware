import type { CollectionConfig } from 'payload'

import { slugField } from '@/fields/slug'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startingPrice', 'priceLabel', 'status', 'order'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      return { status: { equals: 'published' } }
    },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    ...slugField('name', {
      slugOverrides: { required: true, unique: true },
    }),
    { name: 'summary', type: 'textarea' },
    { name: 'description', type: 'richText' },
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'startingPrice', type: 'number' },
    {
      name: 'priceLabel',
      type: 'text',
      admin: {
        description:
          'What the price is per — "per month" for a retainer. Empty reads ' +
          'as a one-off. Without it a $3,000 monthly retainer renders as a ' +
          'flat $3,000, which is a very different offer.',
      },
    },
    {
      name: 'commitment',
      type: 'text',
      admin: {
        description: 'Rough time, e.g. "about 10 hrs a month".',
      },
    },
    {
      name: 'bookingUrl',
      type: 'text',
      admin: {
        description:
          'Cal.com event URL. Opens booking and its configured payment in ' +
          'one widget, taking priority over a standalone Whop deposit plan.',
      },
    },
    {
      name: 'depositNote',
      type: 'textarea',
      admin: {
        description:
          'Fallback money line for services without a Whop deposit plan. ' +
          'Reservable services show the standardized call outcome, included ' +
          'audit prompt, and refund terms from the storefront so the promise ' +
          'cannot drift by tier.',
      },
    },
    {
      name: 'creemProductId',
      type: 'text',
      admin: {
        description:
          'Creem prod_… id for a fixed-price package. Absence ⇒ "Request a quote".',
      },
    },
    {
      name: 'whopPlanId',
      type: 'text',
      admin: {
        description:
          'Whop plan_… id of the deposit plan. Present ⇒ the card offers ' +
          '"Reserve your start" as its primary action and shows the call ' +
          'outcome, included audit prompt, and refund terms. Created and ' +
          'filled in ' +
          'by `pnpm sim` (6-whop-engagements); paste one here only to point ' +
          'at a plan made in the Whop dashboard.',
      },
    },
    {
      name: 'whopSandboxPlanId',
      type: 'text',
      admin: {
        description:
          "The same deposit plan on Whop's sandbox (plan_… on " +
          'sandbox.whop.com). Used only when the site runs with ' +
          'WHOP_ENV=sandbox, i.e. locally for testing with test cards. ' +
          'Filled in by `pnpm sim` when run against a sandbox key.',
      },
    },
    {
      name: 'depositAmount',
      type: 'number',
      defaultValue: 1500,
      admin: {
        description:
          'The deposit in whole dollars, as the Whop plan charges it. It is ' +
          'what the button says and what the ads pixel is told, so it must ' +
          'match the plan.',
      },
    },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      admin: { position: 'sidebar' },
    },
  ],
}

import type { CollectionConfig } from 'payload'

/* One license is one right to use a kit, however many purchases built it up.
   An upgrade adds a purchase, not a license, so seats and accounts live here
   and the purchase rows only record what was paid. `tier` is derived from the
   paid purchases and is written by the server, never by hand. */
export const Licenses: CollectionConfig = {
  slug: 'licenses',
  admin: {
    useAsTitle: 'ownerEmail',
    defaultColumns: [
      'ownerEmail',
      'stack',
      'tier',
      'needsReview',
      'tierChangedAt',
    ],
    listSearchableFields: ['ownerEmail'],
  },
  // Admin-only; the webhook and the license routes write via Local API with overrideAccess: true.
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'ownerEmail',
      type: 'email',
      required: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' ? value.trim().toLowerCase() : value,
        ],
      },
      admin: { description: 'Stored lowercase.' },
    },
    {
      name: 'stack',
      type: 'select',
      required: true,
      options: [
        { label: 'React in NetSuite', value: 'react-netsuite' },
        { label: 'Next.js + NetSuite', value: 'next-netsuite' },
      ],
      admin: { description: 'Which kit family this license is for.' },
    },
    {
      name: 'tier',
      type: 'select',
      options: [
        { label: 'Lite', value: 'lite' },
        { label: 'Pro', value: 'pro' },
        { label: 'Team', value: 'team' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Derived: the highest tier among this license’s paid purchases, ' +
          'recomputed whenever one changes. Empty means nothing is paid.',
      },
    },
    {
      name: 'seatOverride',
      type: 'number',
      min: 1,
      admin: {
        description:
          'Developers allowed. Empty except on Enterprise, where it is ' +
          'required; every other tier takes its limit from the product.',
      },
    },
    {
      name: 'accountOverride',
      type: 'number',
      min: 1,
      admin: {
        description:
          'NetSuite accounts allowed. Empty except on Enterprise, where it ' +
          'is required; every other tier takes its limit from the product.',
      },
    },
    {
      name: 'seatMembers',
      type: 'array',
      labels: { singular: 'Seat', plural: 'Seats' },
      admin: {
        description:
          'Every GitHub account this license has granted, including the ' +
          'purchaser. The length is the seats used; the limit comes from the ' +
          'tier. Rows are appended, never replaced, so removing someone here ' +
          'does not take their repository access away. Do that on GitHub.',
      },
      fields: [
        { name: 'githubUsername', type: 'text', required: true },
        { name: 'inviteUrl', type: 'text' },
        {
          name: 'addedAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'accounts',
      type: 'array',
      labels: { singular: 'Account', plural: 'NetSuite accounts' },
      admin: {
        description:
          'NetSuite accounts that have reported using this license. An ' +
          'over-limit row is the upgrade signal; nothing is blocked.',
      },
      fields: [
        { name: 'accountId', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Over limit', value: 'over_limit' },
          ],
        },
        {
          name: 'creemInstanceId',
          type: 'text',
          admin: {
            description:
              'Creem’s activation id for this account. Empty until Creem ' +
              'accepts it; the report route retries.',
          },
        },
        {
          name: 'firstSeenAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'lastSeenAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'notifiedAt',
          type: 'date',
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            description: 'When the owner was emailed about this account.',
          },
        },
      ],
    },
    {
      name: 'quoteCreemProductId',
      type: 'text',
      admin: {
        description:
          'The private Creem product for an Enterprise quote. Empty on ' +
          'every other license.',
      },
    },
    {
      name: 'needsReview',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Set for disputes, partial refunds, an overpaid upgrade and ' +
          'anything else a person should look at. Clear it when handled.',
      },
    },
    {
      name: 'tierChangedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'lastLinkSentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the license page link was last emailed.',
      },
    },
    {
      name: 'creemEnvironment',
      type: 'select',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'Sandbox', value: 'sandbox' },
      ],
      defaultValue: 'production',
      admin: {
        position: 'sidebar',
        description:
          'Sandbox licenses come from Creem test-mode purchases and are ' +
          'deleted when the test ends.',
      },
    },
  ],
}

import type { CollectionConfig, Field } from 'payload'

import {
  enterpriseLinkFor,
  licenseUsageFor,
  overrideError,
} from '@/lib/commerce/licenseRecord'

/* For a field no one writes and only an admin reads. The hooks behind these
   fields check the user themselves, as this is skipped by a Local API call
   that overrides access. */
const ADMIN_READ_ONLY = {
  read: ({ req: { user } }) => user?.collection === 'users',
  create: () => false,
  update: () => false,
}

/* A list column worked out on read. `virtual: true` means no column and no
   SQL; see `enterpriseLink`. */
const usageField = (
  name: string,
  label: string,
  pick: 'seats' | 'accounts',
  description: string
): Field => ({
  name,
  label,
  type: 'text',
  virtual: true,
  access: ADMIN_READ_ONLY,
  hooks: {
    afterRead: [
      async ({ data, req }) => {
        const usage = await licenseUsageFor({
          payload: req.payload,
          license: data,
          user: req.user,
          context: req.context,
        })
        return usage?.[pick] ?? null
      },
    ],
  },
  admin: { readOnly: true, position: 'sidebar', description },
})

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
      'seatsUsage',
      'accountsUsage',
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
      /* `readOnly` is only the form. This stops a stale form posting an old
         tier back; `recomputeTier` writes with `overrideAccess`, which skips
         it. */
      access: { update: () => false },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Derived: the highest tier among this license’s paid purchases, ' +
          'recomputed whenever one changes. Empty means nothing is paid.',
      },
    },
    usageField(
      'seatsUsage',
      'Developers',
      'seats',
      'Developers used and allowed. The limit is the override, or the kit ' +
        'row for this stack and tier.'
    ),
    usageField(
      'accountsUsage',
      'Accounts',
      'accounts',
      'Active NetSuite accounts and how many are allowed.'
    ),
    {
      name: 'seatOverride',
      type: 'number',
      min: 1,
      validate: (value, { siblingData }) =>
        overrideError(value, siblingData, 'Developers'),
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
      validate: (value, { siblingData }) =>
        overrideError(value, siblingData, 'NetSuite accounts'),
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
          'Every GitHub account on this license, including the purchaser. ' +
          'The length is the seats used; the limit is the override, or the ' +
          'kit row for this tier. The Remove button on the license page also ' +
          'takes repository access away. Deleting a row here does not, so ' +
          'do that on GitHub.',
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
      /* A way into the license, so it is kept out of every response that is not
         an admin's. `virtual: true` means Payload makes no column for it (the
         database adapter skips virtual fields when it builds the schema), so it
         needs no SQL. The hook mints it on read and checks the user itself, as
         the field access below is skipped by a Local API call that overrides
         access. Nothing can write it: `update: () => false`. */
      name: 'enterpriseLink',
      type: 'text',
      virtual: true,
      access: ADMIN_READ_ONLY,
      hooks: {
        afterRead: [
          ({ data, req }) =>
            enterpriseLinkFor({
              payload: req.payload,
              license: data,
              user: req.user,
            }),
        ],
      },
      admin: {
        readOnly: true,
        description:
          'The signed checkout link to send this customer by hand. Shown ' +
          'only to you, and only once a quote is saved. It lasts 30 days; ' +
          'the page offers to email a fresh one.',
      },
    },
    {
      name: 'needsReview',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Set for disputes, partial refunds, an overpaid or refused ' +
          'upgrade, a seat invite to send by hand and anything else a person ' +
          'should look at. Clear it when handled.',
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

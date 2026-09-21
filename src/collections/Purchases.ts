import type { CollectionConfig } from 'payload'

export const Purchases: CollectionConfig = {
  slug: 'purchases',
  admin: {
    useAsTitle: 'email',
    /* Amount is in the list because it is the only thing separating a free
       claim from a $999 licence at a glance, and githubUsername because it is
       who the kit actually went to -- an email address is the buyer, the
       GitHub account is the delivery address, and on a team licence they are
       routinely different people. */
    defaultColumns: [
      'email',
      'item',
      'amount',
      'githubUsername',
      'fulfillmentStatus',
      'createdAt',
    ],
    // Chasing a failed invite starts from one of these three, never from a row id.
    listSearchableFields: [
      'email',
      'githubUsername',
      'creemOrderId',
      'whopPaymentId',
    ],
    components: {
      beforeList: ['@/components/admin/PurchaseLedger#PurchaseLedger'],
    },
  },
  // Admin-only; the webhook writes via Local API with overrideAccess: true.
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'email', type: 'email', required: true },
    {
      name: 'item',
      type: 'relationship',
      relationTo: ['products', 'courses', 'services'],
    },
    {
      name: 'itemType',
      type: 'select',
      options: [
        { label: 'Product', value: 'product' },
        { label: 'Course', value: 'course' },
        { label: 'Service', value: 'service' },
      ],
    },
    { name: 'creemProductId', type: 'text' },
    {
      name: 'provider',
      type: 'select',
      options: [
        { label: 'Creem', value: 'creem' },
        { label: 'Whop', value: 'whop' },
      ],
      defaultValue: 'creem',
      admin: {
        description:
          'Who took the money. Creem for kits and downloads, Whop for ' +
          'engagement deposits. Decides which id below is the idempotency key.',
      },
    },
    {
      name: 'creemOrderId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Idempotency key for a Creem sale (order id). Empty on a Whop row.',
      },
    },
    {
      name: 'whopPaymentId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Idempotency key for a Whop sale (pay_… id). Empty on a Creem row.',
      },
    },
    {
      name: 'whopPlanId',
      type: 'text',
      index: true,
      admin: { description: 'The plan this sale was made against.' },
    },
    {
      name: 'whopMembershipId',
      type: 'text',
      index: true,
      admin: {
        description:
          'The membership the sale created. Carries the licence key and is ' +
          'what community access follows from.',
      },
    },
    {
      name: 'whopEnvironment',
      type: 'select',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'Sandbox', value: 'sandbox' },
      ],
      defaultValue: 'production',
      admin: {
        description:
          'Sandbox rows are test payments made with Whop test cards. They ' +
          'are kept so the whole flow can be checked, and left out of the ' +
          'revenue figures above.',
      },
    },
    {
      name: 'creemSubscriptionId',
      type: 'text',
      index: true,
      admin: {
        description:
          'Retainers only. Ties every renewal row back to one subscription.',
      },
    },
    {
      name: 'creemTransactionId',
      type: 'text',
      index: true,
      admin: {
        description:
          'Retainers only. The individual payment inside a subscription. ' +
          'Separate from creemOrderId because the first payment arrives twice: ' +
          'once as checkout.completed with an order id, once as ' +
          'subscription.paid with a transaction id. Keying renewals on this ' +
          'is what stops that first payment being banked as two sales.',
      },
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        description: 'Cents, as Creem sends them. 0 means a free claim.',
        components: {
          Cell: '@/components/admin/AmountCell#AmountCell',
        },
      },
    },
    { name: 'currency', type: 'text' },
    {
      name: 'githubUsername',
      type: 'text',
      admin: { description: 'Boilerplate orders — consumed by Phase B3.' },
    },
    {
      name: 'creemRequestId',
      type: 'text',
      index: true,
      admin: {
        description:
          'The id we minted when creating the checkout, echoed back by Creem ' +
          'on the webhook. It is how the post-payment onboarding page finds ' +
          'this row from a signed return URL, so it must stay indexed.',
      },
    },
    {
      name: 'licenseKey',
      type: 'text',
      admin: {
        description:
          'Issued by Creem, when the product has license keys enabled. Empty ' +
          'means the order issued none, not that one went missing.',
      },
    },
    {
      name: 'githubRepo',
      type: 'text',
      admin: {
        description:
          'owner/repo the invitation was sent to, copied from the product at ' +
          'purchase time. Stored rather than looked up, so a later catalogue ' +
          'edit cannot rewrite the history of what someone bought.',
      },
    },
    {
      name: 'githubInviteUrl',
      type: 'text',
      admin: {
        description:
          'GitHub accept link. Empty means no invitation was sent — that ' +
          'order needs one by hand.',
      },
    },
    {
      name: 'seatMembers',
      type: 'array',
      labels: { singular: 'Seat', plural: 'Seats' },
      admin: {
        description:
          'Every GitHub account this licence has granted, including the ' +
          'purchaser. The length is the seats used; the limit lives on the ' +
          'product. Rows are appended, never replaced, so removing someone ' +
          'here does not take their repository access away — do that on ' +
          'GitHub.',
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
    { name: 'accessTokenJti', type: 'text' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'paid',
      admin: { position: 'sidebar' },
    },
    {
      name: 'subscriptionStatus',
      type: 'select',
      options: [
        { label: 'Trialing', value: 'trialing' },
        { label: 'Active', value: 'active' },
        { label: 'Paid', value: 'paid' },
        { label: 'Past due', value: 'past_due' },
        { label: 'Cancels at period end', value: 'scheduled_cancel' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Retainers only. Empty on one-time purchases.',
      },
    },
    {
      name: 'fulfillmentStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Pending invite', value: 'pending_invite' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
        { label: 'Not required', value: 'not_required' },
      ],
      defaultValue: 'pending',
      admin: { position: 'sidebar' },
    },
  ],
}

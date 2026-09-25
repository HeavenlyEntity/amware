import type { CollectionConfig } from 'payload'

import { slugField } from '@/fields/slug'
import { creemProductField } from '@/fields/creem'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'order'],
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
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'digital',
      options: [
        { label: 'Digital Product', value: 'digital' },
        { label: 'Boilerplate', value: 'boilerplate' },
        { label: 'Service Package', value: 'service-package' },
      ],
    },
    { name: 'tagline', type: 'text' },
    /* Pricing-page presentation. A kit is one cell in a stack x tier grid,
       and the grid is built from these rather than parsed out of the slug --
       a naming convention is not a data model, and renaming a kit should not
       silently move it to another column. */
    {
      name: 'stack',
      type: 'select',
      options: [
        { label: 'React in NetSuite', value: 'react-netsuite' },
        { label: 'Next.js + NetSuite', value: 'next-netsuite' },
      ],
      admin: {
        description:
          'Which column of the pricing page this kit belongs to. Kits only.',
        position: 'sidebar',
      },
    },
    {
      name: 'tier',
      type: 'select',
      options: [
        { label: 'Lite', value: 'lite' },
        { label: 'Pro', value: 'pro' },
        { label: 'Team', value: 'team' },
      ],
      admin: {
        description: 'Which row. Sets the order the cards appear in.',
        position: 'sidebar',
      },
    },
    {
      name: 'popular',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Frames this tier as the recommended one. Only the first is used, ' +
          'so marking everything popular marks nothing.',
        position: 'sidebar',
      },
    },
    {
      name: 'pricingHighlights',
      type: 'array',
      labels: { singular: 'Highlight', plural: 'Pricing highlights' },
      admin: {
        description:
          'The short bullets on the pricing card — six or so, one line each. ' +
          'Separate from Features on purpose: the product page sells the ' +
          'kit, this column sells the difference between tiers.',
      },
      fields: [{ name: 'highlight', type: 'text', required: true }],
    },
    { name: 'description', type: 'richText' },
    {
      name: 'features',
      type: 'array',
      labels: { singular: 'Feature', plural: 'Features' },
      fields: [{ name: 'feature', type: 'text', required: true }],
    },
    {
      name: 'techStack',
      type: 'array',
      labels: { singular: 'Tech', plural: 'Tech Stack' },
      fields: [{ name: 'tech', type: 'text', required: true }],
    },
    creemProductField({
      currencyField: 'currency',
      priceLabelField: 'priceLabel',
    }),
    {
      name: 'whopPlanId',
      type: 'text',
      admin: {
        description:
          'The Whop plan a buyer checks out against in production. The plan ' +
          'is the product: the embed mounts from this id alone, and the id ' +
          'on the payment is how a sale finds its way back here.',
      },
    },
    {
      name: 'whopSandboxPlanId',
      type: 'text',
      admin: {
        description:
          "The same product's plan in Whop's sandbox, which is a separate " +
          'account with its own ids. Chosen when WHOP_ENV=sandbox.',
      },
    },
    { name: 'price', type: 'number' },
    {
      name: 'seats',
      type: 'number',
      defaultValue: 1,
      min: 1,
      admin: {
        description:
          'How many GitHub accounts this licence may invite. 1 for Lite and ' +
          'Pro, 5 for Team. The seat page refuses the seat past this number, ' +
          'so it is the licence, not a label.',
      },
    },
    { name: 'currency', type: 'text', defaultValue: 'USD' },
    {
      name: 'priceLabel',
      type: 'text',
      admin: { description: 'e.g. "one-time", "from"' },
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      name: 'ogImage',
      label: 'Social preview image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Optional 1200 × 630 social preview. Falls back to edition artwork for WareKit, or the product hero image and AMWare branding for other products.',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media' }],
    },
    {
      name: 'githubRepo',
      type: 'text',
      admin: {
        description:
          'owner/repo — reserved for the future GitHub-invite phase.',
      },
    },
    { name: 'demoUrl', type: 'text' },
    {
      name: 'downloadFile',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Deliverable for digital downloads.' },
    },
    {
      name: 'downloadUrl',
      type: 'text',
      admin: { description: 'Alternative external deliverable URL.' },
    },
    { name: 'featured', type: 'checkbox', defaultValue: false },
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

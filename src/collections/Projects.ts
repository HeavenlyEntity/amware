import type { CollectionConfig } from 'payload'

/* The Projects page content. Field names read well in the admin; the page
   still consumes the shape in content/site/projects.js, and
   lib/projects/cms.js maps one to the other (title/icon/body -> t/i/b,
   value/label -> v/l, link.url -> link.href). That static file stays as the
   fallback when the database is unreachable, so keep the two in step.
   KINDS and STATUS_LABELS in content/site/projects.js label the select
   values below. */
export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'status', 'date', 'onBench'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description:
          'Short lowercase id, e.g. "chamoji". Picks the logo and cover ' +
          'from the images in code; a key with no image gets a placeholder.',
        position: 'sidebar',
      },
      /* The key also becomes an element id and the drawer's lookup key. */
      validate: (value: string | null | undefined) => {
        if (!value) return 'Required.'
        return (
          /^[a-z0-9-]+$/.test(value) ||
          'Lowercase letters, numbers and hyphens only.'
        )
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Venture', value: 'venture' },
        { label: 'Client & enterprise', value: 'client' },
        { label: 'Open source', value: 'oss' },
        { label: 'Internal tool', value: 'internal' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Live', value: 'live' },
        { label: 'In development', value: 'development' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description:
          'Sorts the archive and places the project on the timeline.',
        position: 'sidebar',
      },
    },
    {
      name: 'onBench',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Shows the project in "On the bench" at the top of the page. ' +
          'Three at most.',
        position: 'sidebar',
      },
      validate: async (value: boolean | null | undefined, { req, id }) => {
        if (!value) return true
        const { totalDocs } = await req.payload.count({
          collection: 'projects',
          where: {
            onBench: { equals: true },
            ...(id ? { id: { not_equals: id } } : {}),
          },
          req,
        })
        return totalDocs < 3 || 'Only three projects can be on the bench.'
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description:
          'Orders the bench. The archive sorts newest first by date; this ' +
          'only breaks ties between projects on the same day.',
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'array',
      labels: { singular: 'Tag', plural: 'Tags' },
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'link',
      type: 'group',
      fields: [
        { name: 'url', type: 'text' },
        { name: 'label', type: 'text' },
      ],
    },
    {
      name: 'whatHappened',
      type: 'textarea',
      admin: { description: 'The "What happened" line on the card.' },
    },
    {
      name: 'org',
      type: 'text',
      admin: { description: 'Where it was built, e.g. "Built at NewGen".' },
    },
    {
      name: 'privateNote',
      type: 'textarea',
      admin: {
        description:
          'Replaces the default note shown when the project has no public link.',
      },
    },
    {
      name: 'story',
      type: 'group',
      admin: { description: 'The case study in the drawer.' },
      fields: [
        { name: 'lede', type: 'textarea' },
        {
          name: 'chapters',
          type: 'array',
          labels: { singular: 'Chapter', plural: 'Chapters' },
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'icon',
              type: 'select',
              required: true,
              options: [
                'search',
                'code',
                'rocket',
                'workflow',
                'customize',
                'blocks',
                'responsive',
                'computer',
                'system',
              ],
            },
            { name: 'body', type: 'textarea', required: true },
          ],
        },
        {
          name: 'results',
          type: 'array',
          labels: { singular: 'Result', plural: 'Results' },
          admin: {
            description:
              'Real outcomes only, never invented metrics. A whole number ' +
              '("26", "100+") counts up; anything else shows as written.',
          },
          fields: [
            { name: 'value', type: 'text', required: true },
            { name: 'label', type: 'text', required: true },
          ],
        },
        {
          name: 'team',
          type: 'group',
          fields: [
            {
              name: 'size',
              type: 'number',
              defaultValue: 0,
              min: 0,
              admin: {
                description:
                  'Number of builders, once confirmed. 0 shows the label ' +
                  'and note without the seat graphic.',
              },
            },
            { name: 'label', type: 'text' },
            { name: 'note', type: 'textarea' },
          ],
        },
        {
          name: 'stack',
          type: 'array',
          labels: { singular: 'Tech', plural: 'Stack' },
          fields: [{ name: 'label', type: 'text', required: true }],
        },
        {
          name: 'netsuite',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Shows the NetSuite badge in the drawer.' },
        },
      ],
    },
    {
      name: 'activity',
      type: 'json',
      admin: {
        description:
          'Sparkline values from 0 to 100, e.g. [5, 10, 20]. Not shown on ' +
          'the site yet.',
      },
      /* The drawer plots these on a 0-100 scale and needs two points to
         draw a line. */
      validate: (value: unknown) => {
        if (value == null) return true
        const ok =
          Array.isArray(value) &&
          value.length !== 1 &&
          value.every((v) => Number.isFinite(v) && v >= 0 && v <= 100)
        return ok || 'Use an empty list or two or more numbers from 0 to 100.'
      },
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
  ],
}

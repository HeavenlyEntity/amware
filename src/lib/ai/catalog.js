import { serializeLexical } from './serialize.js'

export const publicFields = {
  /* No service publishes a price (owner decision 2026-11-12): each is
     quoted on a call or from the contact form, so the stored figure and its
     period never leave Payload. */
  services: ['name', 'slug', 'summary', 'description', 'commitment'],
  products: [
    'name',
    'slug',
    'tagline',
    'description',
    'features',
    'techStack',
    'price',
    'currency',
    'priceLabel',
    'demoUrl',
  ],
  courses: ['title', 'slug', 'summary', 'description', 'level', 'price'],
  articles: [
    'title',
    'slug',
    'description',
    'content',
    'author',
    'publishedDate',
    'mdxSlug',
  ],
}
export async function readCatalog(payload, collection, page = 1) {
  if (!publicFields[collection]) throw new Error('Unsupported collection')
  const result = await payload.find({
    collection,
    overrideAccess: false,
    user: null,
    depth: 0,
    where: {
      and: [
        { status: { equals: 'published' } },
        ...(collection === 'articles'
          ? [
              {
                or: [
                  { mdxSlug: { exists: false } },
                  { mdxSlug: { equals: '' } },
                ],
              },
            ]
          : []),
      ],
    },
    select: Object.fromEntries(
      [...publicFields[collection], 'status', 'updatedAt'].map((key) => [
        key,
        true,
      ])
    ),
    sort: collection === 'articles' ? '-publishedDate' : 'order',
    limit: 30,
    page,
  })
  // Defense in depth: project to the explicit public contract even if a client ignores select.
  return {
    ...result,
    docs: result.docs
      .filter(
        (doc) =>
          doc.status === 'published' &&
          !(collection === 'articles' && doc.mdxSlug)
      )
      .map((doc) => ({
        title: doc.name ?? doc.title,
        slug: doc.slug,
        summary:
          typeof doc.summary === 'string'
            ? doc.summary
            : typeof doc.tagline === 'string'
            ? doc.tagline
            : typeof doc.description === 'string'
            ? doc.description
            : '',
        body: serializeLexical(
          collection === 'articles' ? doc.content : doc.description
        ),
        author: doc.author,
        published: doc.publishedDate,
        modified: doc.updatedAt,
        /* Services never carry a price here, even if select is ignored. */
        price: collection === 'services' ? undefined : doc.price,
        currency: doc.currency ?? 'USD',
        priceLabel: collection === 'services' ? undefined : doc.priceLabel,
        features: doc.features?.map((item) => item.feature),
        technologies: doc.techStack?.map((item) => item.tech),
        level: doc.level,
        commitment: doc.commitment,
        demo: doc.demoUrl,
      })),
  }
}
export async function allCatalog(payload, collection) {
  const docs = []
  let page = 1
  while (true) {
    const result = await readCatalog(payload, collection, page)
    docs.push(...result.docs)
    if (!result.hasNextPage) break
    if (!Number.isInteger(result.nextPage) || result.nextPage <= page)
      throw new Error('Invalid catalog pagination')
    page = result.nextPage
  }
  return docs
}

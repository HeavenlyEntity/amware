import { documentIndex } from '@/lib/ai/documents'
import { siteOrigin } from '@/lib/site-origin'

/* Public pages with no Markdown mirror, so documentIndex() never lists
   them. Founders' Desk is the site's best answer to "technical advisor for
   a non-technical founder", and it was missing from the sitemap entirely. */
const extraPages = [
  '/digital-products',
  '/products/standard',
  '/pricing',
  '/uses',
  '/founders',
  '/founders/equity',
  '/founders/job-offer',
  '/speaking',
  '/story',
]

export default async function sitemap() {
  const docs = await documentIndex()
  return [
    ...new Map(
      docs.map((doc) => [
        doc.source,
        {
          url: doc.source,
          ...(doc.modified ? { lastModified: doc.modified } : {}),
        },
      ])
    ).values(),
    ...extraPages.map((path) => ({ url: siteOrigin + path })),
    { url: docs[0].machine },
  ]
}

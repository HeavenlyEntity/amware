import { withSocialImage } from '@/lib/social/metadata'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { formatDate } from '@/lib/formatDate'
import { getPayloadClient } from '@/lib/getPayloadClient'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Blog',
    description: 'Writing published from the CMS.',
  },
  'blog'
)

export default async function BlogPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { status: { equals: 'published' } },
        { or: [{ mdxSlug: { exists: false } }, { mdxSlug: { equals: '' } }] },
      ],
    },
    sort: '-publishedDate',
    depth: 0,
    limit: 100,
  })

  return (
    <Container className="mt-16 sm:mt-32">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          Blog
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          Posts authored in the CMS. Looking for the older essays?{' '}
          <Link
            href="/articles"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            Read the articles archive
          </Link>
          .
        </p>
      </header>

      {docs.length === 0 ? (
        <p className="mt-16 text-zinc-500 dark:text-zinc-400">No posts yet.</p>
      ) : (
        <ul className="mt-16 space-y-12">
          {docs.map((post) => (
            <li key={post.id}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {post.publishedDate
                  ? formatDate(String(post.publishedDate).slice(0, 10))
                  : ''}
              </p>
              <h2 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {post.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}

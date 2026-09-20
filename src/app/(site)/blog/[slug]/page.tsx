import { cmsSocialImage, withSocialImage } from '@/lib/social/metadata'
import { TrackView } from '@/components/analytics/TrackView'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { RichText } from '@/components/site/RichText'
import { formatDate } from '@/lib/formatDate'
import { getPayloadClient } from '@/lib/getPayloadClient'

export const revalidate = 60

async function getPost(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: 'published' } },
        { or: [{ mdxSlug: { exists: false } }, { mdxSlug: { equals: '' } }] },
      ],
    },
    depth: 1,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateStaticParams() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { status: { equals: 'published' } },
        { or: [{ mdxSlug: { exists: false } }, { mdxSlug: { equals: '' } }] },
      ],
    },
    depth: 0,
    limit: 1000,
  })
  return docs.map((d) => ({ slug: d.slug as string }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return withSocialImage(
    {
      title: post.title,
      description: post.description ?? undefined,
      openGraph: { type: 'article' },
    },
    'blog',
    cmsSocialImage(post.ogImage)
  )
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type="blog" id={slug} name={post.title} />
      <article className="mx-auto max-w-2xl">
        <header>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {post.publishedDate
              ? formatDate(String(post.publishedDate).slice(0, 10))
              : ''}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
            {post.title}
          </h1>
        </header>
        <RichText data={post.content} className="mt-10" />
      </article>
    </Container>
  )
}

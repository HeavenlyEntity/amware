import Link from 'next/link'
import { Container } from '@/components/Container'

export default function BlogNotFound() {
  return (
    <Container className="mt-16 sm:mt-32">
      <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
        Post not found
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        That post doesn&apos;t exist or isn&apos;t published.{' '}
        <Link
          href="/blog"
          className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
        >
          Back to the blog
        </Link>
        .
      </p>
    </Container>
  )
}

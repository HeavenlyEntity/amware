import Link from 'next/link'
import { Container } from '@/components/Container'

export const metadata = {
  title: 'Checkout canceled',
  robots: { index: false },
}

export default function CheckoutCancel() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          Checkout canceled
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          No charge was made.{' '}
          <Link
            href="/products"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            Browse products
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}

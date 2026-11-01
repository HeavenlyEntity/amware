import { Container } from '@/components/Container'
import { ResendForm } from '@/components/commerce/ResendForm'

export const metadata = {
  title: 'Resend access link',
  robots: { index: false },
}

const firstParam = (value) => (Array.isArray(value) ? value[0] : value)

/* `intent=upgrade` is "Already on Pro? Pay only the difference", which only
   changes the words and the mail the action sends. Anything else is a plain
   resend. */
export default async function ResendPage({ searchParams }) {
  const query = (await searchParams) ?? {}
  const upgrading = firstParam(query.intent) === 'upgrade'

  return (
    <Container className="mt-16 sm:mt-32">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
          {upgrading ? 'Upgrade your license' : 'Resend your access link'}
        </h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {upgrading
            ? "Enter the email you bought with, and I'll send your license page."
            : "Enter the email you purchased with. If we find a purchase, we'll email a fresh link. For a digital product, the download link is in your receipt from Creem."}
        </p>
        <ResendForm intent={upgrading ? 'upgrade' : null} />
      </div>
    </Container>
  )
}

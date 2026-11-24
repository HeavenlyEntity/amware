import Link from 'next/link'

import { SimpleLayout } from '@/components/SimpleLayout'
import { LEGAL_DOCS, LEGAL_SETS, legalHref } from '@/content/legal/sets'
import { withSocialImage } from '@/lib/social/metadata'

export const metadata = withSocialImage(
  {
    title: 'Legal',
    description:
      'Terms of service, privacy and refund policies for WareKit, the fractional CTO services and the digital products.',
    alternates: { canonical: '/legal' },
    robots: { index: false, follow: true },
  },
  'pricing'
)

export default function LegalIndexPage() {
  return (
    <SimpleLayout
      title="Legal"
      intro="Each of AMWARE’s three lines has its own terms of service, privacy policy and refund policy. Pick the line you bought from or are about to buy from."
    >
      <div className="amw grid grid-cols-1 gap-10 md:grid-cols-3">
        {LEGAL_SETS.map((set) => (
          <section key={set.key} aria-labelledby={`legal-${set.key}`}>
            <h2
              id={`legal-${set.key}`}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {set.title}
            </h2>
            <ul className="mt-3 space-y-1">
              {LEGAL_DOCS.map((doc) => (
                <li key={doc.key}>
                  <Link
                    href={legalHref(set.key, doc.key)}
                    className="min-h-11 inline-flex items-center text-zinc-600 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={set.catalogHref}
              className="amw-kicker hover:text-[var(--amw-accent)] min-h-11 mt-2 inline-flex items-center transition-colors"
            >
              {set.catalogLabel} →
            </Link>
          </section>
        ))}
      </div>
    </SimpleLayout>
  )
}

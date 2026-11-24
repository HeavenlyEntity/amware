import Link from 'next/link'

import { Container } from '@/components/Container'
import { Prose } from '@/components/Prose'
import { Todo } from '@/components/legal/primitives'
import { LEGAL_DOCS, LEGAL_SETS, legalHref } from '@/content/legal/sets'

const TAB =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors'
const TAB_IDLE =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
const TAB_ACTIVE = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'

/* One policy page: the set's name, the document's title, tabs across the
   set's three documents, then the text. The other two sets are linked at the
   foot, because a buyer of one line may have landed on another's. */
export function LegalLayout({ set, doc, children }) {
  const otherSets = LEGAL_SETS.filter(({ key }) => key !== set.key)
  return (
    <Container className="mt-16 sm:mt-32">
      <header className="amw max-w-3xl">
        <Link
          href="/legal"
          className="amw-kicker hover:text-[var(--amw-accent)] min-h-11 inline-flex items-center transition-colors"
        >
          ← legal · {set.title}
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          {set.name} {doc.label.toLowerCase()}
        </h1>
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Last updated: <Todo>effective date</Todo>
        </p>
        <nav aria-label={`${set.name} policies`} className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {LEGAL_DOCS.map((item) => {
              const active = item.key === doc.key
              return (
                <li key={item.key}>
                  <Link
                    href={legalHref(set.key, item.key)}
                    aria-current={active ? 'page' : undefined}
                    className={`${TAB} ${active ? TAB_ACTIVE : TAB_IDLE}`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <Prose className="mt-12 max-w-3xl">{children}</Prose>

      <footer className="mt-16 max-w-3xl border-t border-zinc-200 pt-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          Looking for another line? See the policies for{' '}
          {otherSets.map((other, index) => (
            <span key={other.key}>
              {index > 0 && ' and '}
              <Link
                href={legalHref(other.key, doc.key)}
                className="text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
              >
                {other.name.toLowerCase()}
              </Link>
            </span>
          ))}
          .
        </p>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          Adapted from templates prepared and made publicly available by General
          Legal, PC (“General Legal”). They are provided for general reference
          purposes only and do not constitute legal advice. Use of the templates
          does not create an attorney-client relationship with General Legal,
          and General Legal has not reviewed, and takes no position on, the
          modifications made here.
        </p>
      </footer>
    </Container>
  )
}

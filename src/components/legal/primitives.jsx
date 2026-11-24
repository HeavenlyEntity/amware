import Link from 'next/link'

import { identity } from '@/content/site/identity'
import { legalHref } from '@/content/legal/sets'
import { siteOrigin } from '@/lib/site-origin'

/* Facts every policy repeats. Each comes from a confirmed source: the legal
   name and email from identity.js, the domain from the site origin. */
export const COMPANY = identity.legalName
export const CONTACT_EMAIL = identity.email
export const SITE_HOST = new URL(siteOrigin).host

/* A fact the repo cannot confirm. It renders on the page, highlighted, so a
   draft can never pass for a finished policy. */
export function Todo({ children }) {
  return (
    <mark className="text-amber-950 rounded-sm bg-amber-200 px-1 font-medium dark:bg-amber-300">
      TODO(alec): {children}
    </mark>
  )
}

export function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function EmailLink() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
}

/* A link to another document in the same set, e.g. the privacy policy from
   the terms. */
export function DocLink({ set, doc, children }) {
  return <Link href={legalHref(set.key, doc)}>{children}</Link>
}

import { notFound } from 'next/navigation'

import { LegalLayout } from '@/components/legal/LegalLayout'
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy'
import { RefundPolicy } from '@/components/legal/RefundPolicy'
import { TermsOfService } from '@/components/legal/TermsOfService'
import {
  LEGAL_DOCS,
  LEGAL_SETS,
  legalDoc,
  legalSet,
} from '@/content/legal/sets'
import { withSocialImage } from '@/lib/social/metadata'

/* Nine static pages: three documents for each of the three lines. Any other
   pair is a 404 at build time rather than a render. */
export const dynamicParams = false

export function generateStaticParams() {
  return LEGAL_SETS.flatMap((set) =>
    LEGAL_DOCS.map((doc) => ({ set: set.key, doc: doc.key }))
  )
}

const DOCUMENTS = {
  terms: TermsOfService,
  privacy: PrivacyPolicy,
  refund: RefundPolicy,
}

export async function generateMetadata({ params }) {
  const { set: setKey, doc: docKey } = await params
  const set = legalSet(setKey)
  const doc = legalDoc(docKey)
  if (!set || !doc) return {}
  return withSocialImage(
    {
      title: `${set.name} ${doc.label.toLowerCase()}`,
      description: `The ${doc.label.toLowerCase()} for AMWARE ${set.offering}.`,
      alternates: { canonical: `/legal/${set.key}/${doc.key}` },
      /* Kept out of search while the drafts carry TODO(alec) markers. */
      robots: { index: false, follow: true },
    },
    'pricing'
  )
}

export default async function LegalPage({ params }) {
  const { set: setKey, doc: docKey } = await params
  const set = legalSet(setKey)
  const doc = legalDoc(docKey)
  if (!set || !doc) notFound()
  const Document = DOCUMENTS[doc.key]
  return (
    <LegalLayout set={set} doc={doc}>
      <Document set={set} />
    </LegalLayout>
  )
}

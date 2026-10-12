import { withSocialImage } from '@/lib/social/metadata'
import HomeContent from './HomeContent'
import { getAllArticles } from '@/lib/getAllArticles'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema } from '@/lib/seo/schema'
import { faqs } from '@/content/site/faq'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: {
      absolute: 'Alec Mingione | Fractional CTO & AI Systems Consultant',
    },
    /* Meta keywords are ignored by search engines, so the credentials live
       in the visible copy and descriptions instead, worded exactly as they
       appear on /about: a Woz U certificate signed by Steve Wozniak, who
       founded the school, and Brian Meece's mentorship. */
    description:
      'Phoenix-based fractional CTO and AI systems consultant. Alec Mingione gives founders senior ownership of architecture, AI and Next.js engineering.',
    authors: [{ name: 'Alec Mingione', url: '/about' }],
    creator: 'Alec Mingione',
    publisher: 'AMWARE Technologies LLC',
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: 'AMWARE',
      title: 'Alec Mingione | Fractional CTO & AI Systems Consultant',
      description:
        'Fractional CTO and AI systems consultant. Woz U certified, with a certificate signed by Apple co-founder Steve Wozniak, and mentored by Brian Meece, founder of RocketHub and Green Light Go.',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@AmwareDotDev',
      creator: '@AmwareDotDev',
      title: 'Alec Mingione | Fractional CTO & AI Systems Consultant',
      description:
        'Fractional CTO and AI systems consultant. Woz U certificate signed by Steve Wozniak; mentored by Brian Meece of RocketHub and Green Light Go.',
    },
  },
  'home'
)

export default async function HomePage() {
  const articles = (await getAllArticles())
    .slice(0, 4)
    .map(({ component, ...meta }) => meta)

  let products = []
  let services = []
  let kits = []
  let catalogError = false

  try {
    const payload = await getPayloadClient()
    const [productsRes, servicesRes] = await Promise.all([
      payload.find({
        collection: 'products',
        where: { status: { equals: 'published' } },
        sort: 'order',
        depth: 1,
        limit: 24,
      }),
      payload.find({
        collection: 'services',
        /* The homepage's retainer offers are the Consulting track only; a
           Build & support service belongs on /services' other tab. */
        where: {
          status: { equals: 'published' },
          category: { equals: 'consulting' },
        },
        sort: 'order',
        depth: 0,
        limit: 6,
      }),
    ])

    // Featured products lead; fall back to catalog order when none are flagged.
    const featured = productsRes.docs.filter((p) => p.featured)
    products = (featured.length > 0 ? featured : productsRes.docs).slice(0, 3)
    services = servicesRes.docs.slice(0, 3)
    /* The published kits, for the homepage tier cards. Same rows /pricing
       reads, so the two pages cannot quote different prices. */
    kits = productsRes.docs.filter((p) => p.type === 'boilerplate')
  } catch {
    catalogError = true
  }

  return (
    <>
      {/* The same list the FAQ accordion renders on this page. */}
      <JsonLd data={faqSchema(faqs)} />
      <HomeContent
        articles={articles}
        products={products}
        services={services}
        kits={kits}
        catalogError={catalogError}
      />
    </>
  )
}

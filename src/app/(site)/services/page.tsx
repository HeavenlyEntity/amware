import { withSocialImage } from '@/lib/social/metadata'
import { Container } from '@/components/Container'
import { TrackView } from '@/components/analytics/TrackView'
import { RichText } from '@/components/site/RichText'
import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  StoreHero,
  StoreEmpty,
  ServiceCard,
} from '@/components/commerce/storefront'
import { groupServices } from '@/lib/services/tracks'
import { ServiceTracks } from '@/components/services/service-tracks'
import { BigTestimonial } from '@/components/testimonials/big-testimonial'
import { MasonryTestimonials } from '@/components/testimonials/masonry-testimonials'
import { servicesTestimonials } from '@/lib/testimonials/services-testimonials'
import { WebsitePackage } from '@/components/website-package'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Services',
    description:
      'Fractional CTO leadership and focused engineering engagements — scoped, senior, outcome-driven.',
  },
  'services'
)

export default async function ServicesPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    where: { status: { equals: 'published' } },
    sort: 'order',
    depth: 0,
    limit: 100,
  })

  const { consulting, technical } = groupServices(docs)
  const proof = servicesTestimonials({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
  const cards = (list: typeof docs) => (
    <ul className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
      {list.map((service, i) => (
        <ServiceCard
          key={service.id}
          service={service}
          index={i}
          description={
            <RichText data={service.description} className="prose-sm" />
          }
        />
      ))}
    </ul>
  )

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type="services" id="services" name="Services" />
      <div className="amw">
        <StoreHero
          eyebrow="// AMWARE · ENGAGEMENTS"
          title="Work with the engineer behind the tools."
          intro="Fractional CTO leadership and focused build engagements — scoped, senior, and pointed at the outcome instead of the hours."
          meta={
            <>
              <span className="amw-chip amw-chip--accent amw-chip--dot">
                {docs.length} engagements
              </span>
              <span className="amw-chip">remote-first</span>
            </>
          }
        />

        <ServiceTracks
          panels={{
            consulting: consulting.length ? (
              cards(consulting)
            ) : (
              <StoreEmpty label="consulting track" />
            ),
            technical: (
              <>
                {technical.length > 0 && cards(technical)}
                <WebsitePackage />
              </>
            ),
          }}
        />

        {/* Below both tracks, where the objection forms: what the people
            on the other side of the work said. */}
        <div className="mt-24 sm:mt-32">
          <BigTestimonial
            featured={proof.featured}
            supporting={proof.supporting}
          />
          <MasonryTestimonials items={proof.wall} />
        </div>
      </div>
    </Container>
  )
}

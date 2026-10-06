import { withSocialImage } from '@/lib/social/metadata'
import { Container } from '@/components/Container'
import { TrackView } from '@/components/analytics/TrackView'
import { RichText } from '@/components/site/RichText'
import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  StoreHero,
  StoreEmpty,
  ServiceCard,
  ServiceGrid,
  ServiceStrip,
} from '@/components/commerce/storefront'
import { groupServices } from '@/lib/services/tracks'
import { pricedGridClass, splitByPrice } from '@/lib/services/layout'
import { cn } from '@/lib/utils'
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
  const body = (service: (typeof docs)[number]) => (
    <RichText data={service.description} className="prose-sm" />
  )
  /* The studio template's pricing section: priced services side by side at
     equal height, joined by 1px seams in one frame, then anything without a
     price as a wide strip underneath. */
  const cards = (list: typeof docs) => {
    const { priced, unpriced } = splitByPrice(list)
    return (
      <>
        {priced.length > 0 && (
          <ServiceGrid
            className={cn(
              'bg-[var(--amw-line)] ring-[var(--amw-line)] grid grid-cols-1 gap-px overflow-hidden rounded-2xl ring-1',
              pricedGridClass(priced.length)
            )}
          >
            {priced.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                description={body(service)}
              />
            ))}
          </ServiceGrid>
        )}
        {unpriced.length > 0 && (
          <ul
            className={cn('flex flex-col gap-4', priced.length > 0 && 'mt-6')}
          >
            {unpriced.map((service) => (
              <ServiceStrip
                key={service.id}
                service={service}
                description={body(service)}
              />
            ))}
          </ul>
        )}
      </>
    )
  }

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

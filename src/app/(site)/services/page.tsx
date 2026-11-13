import { withSocialImage } from '@/lib/social/metadata'
import { TrackView } from '@/components/analytics/TrackView'
import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  StoreEmpty,
  ServiceCard,
  ServiceGrid,
  ServiceStrip,
} from '@/components/commerce/storefront'
import { groupServices } from '@/lib/services/tracks'
import { pricedGridClass, splitByPrice } from '@/lib/services/layout'
import { strategyCall } from '@/lib/services/strategy-call'
import { cn } from '@/lib/utils'
import { DeskMotionSync } from '@/components/founders/desk/motion-flag'
import { ServicesHero } from '@/components/services/services-hero'
import { Engagements } from '@/components/services/engagements'
import { BookBand } from '@/components/services/book-band'
import {
  FitCheck,
  PainPoints,
  RiskReversal,
  ServicesFaq,
} from '@/components/services/conversion'
import { ServiceBody } from '@/components/services/service-body'
import { EngagementsLoadError } from '@/components/services/load-error'
import { BigTestimonial } from '@/components/testimonials/big-testimonial'
import { MasonryTestimonials } from '@/components/testimonials/masonry-testimonials'
import { servicesTestimonials } from '@/lib/testimonials/services-testimonials'
import { WebsitePackage } from '@/components/website-package'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema, servicesSchema } from '@/lib/seo/schema'
import { faqItems } from '@/content/site/services-page'
import type { Service } from '@/payload-types'
import '@/styles/services.css'

export const revalidate = 60

// TODO(alec): confirm the description's promises match the engagements.
export const metadata = withSocialImage(
  {
    title: { absolute: 'Fractional CTO for Apps Out of Control | AMWARE' },
    description:
      'AI-built app breaking with every fix, or a vendor who stopped answering? A fractional CTO to find what is costing you users, close the security holes and steady the product. Scoped on a strategy call, remote-first.',
    alternates: { canonical: '/services' },
  },
  'services'
)

/* /services, rebuilt to the services board (Main.dc.html and
   HeroMobile.dc.html, with the conversion pass from ServicesConvert.dc.html):
   the hero over the work wall, the buyer's problems in their own words,
   what the people on the other side of the work said, the two engagement
   tracks, the risk reversal, the fit check, the objections, and the book
   band for anyone still undecided. Everything bookable comes from the Payload
   `services` rows; no service shows a figure (owner decision 2026-11-12).
   The page's own words are in content/site/services-page.js. */

async function loadServices(): Promise<{
  docs: Service[]
  loadError: boolean
}> {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'services',
      where: { status: { equals: 'published' } },
      sort: 'order',
      depth: 0,
      limit: 100,
    })
    return { docs, loadError: false }
  } catch (err) {
    // A public page degrades, never throws: the hero and band still sell
    // the strategy call (through the contact form) while the cards are out.
    console.error('Services lookup failed', err)
    return { docs: [], loadError: true }
  }
}

export default async function ServicesPage() {
  const { docs, loadError } = await loadServices()
  const { consulting, technical } = groupServices(docs)
  const { booking } = strategyCall(consulting)
  /* The hero, band and cards take the deposit only through a Cal.com link;
     without one the refund promise and its FAQ answer stay off the page. */
  const hasDeposit = Boolean(booking)
  const faqs = faqItems(hasDeposit)
  const proof = servicesTestimonials({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
  const body = (service: Service) => <ServiceBody data={service.description} />
  /* The studio template's pricing section: priced services side by side at
     equal height, joined by 1px seams in one frame, then anything without a
     price as a wide strip underneath. */
  const cards = (list: Service[]) => {
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
    <div className="amw svc">
      {/* Built from the same Payload rows as the cards below; the schema
          leaves every figure out itself. */}
      <JsonLd data={servicesSchema(docs)} />
      <JsonLd data={faqSchema(faqs)} />
      <TrackView type="services" id="services" name="Services" />
      <DeskMotionSync />

      <ServicesHero booking={booking} />

      <PainPoints booking={booking} />

      {/* Before the tracks: what the people on the other side of the work
          said (owner decision F1). */}
      <div className="svc-wrap svc-proof">
        <BigTestimonial
          featured={proof.featured}
          supporting={proof.supporting}
        />
        <MasonryTestimonials items={proof.wall} />
      </div>

      <Engagements
        retainerCount={splitByPrice(consulting).priced.length}
        consulting={
          loadError ? (
            <EngagementsLoadError />
          ) : consulting.length ? (
            cards(consulting)
          ) : (
            <StoreEmpty label="consulting track" />
          )
        }
        technical={
          <>
            {technical.length > 0 && cards(technical)}
            <WebsitePackage />
          </>
        }
      />

      {hasDeposit && <RiskReversal />}
      <FitCheck />
      <ServicesFaq hasDeposit={hasDeposit} />

      <BookBand booking={booking} />
    </div>
  )
}

import { withSocialImage } from '@/lib/social/metadata'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { TrackView } from '@/components/analytics/TrackView'
import { inlineCode } from '@/components/site/inline-code'
import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  buildPricingTable,
  cta,
  highlights,
  popularId,
  priceLabel,
  periodLabel,
  seatLine,
  STACK_BLURB,
  STACK_LABEL,
  type PricingKit,
} from '@/lib/commerce/pricingTable'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Pricing',
    description:
      'WareKit pricing: free Lite kits, single-seat Pro licences and five-seat Team licences for the AMWARE NetSuite starter kits.',
  },
  'pricing'
)

/* Everything commercial is read from Payload: prices, seats, bullets, which
   column a kit sits in, which tier is framed as recommended, and the copy
   around the table. What is hardcoded is the shape -- three tiers across,
   stacks stacked down -- because that is layout, not content.

   The table logic lives in @/lib/commerce/pricingTable and is tested there.
   A wrong price on this page is the expensive kind of bug, and a server
   component that awaits a database is the worst place to test one.

   A price quoted here is also what Creem is told during merchant
   verification. They must not drift, which is one more reason for one
   source rather than two. */
export default async function PricingPage() {
  const payload = await getPayloadClient()

  const [{ docs }, copy] = await Promise.all([
    payload.find({
      collection: 'products',
      where: {
        and: [
          { type: { equals: 'boilerplate' } },
          { status: { equals: 'published' } },
        ],
      },
      depth: 0,
      limit: 100,
      sort: 'order',
    }),
    payload.findGlobal({ slug: 'pricing-page' }).catch(() => null),
  ])

  const kits = docs as unknown as PricingKit[]

  const stacks = buildPricingTable(kits)
  const popular = popularId(kits)

  const faqs = (copy?.faqs ?? []) as { question: string; answer: string }[]

  /* With every kit held back, the whole page is framing for a table that is
     not there: a heading promising "the kit is yours", an intro explaining
     Lite, a footnote about repository access, and an FAQ answering questions
     about seats nobody can buy. Rendering all of it above "nothing is on sale"
     makes the page contradict itself, so the empty state replaces the page
     rather than sitting inside it. It comes back on its own the moment a kit
     is published. */
  if (stacks.length === 0) {
    return (
      <Container className="mt-16 sm:mt-32">
        <div className="amw mx-auto max-w-2xl">
          <p className="amw-kicker">{copy?.eyebrow || 'pricing'}</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            The kits are not on sale yet
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            They are being finished. When they go up, this page carries the
            tiers, the seat counts and what each edition includes.
          </p>
          <p className="mt-8">
            <Link href="/contact" className="amw-cta inline-flex max-w-xs">
              Tell me when they are ready
            </Link>
          </p>
          <p className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
            Looking for the retainers instead?{' '}
            <Link
              href="/services"
              className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
            >
              The engagements are live
            </Link>
            .
          </p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type="pricing" id="pricing" name="Pricing" />
      <div className="amw">
        <p className="amw-kicker">{copy?.eyebrow || 'pricing'}</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          {copy?.heading || 'One payment. The kit is yours.'}
        </h1>
        {copy?.intro && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            {copy.intro}
          </p>
        )}

        {stacks.map(({ stack, tiers }) => (
          <section key={stack} className="mt-16">
            <p className="amw-eyebrow">{`// ${STACK_LABEL[stack] ?? stack}`}</p>
            {STACK_BLURB[stack] && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {STACK_BLURB[stack]}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {tiers.map((kit) => {
                const highlighted = kit.id === popular
                const action = cta(kit)
                const bullets = highlights(kit)

                return (
                  <div
                    key={kit.id}
                    className={`amw-card min-h-112.5 flex flex-col p-6 ${
                      highlighted
                        ? 'border-[var(--amw-accent)] ring-[var(--amw-accent)] ring-1'
                        : ''
                    } ${action.soon ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {kit.name}
                      </h2>
                      {action.soon ? (
                        /* Said on the card, not only on the button. Someone
                           scanning three prices reads the chip long before
                           they reach the call to action. */
                        <span className="amw-chip shrink-0">soon</span>
                      ) : (
                        highlighted && (
                          <span className="amw-chip amw-chip--accent amw-chip--dot shrink-0">
                            popular
                          </span>
                        )
                      )}
                    </div>

                    <p className="amw-price mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {priceLabel(kit)}
                    </p>
                    <p className="amw-kicker mt-1">{periodLabel(kit)}</p>

                    {kit.tagline && (
                      <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {kit.tagline}
                      </p>
                    )}

                    <ul className="mt-6 space-y-3">
                      {/* Seats first and always, generated rather than typed:
                          it is the licence, and it must match what the seat
                          page actually enforces. */}
                      <li className="amw-check text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {seatLine(kit)}
                      </li>
                      {bullets.map((b, i) => (
                        <li
                          key={i}
                          className="amw-check text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                        >
                          {inlineCode(b)}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-8">
                      {action.live ? (
                        <Link
                          href={`/products/${kit.slug}`}
                          className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                            highlighted
                              ? 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
                              : 'border-[var(--amw-line)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent)] border text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {action.label}
                        </Link>
                      ) : (
                        <p className="amw-kicker border-[var(--amw-line)] rounded-md border border-dashed px-4 py-2 text-center">
                          {action.label}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {copy?.footnote && (
          <p className="mt-14 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {copy.footnote}
          </p>
        )}

        {faqs.length > 0 && (
          <section className="mt-20">
            <p className="amw-eyebrow">{'// questions'}</p>
            <dl className="mt-8 max-w-2xl space-y-8">
              {faqs.map((f, i) => (
                <div key={i}>
                  <dt className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </Container>
  )
}

import { withProductSocialImage } from '@/lib/social/metadata'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { TrackView } from '@/components/analytics/TrackView'
import { RichText } from '@/components/site/RichText'
import { inlineCode } from '@/components/site/inline-code'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { BuyButton } from '@/components/commerce/BuyButton'
import { CreemBuyButton } from '@/components/commerce/CreemBuyButton'
import { planId } from '@/lib/commerce/whopEnv'
import { checkoutRoute } from '@/lib/commerce/checkoutRoute'
import { ClaimFreeKit } from '@/components/commerce/ClaimFreeKit'
import { StackLogos } from '@/components/commerce/StackChips'
import {
  accountsLabel,
  developersLabel,
  kitLimits,
} from '@/lib/commerce/kitEditions'
import { KitBuyNotes } from '@/components/warekit/kit-buy-notes'
import { ACCOUNTS_NOTE } from '@/content/site/warekit'
import { usd } from '@/lib/commerce/money'
import { typeMeta } from '@/components/commerce/storefront'

export const revalidate = 60

function safeHref(u?: string | null) {
  if (!u) return null
  try {
    const url = new URL(u, 'https://placeholder.local')
    return url.protocol === 'http:' || url.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

async function getProduct(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 1,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateStaticParams() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    depth: 0,
    limit: 1000,
  })
  return docs.map((d) => ({ slug: d.slug as string }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}
  return withProductSocialImage(
    { title: product.name, description: product.tagline ?? undefined },
    product
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const hero =
    product.heroImage && typeof product.heroImage === 'object'
      ? product.heroImage.url
      : null
  const t = typeMeta(product.type)
  const stack = Array.isArray(product.techStack) ? product.techStack : []
  const features = Array.isArray(product.features) ? product.features : []
  const demoHref = safeHref(product.demoUrl)
  const isBoilerplate = product.type === 'boilerplate'
  const isDigital = product.type === 'digital'
  /* Free is a price of exactly 0, not a missing price. A kit with no price
     set is unfinished and shows "Soon"; a kit priced at 0 is a deliberate
     free tier and is claimed rather than bought. */
  const isFree = product.price === 0
  // Kits and digital products sell through Creem; anything else keeps its
  // Whop plan. Nothing is on sale until the route says so.
  const route = checkoutRoute(product)
  const price = typeof product.price === 'number' ? product.price : undefined
  // Developers and NetSuite accounts come from the row, never from copy.
  const limits = kitLimits(product)
  // The refund terms belong to a paid kit with a checkout, nothing else.
  const paidKit = isBoilerplate && !isFree && route === 'creem'

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type={product.type} id={product.slug} name={product.name} />
      <div className="amw">
        <Link
          href={isDigital ? '/digital-products' : '/products'}
          className="amw-kicker hover:text-[var(--amw-accent)] inline-flex items-center gap-2 transition-colors"
        >
          {isDigital ? '← all digital products' : '← all products'}
        </Link>

        <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-14">
          {/* ---- main column ---- */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`amw-chip ${
                  t.accent ? 'amw-chip--accent amw-chip--dot' : ''
                }`}
              >
                {t.label}
              </span>
              <span className="amw-kicker">/{product.slug}</span>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              {product.name}
            </h1>
            {product.tagline && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                {product.tagline}
              </p>
            )}

            {hero && (
              <div className="amw-ticks border-[var(--amw-line)] bg-[var(--amw-card-2)] relative mt-10 overflow-hidden rounded-xl border">
                <div
                  className="amw-grid-bg absolute inset-0 opacity-50"
                  aria-hidden="true"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero}
                  alt={product.name}
                  className="relative mx-auto max-h-[480px] w-full object-contain p-4"
                />
              </div>
            )}

            {product.description && (
              <section className="mt-12">
                <p className="amw-eyebrow">{'// overview'}</p>
                <RichText data={product.description} className="mt-4" />
              </section>
            )}

            {features.length > 0 && (
              <section className="mt-12">
                <p className="amw-eyebrow">{'// what’s included'}</p>
                <ul className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {features.map((f, i) => (
                    <li
                      key={i}
                      className="amw-check text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                    >
                      {/* A plain text field cannot carry formatting, so the
                          backtick convention is resolved here. The rich text
                          above needs none of this -- it stores its own. */}
                      {inlineCode(f.feature)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---- spec / buy rail ---- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* --static: this card holds a form, so it must not move when the
                pointer crosses it on the way to the input. See storefront.css. */}
            <div className="amw-card amw-card--static amw-ticks p-6">
              {/* The plan-card treatment from the minimal template: price on
                  its own line, terms beneath it, never inline. At this width
                  "one-time · USD" wrapped under a four-character price but not
                  under "Free", so the two states disagreed with each other. */}
              <p className="amw-price text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
                {isFree
                  ? 'Free'
                  : typeof product.price === 'number'
                  ? usd(product.price)
                  : 'Soon'}
              </p>
              <p className="amw-kicker mt-2">
                {isFree
                  ? 'no card required'
                  : `${product.priceLabel || 'one-time'} · ${
                      product.currency || 'USD'
                    }`}
              </p>

              <dl className="mt-6">
                <div className="amw-spec">
                  <dt>type</dt>
                  <dd>{t.label}</dd>
                </div>
                {stack.length > 0 && (
                  /* The marks themselves, not a count of them. "8
                     technologies" told a buyer how many things they were not
                     being told. */
                  <div className="amw-spec amw-spec--logos">
                    <dt>stack</dt>
                    <dd>
                      <StackLogos stack={stack} onCard />
                    </dd>
                  </div>
                )}
                {features.length > 0 && (
                  <div className="amw-spec">
                    <dt>includes</dt>
                    <dd>{features.length} items</dd>
                  </div>
                )}
                {isBoilerplate && (
                  /* The license, on the page where it is bought, in the same
                     words as the pricing table. Lite tracks no accounts, so
                     it has no accounts row to say "1" on. */
                  <>
                    <div className="amw-spec">
                      <dt>developers</dt>
                      <dd>{developersLabel(limits.seats)}</dd>
                    </div>
                    {limits.netsuiteAccounts !== null && (
                      <div className="amw-spec">
                        <dt>netsuite accounts</dt>
                        <dd>{accountsLabel(limits.netsuiteAccounts)}</dd>
                      </div>
                    )}
                  </>
                )}
                <div className="amw-spec">
                  <dt>delivery</dt>
                  <dd>{isBoilerplate ? 'GitHub invite' : 'instant link'}</dd>
                </div>
              </dl>
              {isBoilerplate && limits.netsuiteAccounts !== null && (
                <p className="amw-kicker mt-3 normal-case tracking-normal">
                  {ACCOUNTS_NOTE}
                </p>
              )}

              {isFree && isBoilerplate ? (
                <ClaimFreeKit slug={product.slug} />
              ) : route === 'whop' ? (
                <BuyButton
                  planId={planId(product)}
                  itemType="product"
                  slug={product.slug}
                  price={price}
                  name={product.name}
                />
              ) : route === 'creem' ? (
                <CreemBuyButton
                  slug={product.slug}
                  name={product.name}
                  price={price}
                >
                  Buy now
                </CreemBuyButton>
              ) : (
                /* The same dashed panel the pricing table uses, rather than a
                   line of grey text that reads like something failed to
                   load. A priced product with no checkout behind it is in
                   development, which is a different thing from unfinished. */
                <p className="amw-kicker amw-cta-pending mt-8">
                  {typeof product.price === 'number'
                    ? 'in development'
                    : 'not yet available'}
                </p>
              )}

              <KitBuyNotes
                paid={paidKit}
                tier={product.tier}
                className="mt-4 space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400"
              />

              {demoHref && (
                <a
                  href={demoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="amw-mono border-[var(--amw-line)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent)] mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-zinc-700 transition-colors dark:text-zinc-300"
                >
                  live demo ↗
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Container>
  )
}

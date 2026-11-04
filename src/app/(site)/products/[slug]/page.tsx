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
import { StackPills } from '@/components/commerce/StackChips'
import {
  accountsLabel,
  developersLabel,
  kitLimits,
} from '@/lib/commerce/kitEditions'
import { KitBuyNotes } from '@/components/warekit/kit-buy-notes'
import { ACCOUNTS_NOTE, storyFor } from '@/content/site/warekit'
import { typeMeta } from '@/components/commerce/storefront'
import { RingLink } from '@/components/site/ChevronCta'
import {
  HighlightedText,
  IncludedList,
  KitStorySections,
} from '@/components/warekit/kit-story'
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconCircleCheck,
  IconLink,
  IconLock,
  IconServer,
  IconUsers,
} from '@tabler/icons-react'

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

/* The plain text of a rich-text field, so the page can tell whether the
   description already says something the story would repeat. */
function richText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: unknown; children?: unknown; root?: unknown }
  if (n.root) return richText(n.root)
  const own = typeof n.text === 'string' ? n.text : ''
  const kids = Array.isArray(n.children)
    ? n.children.map(richText).join(' ')
    : ''
  return `${own} ${kids}`.replace(/\s+/g, ' ').trim()
}

const TIER_NAMES: Record<string, string> = {
  lite: 'Lite',
  pro: 'Pro',
  team: 'Team',
}

const SPEC_ICON = {
  size: 18,
  stroke: 1.5,
  'aria-hidden': true,
  className: 'amw-kit-ic shrink-0',
} as const

function Spec({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof IconUsers
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="amw-kit-spec">
      <dt>
        <Icon {...SPEC_ICON} />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
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

  /* The illustrated sections, from content/site/warekit.js. A product with
     no story gets its plain features list and nothing invented. */
  const story = isBoilerplate ? storyFor(product.stack, product.tier) : null
  const tierName = product.tier ? TIER_NAMES[product.tier] : null
  /* The Pro row's description already carries the "the rest is roadmap"
     paragraph; the story repeats it under the features only where it does
     not. */
  const description = richText(product.description)
  const showRoadmap = Boolean(
    story?.roadmap && !description.includes(story.roadmap)
  )

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type={product.type} id={product.slug} name={product.name} />
      <div className="amw">
        <Link
          href={isDigital ? '/digital-products' : '/products'}
          className="amw-kicker amw-kit-rise hover:text-[var(--amw-accent-ink)] min-h-11 group inline-flex items-center gap-2 transition-colors"
        >
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none"
          >
            ←
          </span>
          {isDigital ? 'all digital products' : 'all products'}
        </Link>

        <div className="mt-5 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          {/* ---- main column ---- */}
          <div className="min-w-0">
            {/* A brand device, not a command anyone runs: hidden from
                assistive tech, which gets the heading below instead. */}
            <p
              aria-hidden="true"
              className="amw-mono amw-kit-rise text-[var(--amw-mut)] text-xs"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              <span className="text-[var(--amw-accent-ink)]" aria-hidden="true">
                ${' '}
              </span>
              amware catalog --show {product.slug.replace(/^warekit-/, '')}
              <span className="amw-cursor" aria-hidden="true" />
            </p>

            <div
              className="amw-kit-rise mt-[18px] flex flex-wrap items-center gap-2"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              <span
                className={`amw-kit-chip ${
                  t.accent ? 'amw-kit-chip--accent' : ''
                }`}
              >
                {t.accent && (
                  <span className="amw-kit-dot" aria-hidden="true" />
                )}
                {t.label}
              </span>
              {tierName && (
                <span className="amw-kit-chip">{tierName} edition</span>
              )}
            </div>

            <h1
              className="amw-kit-blur mt-5 text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-[3.75rem]"
              style={{ '--i': 3 } as React.CSSProperties}
            >
              {product.name}
            </h1>
            {product.tagline && (
              <p
                className="amw-kit-rise text-[var(--amw-mut)] mt-6 max-w-[40rem] text-lg leading-[1.7] tracking-[-0.01em] sm:text-[1.375rem]"
                style={{ '--i': 5 } as React.CSSProperties}
              >
                <HighlightedText
                  text={product.tagline}
                  phrases={story?.highlights}
                />
              </p>
            )}

            {stack.length > 0 && (
              <div
                className="amw-kit-rise mt-7"
                style={{ '--i': 6 } as React.CSSProperties}
              >
                <StackPills stack={stack} />
              </div>
            )}

            {hero && (
              <div className="amw-kit-panel mt-10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero}
                  alt={product.name}
                  className="mx-auto max-h-[480px] w-full object-contain p-4"
                />
              </div>
            )}

            {product.description && (
              <section className="mt-[4.5rem]">
                <p className="amw-eyebrow">{'// overview'}</p>
                <RichText data={product.description} className="mt-4" />
              </section>
            )}

            {story ? (
              <KitStorySections
                story={story}
                features={features}
                showRoadmap={showRoadmap}
              />
            ) : (
              <IncludedList features={features} />
            )}
          </div>

          {/* ---- buy rail ---- */}
          <aside
            className="amw-kit-rise lg:sticky lg:top-24 lg:self-start"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            {/* A panel that holds a form: it glows on focus-within and never
                moves, so the field cannot shift out from under the pointer
                on its way in. */}
            <div className="amw-kit-panel amw-kit-rim px-6 pb-6 pt-7">
              {/* Terms above the price, on their own line, so "Free" and a
                  four-figure price sit the same way. */}
              <p className="amw-kicker">
                {isFree
                  ? 'no card required'
                  : `${product.priceLabel || 'one-time'} · ${
                      product.currency || 'USD'
                    }`}
              </p>
              <p className="mt-3 text-5xl font-bold tabular-nums leading-none tracking-[-0.04em] text-zinc-900 dark:text-zinc-50 sm:text-[3.25rem]">
                {isFree
                  ? 'Free'
                  : typeof product.price === 'number'
                  ? `$${product.price.toFixed(2)}`
                  : 'Soon'}
              </p>

              <dl className="mt-[22px]">
                {isBoilerplate && (
                  /* The license, on the page where it is bought, in the same
                     words as the pricing table. Lite tracks no accounts, so
                     it has no accounts row to say "1" on. */
                  <>
                    <Spec icon={IconUsers} label="Developers">
                      {developersLabel(limits.seats)}
                    </Spec>
                    {limits.netsuiteAccounts !== null && (
                      <Spec icon={IconServer} label="NetSuite accounts">
                        {accountsLabel(limits.netsuiteAccounts)}
                      </Spec>
                    )}
                  </>
                )}
                {features.length > 0 && (
                  <Spec icon={IconCircleCheck} label="Includes">
                    {features.length} items
                  </Spec>
                )}
                <Spec
                  icon={isBoilerplate ? IconBrandGithub : IconLink}
                  label="Delivery"
                >
                  {isBoilerplate ? 'GitHub invite' : 'instant link'}
                </Spec>
              </dl>
              {isBoilerplate && limits.netsuiteAccounts !== null && (
                <p className="text-[var(--amw-mut)] mt-3 text-xs leading-relaxed">
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
                  className="mt-6"
                >
                  Buy now
                </CreemBuyButton>
              ) : (
                /* The same dashed panel the pricing table uses, rather than a
                   line of grey text that reads like something failed to
                   load. A priced product with no checkout behind it is in
                   development, which is a different thing from unfinished. */
                <p className="amw-kicker amw-cta-pending mt-6">
                  {typeof product.price === 'number'
                    ? 'in development'
                    : 'not yet available'}
                </p>
              )}

              {isBoilerplate && (
                <RingLink href="/pricing" className="mt-2.5">
                  Compare Lite, Pro and Team
                </RingLink>
              )}

              {demoHref && (
                <a
                  href={demoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--amw-accent-ink)] hover:ring-[var(--amw-accent)] min-h-12 ring-zinc-900/15 mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-5 text-sm font-medium text-zinc-700 no-underline ring-1 ring-inset transition-colors duration-200 dark:text-zinc-200 dark:ring-white/[0.18]"
                >
                  Live demo
                  <IconArrowUpRight size={16} stroke={1.5} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}

              <KitBuyNotes
                paid={paidKit}
                tier={product.tier}
                withIcons
                className="text-[var(--amw-mut)] mt-[18px] flex flex-col gap-2.5 text-[13px] leading-[1.55]"
              />
              {route === 'creem' && !isFree && (
                <p className="text-[var(--amw-mut)] mt-2.5 flex items-start gap-2.5 text-[13px] leading-[1.55]">
                  <IconLock
                    size={16}
                    stroke={1.5}
                    aria-hidden="true"
                    className="text-[var(--amw-accent-ink)] mt-0.5 shrink-0"
                  />
                  <span>Payment runs on Creem’s checkout.</span>
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Container>
  )
}

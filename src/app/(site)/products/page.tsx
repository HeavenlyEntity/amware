import { withSocialImage } from '@/lib/social/metadata'
import { Container } from '@/components/Container'
import { getPayloadClient } from '@/lib/getPayloadClient'
import {
  StoreHero,
  StoreEmpty,
  ProductCard,
} from '@/components/commerce/storefront'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Products',
    description:
      'Engineering-grade boilerplates and digital tooling for founders, wired, typed and documented so you ship the product, not the plumbing.',
  },
  'products'
)

export default async function ProductsPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    sort: 'order',
    depth: 1,
    limit: 100,
  })

  return (
    <Container className="mt-16 sm:mt-32">
      <div className="amw">
        <StoreHero
          eyebrow="// AMWARE · ENGINEERING-GRADE TEMPLATES"
          title="Boilerplates built to ship, not to demo."
          intro="Production starter kits and digital tooling, wired, typed and documented so you can build the product instead of the plumbing."
          meta={
            <>
              <span className="amw-chip amw-chip--accent amw-chip--dot">
                {docs.length} available
              </span>
              <span className="amw-chip">one-time purchase</span>
              <span className="amw-chip">instant delivery</span>
            </>
          }
        />

        {docs.length === 0 ? (
          <StoreEmpty label="products" />
        ) : (
          <>
            <h2 className="sr-only">Available products</h2>
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:gap-8">
              {docs.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Container>
  )
}

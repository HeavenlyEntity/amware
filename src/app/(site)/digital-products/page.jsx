import { withSocialImage } from '@/lib/social/metadata'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { checkoutRoute } from '@/lib/commerce/checkoutRoute'
import { DigitalProducts } from '@/components/digital-products/digital-products'
import '@/styles/portfolio.css'
import '@/styles/products.css'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Digital products',
    description:
      'Short, practical guides for founders and the engineers who work with them: The 15-Minute Key Rotation Playbook and the free Dev Shop Contract Red Flags checklist.',
  },
  'products'
)

const GUIDE_SLUG = 'switch-clone-quick-key-rotation-guide'

/* The route is decided here and only this reduced shape crosses: the row's
   Creem id and description stay on this side of the boundary. A failed read,
   or no row, leaves `guide` null: the page renders with the guide not on
   sale and no price. */
export default async function DigitalProductsPage() {
  let guide = null
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        line: { equals: 'digital' },
        status: { equals: 'published' },
      },
      depth: 0,
      limit: 100,
    })
    const row = docs.find(({ slug }) => slug === GUIDE_SLUG)
    if (row) {
      guide = {
        price: row.price,
        pageCount: row.pageCount,
        route: checkoutRoute(row),
        slug: row.slug,
      }
    }
  } catch (error) {
    console.error('Digital products: could not load the guide', error)
  }

  return (
    <div className="amw pr overflow-x-clip pb-24 pt-4 md:pt-8">
      <DigitalProducts guide={guide} />
    </div>
  )
}

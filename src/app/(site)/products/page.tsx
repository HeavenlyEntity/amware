import { withSocialImage } from '@/lib/social/metadata'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { editionStates } from '@/lib/commerce/kitEditions'
import { NetsuiteEdition } from '@/components/warekit/netsuite-edition'
import '@/styles/portfolio.css'
import '@/styles/products.css'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Products',
    description:
      'WareKit: engineering-grade NetSuite foundations from a fractional CTO. Choose a React app inside NetSuite or a Next.js app connected to it, and start with a working foundation.',
  },
  'products'
)

/* The query reads drafts on purpose: a draft is an edition still planned.
   Rows stay on this side of the boundary, and only editionStates' reduced
   shape reaches the client. A failed read renders every edition as planned
   rather than failing the page. */
export default async function ProductsPage() {
  let states = {}
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        line: { equals: 'warekit' },
        edition: { equals: 'netsuite' },
      },
      depth: 0,
      limit: 100,
    })
    states = editionStates(docs)
  } catch (error) {
    console.error('Products: could not load the NetSuite editions', error)
  }

  return (
    <div className="amw pr overflow-x-clip pb-24 pt-4 md:pt-8">
      <NetsuiteEdition states={states} />
    </div>
  )
}

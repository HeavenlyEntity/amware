import { withSocialImage } from '@/lib/social/metadata'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { editionStates, saleSummary } from '@/lib/commerce/kitEditions'
import { StandardEdition } from '@/components/warekit/standard-edition'
import '@/styles/portfolio.css'
import '@/styles/products.css'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'WareKit Standard edition',
    description:
      'WareKit for SaaS products and internal tools on a modern TypeScript stack. Pick a data layer and join the waitlist; the most-requested one ships first.',
  },
  'products'
)

/* The page only needs to know whether a NetSuite edition can be reached
   today, and whether one is free, to decide what the way back to it may
   claim. The rows stay on this side of the boundary and only those two
   booleans cross. A failed read reads
   as nothing on sale, never as availability. */
export default async function StandardEditionPage() {
  let anyOnSale = false
  let liteFree = false
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
    const { free, paid } = saleSummary(editionStates(docs))
    anyOnSale = free || paid
    liteFree = free
  } catch (error) {
    console.error('Products: could not load the NetSuite editions', error)
  }

  return (
    <div className="amw pr overflow-x-clip pb-24 pt-4 md:pt-8">
      <StandardEdition anyOnSale={anyOnSale} liteFree={liteFree} />
    </div>
  )
}

import { withSocialImage } from '@/lib/social/metadata'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { editionStates, saleSummary } from '@/lib/commerce/kitEditions'
import { creemEnvironment } from '@/lib/commerce/creemEnv'
import { standardPresale } from '@/lib/commerce/standardPresale'
import { StandardEdition } from '@/components/warekit/standard-edition'
import { TrackView } from '@/components/analytics/TrackView'
import '@/styles/portfolio.css'
import '@/styles/products.css'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'WareKit Standard edition',
    description:
      'A Next.js starter for people building with an AI agent. Accounts, teams, payments and AI are wired on day one, and the rules are checks the build has to pass.',
  },
  'products'
)

/* One read of every WareKit row, split by edition here. The rows stay on
   this side of the boundary; only small answers cross:

   - `presale`: what the Standard presale may say and sell. It is worked out
     for the Creem environment the checkout action resolves, so the page
     never offers a checkout the server would refuse.
   - `anyOnSale` and `liteFree`: whether a NetSuite edition can be reached
     today, and whether one is free, for the way back to it.

   A failed read, or Payload failing to start, reads as nothing on sale: a
   closed presale with the waitlist, never an error page and never a claim
   of availability. */
export default async function StandardEditionPage() {
  let anyOnSale = false
  let liteFree = false
  let presale = standardPresale([])
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: { line: { equals: 'warekit' } },
      depth: 0,
      limit: 100,
    })
    const netsuiteRows = docs.filter((row) => row.edition === 'netsuite')
    const standardRows = docs.filter((row) => row.edition === 'standard')
    const { free, paid } = saleSummary(editionStates(netsuiteRows))
    anyOnSale = free || paid
    liteFree = free
    presale = standardPresale(standardRows, creemEnvironment())
  } catch (error) {
    console.error('Products: could not load the WareKit editions', error)
  }

  return (
    <div className="amw pr overflow-x-clip pb-24 pt-4 md:pt-8">
      <TrackView
        type="boilerplate"
        id="warekit-standard"
        name="WareKit Standard"
      />
      <StandardEdition
        presale={presale}
        anyOnSale={anyOnSale}
        liteFree={liteFree}
      />
    </div>
  )
}

'use client'

import { DigitalHero } from './digital-hero'
import { Library } from './library'
import { MoreLinks } from './more-links'
import { RedFlags } from './red-flags'
import { SwitchClone } from './switch-clone'

/* The Digital products page, from the approved board
   (docs/design/2026-10-27-portfolio-upgrade): hero, the library, the Switch
   Clone method and its buy block, the Red Flags scorer, then the links out.
   Styles: styles/products.css.

   `guide` is `{ price, pageCount, route, slug }` for the playbook, the only
   product data allowed this far, or null when the read failed or found no
   row. Null reads as not on sale, with no price and no page count. */
export function DigitalProducts({ guide }) {
  const view = {
    onSale: guide?.route === 'creem',
    amount: guide?.price,
    price:
      typeof guide?.price === 'number' ? `$${guide.price.toFixed(2)}` : null,
    pages: guide?.pageCount ?? null,
    slug: guide?.slug,
  }

  return (
    <>
      <DigitalHero pages={view.pages} />
      <Library guide={view} />
      <SwitchClone guide={view} />
      <RedFlags />
      <MoreLinks />
    </>
  )
}

import type { TextField } from 'payload'

type CreemProductFieldOptions = {
  /** Number field the fetched price (in dollars) is written to. Default `price`. */
  priceField?: string
  /** Optional text field to receive the Creem currency code. */
  currencyField?: string
  /** Optional text field to receive a human price label (e.g. "one-time"). */
  priceLabelField?: string
}

/**
 * A `creemProductId` text field that, when edited in the admin, looks the
 * product up via `/api/creem/product` and auto-populates the linked price
 * (and optionally currency / price label) from Creem. The price stays
 * hand-editable afterward.
 */
export const creemProductField = (
  options: CreemProductFieldOptions = {}
): TextField => {
  const { priceField = 'price', currencyField, priceLabelField } = options

  return {
    name: 'creemProductId',
    type: 'text',
    admin: {
      description:
        'Creem prod_… id. Creem sells digital products only; kits sell through Whop. A published digital product with an id is on sale, so attach its file in Creem first. Absence ⇒ not purchasable. Editing this auto-fills the price from Creem.',
      components: {
        Field: {
          path: '@/fields/creem/CreemProductField#CreemProductField',
          clientProps: {
            priceFieldPath: priceField,
            currencyFieldPath: currencyField,
            priceLabelFieldPath: priceLabelField,
          },
        },
      },
    },
  }
}

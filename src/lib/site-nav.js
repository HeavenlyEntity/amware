import {
  DESK_HREF,
  REVIEW_HREF,
  liveTools,
  soonTools,
} from '@/lib/founders/tools'
import { identity } from '@/content/site/identity'

/* The site's navigation, shaped for the template's card menu: four cards,
   each one job. Live founder tools come from the desk registry so a tool
   promoted to live appears here without a second edit. */

/* Identity comes from the shared content module, not a second copy. These
   drifted once already: the LinkedIn URL here outlived the canonical one
   long enough to disagree with the footer, the contact page, and the
   Person schema. */
export const CONTACT_EMAIL = identity.email

/* The Digital Products page ships in the products split. Until then its
   catalog row shows as "Soon": not a link, and left out of menuHrefs() so
   the route-registry test stays honest. Flip the flag when the page is
   live. */
export const DIGITAL_PRODUCTS_HREF = '/digital-products'
export const DIGITAL_PRODUCTS_LIVE = false

export const SOCIAL_LINKS = [
  { id: 'x', label: 'Follow on X', href: identity.x },
  { id: 'linkedin', label: 'Follow on LinkedIn', href: identity.linkedin },
  { id: 'github', label: 'Follow on GitHub', href: identity.github },
]

/* `soon` rows render as plain text with a "Soon" hint instead of a link.
   The option exists so tests can render both states of the flag. */
export function menuCards({
  digitalProductsLive = DIGITAL_PRODUCTS_LIVE,
} = {}) {
  return [
    {
      id: 'catalog',
      title: 'Catalog',
      links: [
        { label: 'Boilerplates & Products', href: '/products', badge: null },
        {
          label: 'Digital Products',
          href: DIGITAL_PRODUCTS_HREF,
          badge: null,
          soon: !digitalProductsLive,
        },
        { label: 'Services', href: '/services', badge: null },
        { label: 'Courses', href: '/courses', badge: null },
      ],
    },
    {
      id: 'founders',
      title: "Founders' Desk",
      links: [
        ...liveTools().map((tool) => ({
          label: tool.label,
          href: tool.href,
          badge: 'new',
        })),
        { label: 'Review my offer', href: REVIEW_HREF, badge: null },
        { label: 'The desk', href: DESK_HREF, badge: null },
      ],
      soon: soonTools().map((tool) => tool.label),
    },
    {
      id: 'explore',
      title: 'Explore',
      links: [
        { label: 'About', href: '/about', badge: null },
        { label: 'Articles', href: '/articles', badge: null },
        { label: 'Projects', href: '/projects', badge: null },
        { label: 'Uses', href: '/uses', badge: null },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      links: [],
      email: CONTACT_EMAIL,
      socials: SOCIAL_LINKS,
    },
  ]
}

/* Every route the menu links to, for the registry test. "Soon" rows are
   not links, so they are left out. */
export function menuHrefs(options) {
  return menuCards(options).flatMap((card) =>
    card.links.filter((link) => !link.soon).map((link) => link.href)
  )
}

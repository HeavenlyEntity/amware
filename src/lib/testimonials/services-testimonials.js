import { testimonials } from '../../content/site/testimonials.js'
import {
  PLACEHOLDER_BENTO,
  PLACEHOLDER_FEATURED_QUOTE,
  PLACEHOLDER_PARTNER,
  placeholderTestimonials,
} from '../../content/site/testimonial-placeholders.js'

/* Which testimonials /services shows in the studio template's bento and
   wall. The template's placeholder people render only in local
   development and on Vercel previews; production, and any environment we
   cannot identify, gets the real list. */

export function showPlaceholders({ nodeEnv, vercelEnv } = {}) {
  return nodeEnv === 'development' || vercelEnv === 'preview'
}

/* Real testimonials in the template's card shape. Quotes run exactly as the
   content file stores them, never trimmed here: cutting someone's words would
   put different words in their mouth. Where a source runs long, the content
   file keeps one unbroken passage of it. No image, so the card shows
   initials. */
function fromReal(t) {
  return {
    id: t.name,
    name: t.name,
    designation: t.role,
    excerpt: t.description,
    verbatim: Boolean(t.verbatim),
    image: null,
  }
}

function byName(name) {
  const t = testimonials.find((x) => x.name === name)
  return t ? fromReal(t) : null
}

/* Mark's is the website-build quote, so it leads, and clients fill the rest
   of the bento. The employment references are not client endorsements, so
   they fall through to the wall, in the content file's order. Slots match by
   exact name: rename someone there and rename them here too. */
function realSelection() {
  const featured = byName('Mark Schilling')
  const supporting = {
    topLeft: byName('Grace L.'),
    bottomLeft: byName('Mike Pryke'),
    topRight: byName('Brian Meece'),
    bottomRight: byName('John Boese'),
  }
  const used = new Set(
    [featured, ...Object.values(supporting)].filter(Boolean).map((t) => t.id)
  )
  return {
    featured: featured && {
      ...featured,
      quote: featured.excerpt,
      partner: null,
    },
    supporting,
    wall: testimonials.map(fromReal).filter((t) => !used.has(t.id)),
  }
}

function placeholderSelection() {
  const byId = (id) => {
    const t = placeholderTestimonials.find((x) => x.id === id)
    return t ? { ...t, verbatim: true } : null
  }
  const used = new Set(Object.values(PLACEHOLDER_BENTO))
  return {
    featured: {
      ...byId(PLACEHOLDER_BENTO.featured),
      quote: PLACEHOLDER_FEATURED_QUOTE,
      partner: PLACEHOLDER_PARTNER,
    },
    supporting: {
      topLeft: byId(PLACEHOLDER_BENTO.topLeft),
      bottomLeft: byId(PLACEHOLDER_BENTO.bottomLeft),
      topRight: byId(PLACEHOLDER_BENTO.topRight),
      bottomRight: byId(PLACEHOLDER_BENTO.bottomRight),
    },
    wall: placeholderTestimonials
      .filter((t) => !used.has(t.id))
      .map((t) => ({ ...t, verbatim: true })),
  }
}

export function servicesTestimonials(env) {
  return showPlaceholders(env) ? placeholderSelection() : realSelection()
}

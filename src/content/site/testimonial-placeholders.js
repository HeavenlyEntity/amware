/* PLACEHOLDERS from the design-development-studio template's
   constants/testimonials.tsx: invented people, invented quotes, stock
   avatars. They exist so /services can be judged exactly as the template
   lays it out, and they are NEVER rendered in production:
   lib/testimonials/services-testimonials.js only selects them in local
   development and on Vercel previews. Shown to real buyers they would be
   fake reviews, which the FTC's rule on consumer reviews and testimonials
   prohibits.

   Real testimonials go in content/site/testimonials.js, never here. */

export const placeholderTestimonials = [
  {
    id: 0,
    excerpt:
      "The best front-end partner we've had. They took the brief and shipped a product our team is proud of.",
    name: 'Elena Vargas',
    designation: 'Founder at Northline',
    image: 'https://assets.aceternity.com/avatars/1.webp',
    placeholder: true,
  },
  {
    id: 1,
    excerpt:
      "Excellent communication and craft. Open to ideas, calm under scope changes, and we'd hire them again.",
    name: 'Marcus Chen',
    designation: 'CTO at Harbor Labs',
    image: 'https://assets.aceternity.com/avatars/2.webp',
    placeholder: true,
  },
  {
    id: 2,
    excerpt:
      'From a loose brief to a polished site in days. Strong taste, strong intuition, zero fluff.',
    name: 'Priya Nair',
    designation: 'President at Cobalt Analytics',
    image: 'https://assets.aceternity.com/avatars/3.webp',
    placeholder: true,
  },
  {
    id: 4,
    excerpt:
      'Development was flawless and they acted like partners, not vendors. Very happy we hired them.',
    name: 'Jonas Keller',
    designation: 'CMO at Fieldwork',
    image: 'https://assets.aceternity.com/avatars/4.webp',
    placeholder: true,
  },
  {
    id: 5,
    excerpt:
      'Talented, communicative, and fast across the board. Highly recommend.',
    name: 'Sofia Almeida',
    designation: 'Founder at Atelier Peak',
    image: 'https://assets.aceternity.com/avatars/5.webp',
    placeholder: true,
  },
  {
    id: 6,
    excerpt:
      'Turned our rough shell into a polished, friendly site with impeccable taste and startup-ready adaptability.',
    name: 'Daniel Cho',
    designation: 'Head of Product at Orbit Inference',
    image: 'https://assets.aceternity.com/avatars/6.webp',
    placeholder: true,
  },
  {
    id: 7,
    excerpt:
      'From rough concept to polished product: patient with feedback, great collaboration, delivery that matched our vision.',
    name: 'Amelia Brooks',
    designation: 'Founder at Signal Grove · Product Lead at Latticeware',
    image: 'https://assets.aceternity.com/avatars/7.webp',
    placeholder: true,
  },
  {
    id: 8,
    excerpt:
      'Quick to respond, very professional, and shipped a site within a week. Looking forward to the next collaboration.',
    name: 'Kenji Sato',
    designation: 'Founder / CTO at Parallax AI',
    image: 'https://assets.aceternity.com/avatars/8.webp',
    placeholder: true,
  },
  {
    id: 9,
    excerpt:
      'Excellent work on our website—they went above and beyond, with a smooth handoff so we could move forward confidently.',
    name: 'Riley Quinn',
    designation: 'Founder at Cedar App',
    image: 'https://assets.aceternity.com/avatars/9.webp',
    placeholder: true,
  },
]

/* The template's spotlight quote for Daniel Cho (id 6), trimmed to
   editorial length by the template itself ($T/components/big-testimonial.tsx). */
export const PLACEHOLDER_FEATURED_QUOTE =
  "I'd highly recommend Mainline for a site redesign. They turned our rough shell into a polished product with impeccable taste, real partnership, and the adaptability you need in a startup. We scoped a few pages; they delivered so well we expanded the engagement."

export const PLACEHOLDER_PARTNER = {
  name: 'Orbit Inference',
  letter: 'O',
  href: 'https://example.com',
}

/* The template's bento assignment ($T/components/big-testimonial.constants.ts). */
export const PLACEHOLDER_BENTO = {
  featured: 6,
  topLeft: 1,
  bottomLeft: 8,
  topRight: 0,
  bottomRight: 5,
}

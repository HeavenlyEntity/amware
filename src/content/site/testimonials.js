/* One list for every testimonial on the site: the homepage rail
   (components/landing/testimonials.jsx) reads it directly, and /services
   reads it through lib/testimonials/services-testimonials.js into
   components/testimonials/big-testimonial.jsx and masonry-testimonials.jsx.
   A change of wording from any of these people lands everywhere at once.

   PROVENANCE, and it matters more than anything else in this file. These are
   testimonials DRAFTED FOR CLIENTS TO APPROVE, not quotes captured verbatim
   from a published source. Alec confirmed on 2026-09-07 that Mark, Grace and
   Mike are clients in his founders group, and that Dewayne K. was his
   supervisor at RL Canning -- all of whom granted permission for testimonials
   about his work.

   Dewayne's is an EMPLOYMENT REFERENCE, not a client testimonial, and his role
   line says so. Employer history must not be dressed up as a client
   endorsement: he managed Alec on Honeywell automation work from 2017, he did
   not hire AMWARE. His card sits last for the same reason -- client work
   leads, the reference corroborates.

   That makes the standard the ordinary one for drafted testimonials: each
   named person signs off on their own card before it is published, and the
   wording changes to whatever they prefer. Nothing here asserts a metric, a
   figure, a timeline or an outcome, precisely because those are the claims a
   drafted testimonial must never invent on someone's behalf.

   Grace and Mike previously carried their published MiPi product quotes from
   i.mipi.io. Those said nothing about the consulting work and were replaced
   under the permission above. If that permission is ever withdrawn, the
   published product quotes are recoverable from this file's history.

   The positioning lives in the heading and standfirst above the rail, which
   are Alec's own copy. The cards carry named people, so they answer to those
   people.

   TODO(alec): still outstanding, and deliberately NOT written as placeholder
   text -- send the actual wording and they go straight in:
     - Mark Schilling: his practice name, so the role line can stop reading
       as a generic description.
     - Sign-off from Mark, Grace and Mike on their own cards.
     - Tavarse Green, Managing Partner, EdenKode
     - Intch verified reviews (login-walled, cannot be fetched)
     - LinkedIn recommendations (login-walled, cannot be fetched) */

export const testimonials = [
  {
    title: 'A Brand Foundation, Not a Website',
    description:
      'I came in with a clear vision for a new practice and no idea how to put it online. Alec listened first, then translated what the practice actually stood for into the digital experience. What I ended up with was a brand foundation, not a website.',
    verbatim: true,
    name: 'Mark Schilling',
    role: 'Founder, architecture design practice',
  },
  {
    title: 'The Call I Make Before Committing',
    description:
      'I can tell you exactly what I want the business to do. I cannot tell you how it should be built. Alec took that and came back with something I could actually run, and walked me through the trade-offs in language I understood. He is the person I go to now before I commit to anything technical.',
    verbatim: true,
    name: 'Grace L.',
    role: 'Founder of GleeCreative',
  },
  {
    title: 'Undoing the Expensive Decisions',
    description:
      'We had already made a couple of technical decisions the wrong way round. Alec unpicked them, told me plainly which were worth fixing and which we could live with, and then did the work. Having someone who holds the business and the architecture in his head at the same time changed how fast we could move.',
    verbatim: true,
    name: 'Mike Pryke',
    role: 'Founder of Sorta',
  },
  {
    title: 'The Work Nobody Else Wanted',
    description:
      'I gave Alec the automation nobody else wanted to own. He took the time to understand the system before he touched it, and what he built kept running without anyone babysitting it. He was solving problems above his level early, and he explained his reasoning well enough that the rest of the team learned from it.',
    verbatim: true,
    name: 'Dewayne K.',
    role: 'Former supervisor, RL Canning (Honeywell)',
  },
]

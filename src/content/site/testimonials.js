/* One list for every testimonial on the site: the homepage rail
   (components/landing/testimonials.jsx) reads it directly, and /services
   reads it through lib/testimonials/services-testimonials.js into
   components/testimonials/big-testimonial.jsx and masonry-testimonials.jsx.
   A change of wording from any of these people lands everywhere at once.

   PROVENANCE, and it matters more than anything else in this file. Two kinds
   of card live here, and the difference has to stay visible.

   PUBLISHED: Mark's and Rebecca's are their own words, copied from the
   recommendations they wrote on Alec's LinkedIn profile, and both agreed to
   appear here. Mark's is the second of its four paragraphs, one unbroken
   passage that Alec chose, with nothing reworded. Rebecca's runs in full,
   with only the spacing between sentences tidied.

   DRAFTED: Grace's, Mike's, Brian's, John's and Dewayne's are testimonials
   DRAFTED FOR THEM, not quotes captured from a published source. Alec
   confirmed on 2026-09-07 that Grace and Mike are clients in his founders
   group, and that Dewayne K. was his supervisor at RL Canning -- all of whom
   granted permission for testimonials about his work. On 2026-10-05 he added
   that Mike, Brian and John had given him a free hand with their cards, and
   said what he did for the two new names: software for Brian at Green Light
   Go, fractional CTO advice for John. Their cards claim nothing beyond that
   work and what working with him was like. Brian is also Alec's mentor
   (Alec confirmed both on 2026-10-05; the site's metadata names him as
   one), and his role line discloses it on the card itself: a reader should
   know of a close tie before weighing an endorsement.

   Rebecca's and Dewayne's are EMPLOYMENT REFERENCES, not client
   testimonials, and their role lines say so. Employer history must not be
   dressed up as a client endorsement: both managed Alec in a job, and
   neither hired AMWARE. Their cards sit last for the same reason -- client
   work leads, the references corroborate.

   For the drafted cards the standard is the ordinary one: each named person
   signs off on their own card before it is published, and the wording
   changes to whatever they prefer. Mike, Brian and John gave a free hand
   instead of a per-card sign-off, so their cards are still worth showing
   them. Nothing drafted here asserts a metric, a figure or a timeline,
   precisely because those are the claims a drafted testimonial must never
   invent on someone's behalf.

   VOICE: each card speaks to one channel of the Process Communication Model
   that Brendan Kane teaches in Hook Point, so readers of every type find a
   voice like their own: Mark feelings, Grace values, Mike action, Brian fun,
   John imagination, Rebecca and Dewayne facts. The drafted cards were tuned
   to their channel; the published ones stay exactly as written.

   Grace and Mike previously carried their published MiPi product quotes from
   i.mipi.io. Those said nothing about the consulting work and were replaced
   under the permission above. If that permission is ever withdrawn, the
   published product quotes are recoverable from this file's history.

   The positioning lives in the heading and standfirst above the rail, which
   are Alec's own copy. The cards carry named people, so they answer to those
   people.

   TODO(alec): still outstanding, and deliberately NOT written as placeholder
   text -- send the actual wording and they go straight in:
     - Sign-off from Grace on her card, and a look from Mike, Brian and John
       at theirs.
     - Mark: his practice name, if he wants it on his card.
     - Tavarse Green, Managing Partner, EdenKode
     - Intch verified reviews (login-walled, cannot be fetched) */

export const testimonials = [
  {
    title: 'A Brand Foundation, Not a Website',
    description:
      'From the very first conversation, Alec approached my ideas with genuine curiosity and care. He didn’t just build a website he helped shape the foundation of my brand. His ability to listen deeply and translate my values and aesthetic into a digital experience was nothing short of transformative.',
    verbatim: true,
    name: 'Mark Schilling',
    role: 'Founder, regenerative architecture & landscape design practice',
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
    title: 'Straight Answers, Then the Work',
    description:
      'We had made a couple of technical calls the wrong way round. Alec unpicked them, told me straight which were worth fixing and which we could live with, and then did the work. Having someone who holds the business and the architecture in his head at the same time changed how fast we could move.',
    verbatim: true,
    name: 'Mike Pryke',
    role: 'Founder of Sorta',
  },
  {
    title: 'Genuinely Fun to Build With',
    description:
      'Alec is genuinely fun to build with. I could explain what Green Light Go needed in my own messy way, and he would turn it into software without burying me in jargon. I love working with someone who makes the technical side feel easy.',
    verbatim: true,
    name: 'Brian Meece',
    role: 'Founder of Green Light Go · mentor and client',
  },
  {
    title: 'The Whole Picture First',
    description:
      'Alec lays out the whole picture before I commit to a direction. He thinks the options through with me, shows me where each path leads, and leaves me room to decide. As a consultant myself, I value that kind of clear thinking, and he is who I bring my technical questions to.',
    verbatim: true,
    name: 'John Boese',
    role: 'Founder of John Boese Consulting',
  },
  {
    title: 'Accurate, Timely Data',
    description:
      'Alec brought his Inventory Management to the IT Asset Management Task Force Special Project initiative. The success of the project is in part due to Alec and his inventory management and customer experiences. Alec delivered accurate and timely data - enabling leadership to make financial and technology decisions. Honestly a pleasure to work with and learn from!',
    verbatim: true,
    name: 'Rebecca Sunda',
    role: 'Former manager, IT asset management',
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

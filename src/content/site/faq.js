/* Homepage FAQ. The accordion (components/landing/faq.jsx) and the
   FAQPage JSON-LD (lib/seo/schema.js) both read this list, so the visible
   answers and the structured data can never drift apart. Plain data in a
   plain module: a 'use client' file cannot hand arrays to server code. */
export const faqs = [
  {
    question: 'What does a fractional CTO engagement look like?',
    answer:
      'A fixed monthly retainer for a set number of hours. I own architecture, roadmap, and vendor decisions, ship code alongside your team every week, and sit in the meetings where technical calls get made. You get a CTO without the full-time salary or the equity.',
  },
  {
    question: 'What ships inside a boilerplate?',
    answer:
      'The same foundation I start my own products from: Next.js 16 with the App Router, Payload CMS on Postgres, authentication, payments through Creem, and deploy scripts. Every piece has survived production on a real build before it lands in the catalog.',
  },
  {
    question: 'Can I use a boilerplate for client work?',
    answer:
      'Yes. Each license covers unlimited projects you build and ship yourself, including work for clients. The only restriction is reselling or redistributing the boilerplate itself as a template.',
  },
  {
    question: 'Do you work with existing teams and codebases?',
    answer:
      'Most engagements start that way. I begin with an architecture review, put the risks in plain language for leadership, and then work the plan with the engineers already on the team rather than around them.',
  },
  {
    question: 'How do we get started?',
    answer:
      'Grab a boilerplate from the catalog and you are building in minutes. For an engagement, send a short note through the contact page; we will book a call, scope the first month, and start the following week.',
  },
]

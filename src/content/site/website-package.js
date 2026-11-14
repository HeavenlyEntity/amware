/* What a website build includes, as the /services "Build & support" tab
   shows it. The owner confirms or strikes each line before merge
   (docs/superpowers/specs/2026-09-25-services-template-port-design.md).
   Every line must be something the build actually delivers. Each feature's
   `icon` names one of the board's premium icons
   (components/website-package/premium-icons.jsx). */

export const WEBSITE_PACKAGE = {
  heading: {
    lead: 'Everything a website build includes,',
    highlight: 'start to finish',
  },
  cards: {
    designing: {
      title: 'Design and build',
      description:
        'From wireframes to a shipped Next.js site, designed and built by the same engineer.',
    },
    microinteractions: {
      title: 'Micro-interactions and motion',
      description:
        'Considered animation, with 3D where it earns its place, and reduced-motion support built in.',
    },
    copywriting: {
      title: 'Copy, SEO and AI search',
      description:
        'Crawlable pages, metadata and machine-readable exports, so you can be found on Google and in ChatGPT and Perplexity.',
    },
    consultation: {
      title: 'Strategy call first',
      description:
        'Goals, audience, and what the site has to do for the business, before anything is designed.',
    },
    launch: {
      title: 'Launch and beyond',
      description:
        'Deployment, hosting, maintenance, revisions and the design system.',
    },
  },
  features: [
    {
      icon: 'ProgrammerIcon',
      title: 'Design and development by one engineer',
    },
    { icon: 'ResponsiveIcon', title: 'Responsive on every screen' },
    { icon: 'CustomizeIcon', title: 'Dark and light mode' },
    { icon: 'CodeIcon', title: 'Modern stack (Next.js, React, Tailwind)' },
    { icon: 'TasksIcon', title: 'Regular check-ins' },
    { icon: 'RocketIcon', title: 'Built to change after launch' },
  ],
  /* The globe card's action: the Build & support intro call when there is
     a booking link, the contact form when there is not.
     TODO(alec): confirm the quote is free, as the fallback promises. */
  cta: {
    label: 'Book a free intro call',
    fallbackLabel: 'Get your free website quote',
    href: '/contact',
    serviceName: 'Build & support intro call',
    notes: 'From the website package (Build & support, /services)',
  },
}

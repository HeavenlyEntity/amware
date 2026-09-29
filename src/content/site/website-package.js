/* What a website build includes, as the /services "Build & support" tab
   shows it. The owner confirms or strikes each line before merge
   (docs/superpowers/specs/2026-09-25-services-template-port-design.md).
   Every line must be something the build actually delivers. */

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
      icon: 'WebsiteDevelopment',
      title: 'Design and development by one engineer',
    },
    { icon: 'MobileResponsive', title: 'Responsive on every screen' },
    { icon: 'DarkAndLightMode', title: 'Dark and light mode' },
    { icon: 'TechStack', title: 'Modern stack (Next.js, React, Tailwind)' },
    { icon: 'Communication', title: 'Regular check-ins' },
    { icon: 'FutureUpdates', title: 'Built to change after launch' },
  ],
  cta: { label: 'Start a website build', href: '/contact' },
}

export function projectAnchor(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const projects = [
  {
    name: 'Gearz',
    tags: ['SaaS', 'PWA', 'Community'],
    date: '08/21/26',
    description:
      'The home base for car culture — find meets, flex your garage, rep your club. A community platform where enthusiasts discover events, build clubs, and earn their automotive reputation, with integrated event ticketing powered by Stripe Connect.',
    link: { href: 'https://gearz.io', label: 'gearz.io' },
    status: 'development',
    whatHappened:
      'Currently in active development as a mobile-first PWA — events, clubs, garages, and Gearhead scores are coming together ahead of launch in the Phoenix metro.',
    activity: [5, 10, 20, 30, 45, 55, 70, 85, 95],
  },
  {
    name: 'EdenKode Investor Readiness',
    tags: ['Enterprise SaaS', 'AI', 'Fintech'],
    date: '07/28/26',
    description:
      'The capital-readiness operating system for a strategic advisory firm. A 31-signal, 8-vector IR-01 assessment collects document and bank evidence, AI drafts an advisory score, and a human reviewer holds the decision — then the engagement carries on through project boards, a data room, NDA signing, and billing.',
    link: { href: 'https://edenkode.io', label: 'edenkode.io' },
    status: 'live',
    whatHappened:
      'Live at edenkode.io with the public application open. Founders move from the IR-01 intake through AI-assisted scoring into a super-admin review; scores stay advisory and never auto-apply.',
    activity: [15, 30, 45, 60, 75, 90, 85, 80, 80],
  },
  {
    name: 'Celestial Studio Salon',
    tags: ['Full Stack', 'SaaS', 'Booking'],
    date: '03/15/25',
    description:
      'A fully configurable booking system for a local salon in Peoria. Features a landing page configurator, local client/appointment recognition, built-in CRM, calendar scheduling, and robust Stripe integration with payment intent for deposits and cancellation fees.',
    link: { href: 'https://www.celestialsalon.co', label: 'celestialsalon.co' },
    status: 'development',
    whatHappened:
      'MVP successfully launched with active clients coming in; full feature suite still in active development!',
    activity: [10, 20, 35, 50, 65, 80, 85, 95, 100],
  },
  {
    name: 'Kingdom Kode',
    tags: ['Agency', 'AI'],
    date: '02/01/25',
    description:
      'Affordable, top-tier AI solutions, software, website, and design services that solve problems right the first time—empowering businesses to thrive in a competitive digital landscape.',
    link: { href: 'https://kingdomkode.com', label: 'kingdomkode.com' },
    status: 'live',
    whatHappened:
      'Launching creative, AI-powered solutions for growing brands and teams.',
    activity: [20, 30, 25, 40, 50, 45, 60, 75, 80],
  },
  {
    name: 'ConventionSuite - GSC™',
    tags: ['Enterprise SaaS'],
    date: '09/30/24',
    description:
      'Enterprise event management system for general service contracts and exhibitor orders, built on Next.js and Oracle NetSuite.\n- Built at NewGen',
    link: { href: 'https://conventionsuite.com', label: 'conventionsuite.com' },
    status: 'live',
    whatHappened:
      'Successfully launched and partnered with the largest general service contract companies in the world.',
    activity: [100, 75, 50, 35, 25, 25, 25, 25, 25],
  },
  {
    name: 'M i P i',
    tags: ['Creator Platform', 'SaaS'],
    date: '08/15/24',
    description:
      'Creating technology to empower artists and creators to build their own communities, and build wealth.',
    link: { href: 'http://i.mipi.io', label: 'i.mipi.io' },
    status: 'development',
    whatHappened:
      'Early development SaaS with customer market fit and growing! Associated with my OneDay Program.',
    activity: [10, 20, 40, 35, 50, 45, 60, 70, 85],
  },
  {
    name: 'PortalGen™',
    tags: ['Enterprise SaaS', 'PWA'],
    date: '05/12/24',
    description:
      'Completely customizable system for generating PWAs (Portal web applications) using Oracle NetSuite backend technologies.\n- Built at NewGen',
    link: {
      href: 'https://newgennow.com/portalgen',
      label: 'newgennow.com/portalgen',
    },
    status: 'live',
    whatHappened: 'Successfully launched and growing rapidly.',
    activity: [40, 60, 35, 65, 30, 30, 30, 20, 10],
  },
  {
    name: '@neatsuite/http',
    tags: ['Open Source', 'TypeScript'],
    date: '01/20/24',
    description:
      'TypeScript-first NetSuite HTTP client with OAuth 1.0a signing, smart retries, and a clean DX for SuiteTalk REST and RESTlets.',
    link: {
      href: 'https://github.com/heavenlyentity/neatsuite',
      label: 'github.com',
    },
    status: 'live',
    whatHappened:
      'Released as part of the NeatSuite monorepo; actively maintained and adopted in projects.',
    activity: [60, 50, 70, 65, 80, 75, 85, 90, 95],
  },
  {
    name: 'Auth.js - NetSuite Provider',
    tags: ['Open Source'],
    date: '11/05/23',
    description:
      'A NetSuite provider for Auth.js, allowing for easy authentication and authorization in NetSuite hybrid applications.',
    link: {
      href: 'https://authjs.dev/getting-started/providers/netsuite?framework=next-js',
      label: 'authjs.dev',
    },
    status: 'live',
    whatHappened:
      'Successfully merged into Auth.js and ready to release into version 5. Next it will merge into better-auth as Auth.js converts to better-auth.',
    activity: [30, 25, 40, 45, 35, 50, 60, 75, 85],
  },
  {
    name: 'Chamoji',
    tags: ['CLI Tool', 'Open Source'],
    date: '10/14/23',
    description:
      'The modern CLI alternative to gitmoji-changelog. Still in progress getting cool things rigged up.',
    link: {
      href: 'https://github.com/HeavenlyEntity/chamoji',
      label: 'github.com',
    },
    status: 'development',
    whatHappened:
      'Still in progress getting cool things rigged up. Contributors welcome!',
    activity: [15, 20, 10, 25, 35, 30, 40, 50, 60],
  },
  {
    name: 'Windstone',
    tags: ['Desktop App', 'Privacy'],
    date: '03/10/23',
    description:
      'Highly private web browser desktop application built in electron.',
    link: { href: '#', label: 'github.com' },
    status: 'archived',
    whatHappened: 'Company went bankrupt and later Sideskick was born.',
    activity: [80, 70, 60, 50, 40, 30, 20, 10, 5],
  },
  {
    name: 'Furious Froth Coffee®',
    tags: ['E-commerce', 'Headless'],
    date: '06/20/22',
    description:
      'The ultimate coffee site powered by Shopify with a headless storefront powered by Next.js',
    link: { href: '#', label: 'github.com' },
    status: 'archived',
    whatHappened: 'Started OneDay Program and shifted focus to MiPi',
    activity: [75, 65, 55, 45, 35, 25, 15, 5, 0],
  },
  {
    name: 'VRSA',
    tags: ['Internal Tool', 'Security'],
    date: '04/11/21',
    description:
      'A automated patching tool for internal servers, making it easy to analyze, schedule, and patch server vulnerabilities all within a react & Dot Net powered system.',
    link: { href: '#', label: '🔒 Internal' },
    status: 'archived',
    whatHappened: 'Company aquired to TD Ameritrade',
    activity: [90, 80, 70, 60, 50, 40, 30, 20, 10],
  },
  {
    name: 'VB Remote Sat',
    tags: ['Internal Tool', 'Automation'],
    date: '07/08/20',
    description:
      'This tool is used by all desktop support techs across the globe at Honeywell to increase efficiency allowing for multiple remote sessions, imaging, and automating all set up processes within a couple minutes instead of hours.',
    link: { href: '#', label: '🔒 Internal' },
    status: 'live',
    whatHappened:
      'Successfully launched and trained 100+ users still in use today.',
    activity: [40, 55, 40, 60, 20, 55, 45, 65, 70],
  },
].sort((a, b) => new Date(b.date) - new Date(a.date))

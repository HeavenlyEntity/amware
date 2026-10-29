export function projectAnchor(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* Kind categories are a proposal (TODO(alec): confirm the names). Rename
   them here; every filter, label and count reads this one constant. */
export const KINDS = {
  venture: 'Ventures',
  client: 'Client & enterprise',
  oss: 'Open source',
  internal: 'Internal tools',
}

/* Short labels for the phone-width kind filter, where the long names do
   not fit beside the icon and count. */
export const KINDS_SHORT = {
  all: 'All',
  venture: 'Ventures',
  client: 'Clients',
  oss: 'Open source',
  internal: 'Internal',
}

export const STATUS_LABELS = {
  live: 'Live',
  development: 'In development',
  archived: 'Archived',
}

/* Case-study copy comes from the approved Projects design
   (docs/design/2026-10-27-portfolio-upgrade, project-stories.js), fact-checked
   against Alec's notes. Nothing in a story is an invented metric:
   - story.results[].v is the display value; a leading number counts up.
   - story.team.size is the number of builders when Alec confirmed it, else 0,
     which shows the label and note without a seat graphic.
   - activity has no defined meaning yet; it renders only behind
     SHOW_ACTIVITY in components/projects/project-archive.
   TODO(alec): team sizes are unknown for Gearz, EdenKode, Celestial,
   Windstone, VRSA and Exhibit House (label only until confirmed).
   TODO(alec): no numeric results yet for Gearz, Celestial, MiPi, PortalGen,
   Windstone, VRSA or Exhibit House; their results stay qualitative.
   The first three entries are the "On the bench" features; the rest form
   the archive, in this order. */
export const projects = [
  {
    name: 'Gearz',
    key: 'gearz',
    kind: 'venture',
    tags: ['SaaS', 'PWA', 'Community'],
    date: '08/21/26',
    description:
      'The home base for car culture: find meets, flex your garage, rep your club. A community platform where enthusiasts discover events, build clubs and earn their automotive reputation, with integrated event ticketing powered by Stripe Connect.',
    link: {
      href: 'https://gearz.io',
      label: 'gearz.io',
    },
    status: 'development',
    whatHappened:
      'In active development as a mobile-first PWA. Events, clubs, garages and Gearhead scores are coming together ahead of launch in the Phoenix metro.',
    activity: [5, 10, 20, 30, 45, 55, 70, 85, 95],
    story: {
      lede: 'A car-culture platform built around one idea: the best part of the scene is showing up.',
      chapters: [
        {
          t: 'The spark',
          i: 'search',
          b: 'Years in event management, ticketing and rentals shaped the idea: meets, clubs and tickets in one place, and showing up should count for something.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'Built in stealth since 2019 as a mobile-first PWA. Events, clubs, garages and ticketing through Stripe Connect sit in one place. There is no feed algorithm; you see your community and the clubs you follow.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'In active development ahead of a Phoenix-metro launch, with motorcycle support on the way and a walkie-talkie channel being tested state by state.',
        },
      ],
      results: [
        {
          v: '2019',
          l: 'Building since, in stealth',
        },
        {
          v: '1',
          l: 'Algorithm: the Gearhead Score',
        },
        {
          v: '0',
          l: 'Feed algorithms',
        },
      ],
      team: {
        size: 0,
        label: 'Founder-led',
        note: 'Built under AMWARE Technologies. The one rule in every product decision: reward people for showing up and helping each other, not for scrolling.',
      },
      stack: ['PWA', 'Stripe Connect', 'Events', 'Ticketing'],
    },
  },
  {
    name: 'EdenKode Investor Readiness',
    key: 'edenkode',
    kind: 'client',
    tags: ['Enterprise SaaS', 'AI', 'Fintech'],
    date: '07/28/26',
    description:
      'The capital-readiness operating system for a strategic advisory firm. A 31-signal, 8-vector IR-01 assessment collects document and bank evidence, AI drafts an advisory score, and a human reviewer holds the decision. The engagement then carries on through project boards, a data room, NDA signing and billing.',
    link: {
      href: 'https://edenkode.io',
      label: 'edenkode.io',
    },
    status: 'live',
    whatHappened:
      'Live at edenkode.io with the public application open. Founders move from the IR-01 intake through AI-assisted scoring into a super-admin review; scores stay advisory and never auto-apply.',
    activity: [15, 30, 45, 60, 75, 90, 85, 80, 80],
    story: {
      lede: 'The operating system an advisory firm uses to tell founders whether they are ready for capital.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: "A strategic advisory firm needed one repeatable way to assess a founder's capital readiness that still left the final call to a person.",
        },
        {
          t: 'The build',
          i: 'workflow',
          b: 'IR-01 collects document and bank evidence across 31 signals and 8 vectors. AI drafts an advisory score; a super-admin reviews it. The engagement then runs on project boards, a data room, NDA signing and billing.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Live at edenkode.io with the public application open. Scores stay advisory and never auto-apply.',
        },
      ],
      results: [
        {
          v: '31',
          l: 'Readiness signals',
        },
        {
          v: '8',
          l: 'Assessment vectors',
        },
        {
          v: '0',
          l: 'Scores auto-applied',
        },
      ],
      team: {
        size: 0,
        label: 'CTO-led',
        note: 'Alec has been CTO at EdenKode since 2024. The guiding decision: AI drafts, humans decide.',
      },
      stack: ['AI scoring', 'Data room', 'NDA signing', 'Billing'],
    },
  },
  {
    name: 'Celestial Studio Salon',
    key: 'celestial',
    kind: 'client',
    tags: ['Full Stack', 'SaaS', 'Booking'],
    date: '03/15/25',
    description:
      'A fully configurable booking system for a local salon in Peoria. A landing page configurator, local client and appointment recognition, built-in CRM, calendar scheduling, and Stripe payment intents for deposits and cancellation fees.',
    link: {
      href: 'https://www.celestialsalon.co',
      label: 'celestialsalon.co',
    },
    status: 'development',
    whatHappened:
      'MVP launched with active clients coming in; the full feature suite is still in active development.',
    activity: [10, 20, 35, 50, 65, 80, 85, 95, 100],
    story: {
      lede: 'Booking software for a Peoria salon that protects the chair as much as the calendar.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'A local salon needed booking that also protects its time: a deposit up front and a fee for late cancellations.',
        },
        {
          t: 'The build',
          i: 'customize',
          b: 'A configurable landing page, client and appointment recognition, a built-in CRM, calendar scheduling, and Stripe payment intents that take deposits and cancellation fees.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'The MVP is live with active clients booking; the full feature suite is still in development.',
        },
      ],
      results: [
        {
          v: 'MVP',
          l: 'Live with active clients',
        },
        {
          v: '2',
          l: 'Fees protected: deposit and cancellation',
        },
        {
          v: '1',
          l: 'Place for bookings, CRM and payments',
        },
      ],
      team: {
        size: 0,
        label: 'Client build',
        note: 'A client build for a local studio in Peoria.',
      },
      stack: ['Full stack', 'Stripe payment intents', 'CRM', 'Calendar'],
    },
  },
  {
    name: 'Kingdom Kode',
    key: 'kingdomkode',
    kind: 'venture',
    tags: ['Agency', 'AI'],
    date: '02/01/25',
    description:
      'Affordable, top-tier AI solutions, software, website and design services that solve problems right the first time, so businesses can thrive in a competitive digital landscape.',
    link: {
      href: 'https://kingdomkode.com',
      label: 'kingdomkode.com',
    },
    status: 'live',
    whatHappened:
      'Launching creative, AI-powered solutions for growing brands and teams.',
    activity: [20, 30, 25, 40, 50, 45, 60, 75, 80],
    story: {
      lede: 'An AI-first studio built to solve the problem right the first time.',
      chapters: [
        {
          t: 'Why it exists',
          i: 'search',
          b: 'Affordable, top-tier AI, software, website and design services that solve the problem right the first time, so growing businesses can compete.',
        },
        {
          t: 'How it works',
          i: 'workflow',
          b: 'Every engagement runs the same way: a 1 to 2 week blueprint, 2 to 4 weeks of design, 4 to 10 weeks of build, then a retainer. Deliveries land Thursdays at 5 pm, with a demo after every sprint.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Live and delivering AI-powered solutions for growing brands and teams.',
        },
      ],
      results: [
        {
          v: '100+',
          l: 'Projects shipped',
        },
        {
          v: '4.9★',
          l: 'Client rating',
        },
        {
          v: '1–2 wk',
          l: 'Blueprint before any build',
        },
      ],
      team: {
        size: 2,
        label: 'Co-founded',
        note: 'Co-founded with Tavarse Green, now COO. Every client gets a dedicated success manager and sees working software after every sprint.',
      },
      stack: ['AI', 'Web', 'Mobile', 'Design'],
    },
  },
  {
    name: 'ConventionSuite - GSC™',
    key: 'conventionsuite',
    kind: 'client',
    tags: ['Enterprise SaaS'],
    date: '09/30/24',
    description:
      'Enterprise event management system for general service contracts and exhibitor orders, built on Next.js and Oracle NetSuite.',
    org: 'Built at NewGen',
    link: {
      href: 'https://conventionsuite.com',
      label: 'conventionsuite.com',
    },
    status: 'live',
    whatHappened:
      'Launched and partnered with the largest general service contract companies in the world.',
    activity: [100, 75, 50, 35, 25, 25, 25, 25, 25],
    story: {
      lede: 'Enterprise event management for the companies that build the trade-show floor.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'General service contractors manage service contracts and exhibitor orders for every show, and they needed it to run on Oracle NetSuite.',
        },
        {
          t: 'The build',
          i: 'blocks',
          b: 'A Next.js application on Oracle NetSuite for general service contracts and exhibitor orders, packaged with the SuiteCloud SDK as a SuiteApp and shipped through the bundle distribution network.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Launched and partnered with the largest general service contract companies in the world.',
        },
      ],
      results: [
        {
          v: '3',
          l: 'Developers on the team',
        },
        {
          v: 'Largest',
          l: 'GSC companies partnered',
        },
        {
          v: 'SuiteApp',
          l: 'Distribution through NetSuite',
        },
      ],
      team: {
        size: 3,
        label: 'Team of three',
        note: 'Three developers at NewGen. As Senior Lead, Alec owned the architecture, set technical direction and mentored the engineers through the build.',
      },
      stack: [
        'Next.js',
        'Oracle NetSuite',
        'SuiteCloud SDK',
        'SuiteApp',
        'Bundles',
      ],
      netsuite: true,
    },
  },
  {
    name: 'Exhibit House Platform',
    key: 'exhibithouse',
    kind: 'client',
    tags: ['Enterprise SaaS', 'NetSuite'],
    // TODO(alec): confirm the date and status; both are assumptions.
    date: '09/30/24',
    description:
      'The exhibit-house application in the ConventionSuite product suite: an in-house React app served within NetSuite, set up and distributed with the SuiteCloud SDK, the SuiteApp framework and the bundle distribution network.',
    org: 'Built at NewGen',
    link: {
      href: '#',
      label: 'Delivered as a SuiteApp',
    },
    status: 'live',
    privateNote: 'Delivered inside customer NetSuite accounts. Not public.',
    whatHappened: 'Part of the ConventionSuite product suite built at NewGen.',
    activity: [30, 45, 55, 60, 70, 65, 70, 75, 75],
    story: {
      lede: 'The exhibit-house side of the ConventionSuite product suite, running inside NetSuite.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Exhibit houses build the booths that general service contractors place on the floor. They needed their own workspace tied to the same orders and shows.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'An in-house React application served within NetSuite, so teams work inside the account they already use. Set up and distributed with the SuiteCloud SDK, the SuiteApp framework and the bundle distribution network.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Part of the ConventionSuite product suite built at NewGen.',
        },
      ],
      results: [
        {
          v: '1',
          l: 'Account: runs inside NetSuite',
        },
        {
          v: '0',
          l: 'Separate front ends to host',
        },
        {
          v: 'SuiteApp',
          l: 'Distribution through NetSuite',
        },
      ],
      team: {
        size: 0,
        label: 'Built at NewGen',
        note: 'Built in-house at NewGen alongside ConventionSuite, on the same architecture Alec led as Senior Lead.',
      },
      stack: ['React', 'NetSuite', 'SuiteCloud SDK', 'SuiteApp', 'Bundles'],
      netsuite: true,
    },
  },
  {
    name: 'M i P i',
    key: 'mipi',
    kind: 'venture',
    tags: ['Creator Platform', 'SaaS'],
    date: '08/15/24',
    description:
      'Technology that lets artists and creators build their own communities and build wealth.',
    link: {
      href: 'http://i.mipi.io',
      label: 'i.mipi.io',
    },
    status: 'development',
    whatHappened:
      'Early-development SaaS with customer-market fit and growing. Associated with the OneDay Program.',
    activity: [10, 20, 40, 35, 50, 45, 60, 70, 85],
    story: {
      lede: 'Technology that lets artists and creators own their community and build wealth.',
      chapters: [
        {
          t: 'Why it exists',
          i: 'search',
          b: 'Founded in October 2020 to give artists and creators technology to build their own communities and build wealth.',
        },
        {
          t: 'The build',
          i: 'responsive',
          b: 'A creator platform and portfolio SaaS, and the studio where the AMWARE playbook was first productized.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Early-development SaaS with customer-market fit and growing, associated with the OneDay Program.',
        },
      ],
      results: [
        {
          v: '2020',
          l: 'Founded',
        },
        {
          v: 'Fit',
          l: 'Customer-market fit found',
        },
        {
          v: 'OneDay',
          l: 'Program it grew from',
        },
      ],
      team: {
        size: 0,
        label: 'Founder-led',
        note: 'Alec founded MiPi. It is where the build-measure-ship habits behind AMWARE were first turned into a repeatable product.',
      },
      stack: ['SaaS', 'Creator tools'],
    },
  },
  {
    name: 'PortalGen™',
    key: 'portalgen',
    kind: 'client',
    tags: ['Enterprise SaaS', 'PWA'],
    date: '05/12/24',
    description:
      'A fully customizable system for generating PWAs (portal web applications) on Oracle NetSuite backend technologies.',
    org: 'Built at NewGen',
    link: {
      href: 'https://newgennow.com/portalgen',
      label: 'newgennow.com/portalgen',
    },
    status: 'live',
    whatHappened: 'Launched and growing rapidly.',
    activity: [40, 60, 35, 65, 30, 30, 30, 20, 10],
    story: {
      lede: 'A generator for portal web applications that run on NetSuite.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Customers needed portal web apps on top of NetSuite without a custom build every time.',
        },
        {
          t: 'The build',
          i: 'blocks',
          b: 'A fully customizable system that generates PWAs on Oracle NetSuite backend technologies, set up and distributed with the SuiteCloud SDK, the SuiteApp framework and the bundle distribution network.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Launched and growing rapidly.',
        },
      ],
      results: [
        {
          v: 'PWA',
          l: 'Generated per customer',
        },
        {
          v: 'SuiteApp',
          l: 'Distribution through NetSuite',
        },
        {
          v: '1',
          l: 'Generator, many portals',
        },
      ],
      team: {
        size: 1,
        label: 'Mainly built by Alec',
        note: 'Designed and built mainly by Alec at NewGen: one generator instead of a custom portal for every customer.',
      },
      stack: ['PWA', 'NetSuite', 'SuiteCloud SDK', 'SuiteApp', 'Bundles'],
      netsuite: true,
    },
  },
  {
    name: '@neatsuite/http',
    key: 'neatsuite',
    kind: 'oss',
    tags: ['Open Source', 'TypeScript'],
    date: '01/20/24',
    description:
      'A TypeScript-first NetSuite HTTP client with OAuth 1.0a signing, smart retries and a clean developer experience for SuiteTalk REST and RESTlets.',
    link: {
      href: 'https://github.com/heavenlyentity/neatsuite',
      label: 'github.com',
    },
    status: 'live',
    whatHappened:
      'Released as part of the NeatSuite monorepo; actively maintained and adopted in projects.',
    activity: [60, 50, 70, 65, 80, 75, 85, 90, 95],
    story: {
      lede: 'The NetSuite HTTP client Alec wanted on every project, so he wrote it.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Calling SuiteTalk REST and RESTlets means signing every request with OAuth 1.0a and handling retries yourself.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'A TypeScript-first client with OAuth 1.0a signing, smart retries and a clean developer experience, released as part of the NeatSuite monorepo.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Actively maintained and adopted in projects.',
        },
      ],
      results: [
        {
          v: 'OAuth 1.0a',
          l: 'Signing built in',
        },
        {
          v: '2',
          l: 'APIs: SuiteTalk REST and RESTlets',
        },
        {
          v: 'OSS',
          l: 'Open source on GitHub',
        },
      ],
      team: {
        size: 1,
        label: 'Solo',
        note: 'Written and maintained by Alec.',
      },
      stack: ['TypeScript', 'OAuth 1.0a', 'SuiteTalk REST', 'RESTlets'],
    },
  },
  {
    name: 'Auth.js - NetSuite Provider',
    key: 'authjs',
    kind: 'oss',
    tags: ['Open Source'],
    date: '11/05/23',
    description:
      'A NetSuite provider for Auth.js, for straightforward authentication and authorization in NetSuite hybrid applications.',
    link: {
      href: 'https://authjs.dev/getting-started/providers/netsuite?framework=next-js',
      label: 'authjs.dev',
    },
    status: 'live',
    whatHappened:
      'Merged into Auth.js and ready for release in version 5. Next it moves into better-auth as Auth.js converts.',
    activity: [30, 25, 40, 45, 35, 50, 60, 75, 85],
    story: {
      lede: 'A NetSuite sign-in provider, now part of Auth.js itself.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Hybrid NetSuite applications had no standard way to authenticate users through NetSuite.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'A NetSuite provider for Auth.js covering authentication and authorization for NetSuite hybrid applications.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Merged into Auth.js and ready for release in version 5. Next it moves into better-auth as Auth.js converts.',
        },
      ],
      results: [
        {
          v: 'Merged',
          l: 'Into Auth.js',
        },
        {
          v: 'v5',
          l: 'Release it ships in',
        },
        {
          v: 'Next',
          l: 'better-auth',
        },
      ],
      team: {
        size: 1,
        label: 'Solo',
        note: 'Built and contributed upstream by Alec.',
      },
      stack: ['Auth.js', 'Next.js', 'NetSuite OAuth'],
    },
  },
  {
    name: 'Chamoji',
    key: 'chamoji',
    kind: 'oss',
    tags: ['CLI Tool', 'Open Source', 'GitHub Action'],
    date: '10/14/23',
    description:
      'An open-source changelog CLI that reads gitmoji, Conventional Commits and plain messages, picks the next version and cuts the whole release in one command.',
    link: {
      href: 'https://chamoji.dev',
      label: 'chamoji.dev',
    },
    status: 'live',
    whatHappened:
      'Released on npm as @chamoji/cli, with a GitHub Action and an agent skill. A hosted Cloud tier has an early-access waitlist at chamoji.dev.',
    activity: [15, 20, 10, 25, 35, 30, 40, 50, 60],
    story: {
      lede: 'Changelogs written by the commits you already make.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Release notes get written from memory, the version bump is a guess, dependency updates bury the features, and the changelog, manifest and tag drift apart.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'Its own changelog engine sorts any mix of commit styles into readable sections, collapses dependency noise and picks the next semver version, offline and without an API key. chamoji release then writes the changelog, bumps, commits and tags in one step.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'Released and cutting its own releases. A GitHub Action writes release notes and PR previews, an agent skill lets Claude Code or Cursor ship a release, and Cloud has an early-access waitlist. The commit composer is next.',
        },
      ],
      results: [
        {
          v: '3',
          l: 'Commit styles it reads',
        },
        {
          v: '1',
          l: 'Command to cut a release',
        },
        {
          v: '10%',
          l: 'Median unsorted, 6 public repos, no AI',
        },
      ],
      team: {
        size: 1,
        label: 'Solo',
        note: 'Built and maintained by Alec.',
      },
      stack: ['CLI', 'Node.js', 'GitHub Actions', 'Agent skills'],
    },
  },
  {
    name: 'Windstone',
    key: 'windstone',
    kind: 'venture',
    tags: ['Desktop App', 'Privacy'],
    date: '03/10/23',
    description:
      'A highly private web browser desktop application built in Electron.',
    link: {
      href: '#',
      label: 'github.com',
    },
    status: 'archived',
    whatHappened: 'The company went bankrupt, and Sideskick was born from it.',
    activity: [80, 70, 60, 50, 40, 30, 20, 10, 5],
    story: {
      lede: 'A privacy-first desktop browser.',
      chapters: [
        {
          t: 'The idea',
          i: 'search',
          b: 'Browsing without being tracked should be the default, not a setting.',
        },
        {
          t: 'The build',
          i: 'computer',
          b: 'A highly private web browser desktop application built in Electron.',
        },
        {
          t: 'What happened',
          i: 'workflow',
          b: 'The company went bankrupt, and Sideskick was born from what it learned.',
        },
      ],
      results: [
        {
          v: 'Electron',
          l: 'Desktop app',
        },
        {
          v: 'Privacy',
          l: 'By default',
        },
        {
          v: '→',
          l: 'Became Sideskick',
        },
      ],
      team: {
        size: 0,
        label: 'Early venture',
        note: 'An early venture; what it learned went into Sideskick.',
      },
      stack: ['Electron', 'Desktop'],
    },
  },
  {
    name: 'Furious Froth Coffee®',
    key: 'furiousfroth',
    kind: 'client',
    tags: ['E-commerce', 'Headless'],
    date: '06/20/22',
    description:
      'A coffee storefront on Shopify with a headless Next.js front end.',
    link: {
      href: '#',
      label: 'github.com',
    },
    status: 'archived',
    whatHappened: 'Started the OneDay Program and shifted focus to MiPi.',
    activity: [75, 65, 55, 45, 35, 25, 15, 5, 0],
    story: {
      lede: 'A coffee storefront with a headless front end.',
      chapters: [
        {
          t: 'The idea',
          i: 'search',
          b: 'A coffee brand that needed a storefront.',
        },
        {
          t: 'The build',
          i: 'code',
          b: 'Shopify for commerce with a headless Next.js storefront in front of it.',
        },
        {
          t: 'What happened',
          i: 'workflow',
          b: 'The OneDay Program started and focus shifted to MiPi.',
        },
      ],
      results: [
        {
          v: 'Headless',
          l: 'Next.js storefront',
        },
        {
          v: 'Shopify',
          l: 'Commerce engine',
        },
        {
          v: '→',
          l: 'Led to MiPi',
        },
      ],
      team: {
        size: 2,
        label: 'Alec and a coffee expert',
        note: 'Built by Alec with a coffee expert: product knowledge on one side, the storefront on the other.',
      },
      stack: ['Next.js', 'Shopify', 'Headless'],
    },
  },
  {
    name: 'VRSA',
    key: 'vrsa',
    kind: 'internal',
    tags: ['Internal Tool', 'Security'],
    date: '04/11/21',
    description:
      'An automated patching tool for internal servers: analyze, schedule and patch server vulnerabilities in one React and .NET system.',
    link: {
      href: '#',
      label: 'Internal',
    },
    status: 'archived',
    whatHappened: 'The company was acquired by TD Ameritrade.',
    activity: [90, 80, 70, 60, 50, 40, 30, 20, 10],
    story: {
      lede: 'An internal tool that turned server patching into a schedule instead of a scramble.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'Internal servers needed their vulnerabilities analyzed, scheduled and patched from one place.',
        },
        {
          t: 'The build',
          i: 'system',
          b: 'An automated patching tool in React and .NET: analyze, schedule and patch server vulnerabilities in one system.',
        },
        {
          t: 'What happened',
          i: 'workflow',
          b: 'The company was acquired by TD Ameritrade.',
        },
      ],
      results: [
        {
          v: '3',
          l: 'Steps in one tool: analyze, schedule, patch',
        },
        {
          v: 'React',
          l: 'and .NET',
        },
        {
          v: 'Internal',
          l: 'Not public',
        },
      ],
      team: {
        size: 0,
        label: 'Internal tool',
        note: 'Built for internal servers; never public.',
      },
      stack: ['React', '.NET', 'Security'],
    },
  },
  {
    name: 'VB Remote Sat',
    key: 'vbremotesat',
    kind: 'internal',
    tags: ['Internal Tool', 'Automation'],
    date: '07/08/20',
    description:
      'Used by desktop support techs across the globe at Honeywell: multiple remote sessions, imaging and fully automated setup in a couple of minutes instead of hours.',
    link: {
      href: '#',
      label: 'Internal',
    },
    status: 'live',
    whatHappened: 'Launched and trained 100+ users; still in use today.',
    activity: [40, 55, 40, 60, 20, 55, 45, 65, 70],
    story: {
      lede: 'The tool that more than doubled how many laptops Honeywell IT could set up in a day.',
      chapters: [
        {
          t: 'The problem',
          i: 'search',
          b: 'At Honeywell Aerospace headquarters, 10 to 30 laptops reached IT every day and each had to be imaged and set up the same day. On a 36-laptop day, the old process finished 12.',
        },
        {
          t: 'The build',
          i: 'system',
          b: 'A tool that runs multiple remote sessions and automates imaging and every setup step, in a couple of minutes instead of hours.',
        },
        {
          t: 'Where it stands',
          i: 'rocket',
          b: 'With it the team finished 26 on a 36-laptop day. More than 100 desktop support techs were trained, and it is still in use today.',
        },
      ],
      results: [
        {
          v: '12',
          l: 'Laptops finished before',
        },
        {
          v: '26',
          l: 'Laptops finished after',
        },
        {
          v: '100+',
          l: 'Techs trained',
        },
      ],
      team: {
        size: 1,
        label: 'Built by Alec',
        note: 'Built by Alec as an automation programmer, then rolled out to desktop support teams across the globe.',
      },
      stack: ['Automation', 'Remote sessions', 'Imaging'],
    },
  },
]

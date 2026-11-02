/* WareKit storefront copy, from the approved board
   (docs/design/2026-10-27-portfolio-upgrade/reference/products.design.html).
   Only words live here. Whether an edition is on sale, and what it costs,
   comes from Payload through lib/commerce/kitEditions.js. */

/* `cta`, `tone` and the recommended chip apply while an edition is on sale;
   a planned one always shows "Get notified". The two editions the board wrote
   as planned carry `onSale`, which replaces their words once they are on sale.
   `copyLite` is added to a planned edition's `copy` only while React Lite can
   be reached. */
export const EDITIONS = {
  inside: [
    {
      id: 'react-lite',
      label: 'React / Lite',
      full: 'WareKit React NetSuite (Lite)',
      head: 'Build React apps inside NetSuite.',
      copy: 'Start with a Suitelet-served React foundation, local fixtures, and deployment tooling for your account.',
      listLabel: 'Included',
      items: [
        'Suitelet-served React foundation',
        'Local fixtures, no account needed to explore',
        'Deployment tooling for your account',
      ],
      seatLabel: 'one GitHub account',
      cta: 'Get Lite',
      tone: 'solid',
      rec: true,
      recLabel: 'Start here',
    },
    {
      id: 'react-pro',
      label: 'React / Pro',
      full: 'WareKit React NetSuite (Pro)',
      head: 'A commercial SuiteApp foundation, in development.',
      copy: 'Planned extensions on top of Lite.',
      copyLite: 'Start with React Lite while development continues.',
      listLabel: 'Planned modules',
      items: ['Licensing', 'Permissions and packaging', 'Administration'],
      // TODO(alec): confirm this wording before React Pro goes on sale.
      onSale: {
        head: 'A commercial SuiteApp foundation.',
        copy: 'Extensions on top of Lite.',
        listLabel: 'Modules',
      },
      seatLabel: 'one GitHub account',
      cta: 'Buy Pro',
      tone: 'solid',
      rec: false,
    },
    {
      id: 'react-team',
      label: 'React / Team',
      full: 'WareKit React NetSuite (Team)',
      head: 'A shared SuiteApp foundation, in development.',
      copy: 'The planned React Pro edition for five GitHub collaborators, with one shared source foundation.',
      listLabel: 'Planned',
      items: [
        'The same planned Pro code',
        'Five source-code seats',
        'Team onboarding',
      ],
      // TODO(alec): confirm this wording before React Team goes on sale.
      onSale: {
        head: 'A shared SuiteApp foundation.',
        copy: 'The React Pro edition for five GitHub collaborators, with one shared source foundation.',
        listLabel: 'Included',
        items: [
          'The same Pro code',
          'Five source-code seats',
          'Team onboarding',
        ],
      },
      seatLabel: 'five GitHub collaborators',
      cta: 'Buy Team',
      tone: 'solid',
      rec: false,
    },
  ],
  connected: [
    {
      id: 'next-lite',
      label: 'Next / Lite',
      full: 'WareKit Next NetSuite (Lite)',
      head: 'Build a Next.js app connected to NetSuite.',
      copy: 'Explore the hybrid architecture with local fixtures before connecting your account. Lite stores sessions in Postgres.',
      listLabel: 'Included',
      items: [
        'Browser, Next.js server and NetSuite foundation',
        'Sessions stored in Postgres',
        'Local fixtures before you connect',
      ],
      seatLabel: 'one GitHub account',
      cta: 'Get Lite',
      tone: 'quiet',
      rec: false,
    },
    {
      id: 'next-pro',
      label: 'Next / Pro',
      full: 'WareKit Next NetSuite (Pro)',
      head: 'Keep your app’s sessions in NetSuite.',
      copy: 'A Next.js foundation with NetSuite-backed sessions and caching designed to reduce repeated session reads.',
      listLabel: 'Included',
      items: [
        'NetSuite-backed session storage',
        'Caching to reduce repeated session reads',
        'No separate Postgres service for sessions',
      ],
      seatLabel: 'one GitHub collaborator',
      cta: 'Buy Pro',
      tone: 'solid',
      rec: true,
      recLabel: 'Sessions in NetSuite',
    },
    {
      id: 'next-team',
      label: 'Next / Team',
      full: 'WareKit Next NetSuite (Team)',
      head: 'Give five developers one shared foundation.',
      copy: 'The Next Pro codebase for five GitHub accounts. Add collaborators after purchase as your team needs access.',
      listLabel: 'Included',
      items: [
        'Everything in Next Pro',
        'Five GitHub collaborator seats',
        'Add collaborators after purchase',
      ],
      seatLabel: 'five GitHub collaborators',
      cta: 'Buy Team',
      tone: 'solid',
      rec: false,
    },
  ],
}

export const FAMILIES = {
  inside: { kicker: 'Inside NetSuite', title: 'React editions.' },
  connected: { kicker: 'Connected to NetSuite', title: 'Next.js editions.' },
  built: { kicker: 'Built for you', title: 'Have it built.' },
}

/* Each line claims something about what is on sale, so
   lib/commerce/kitEditions.js picks the one that is true right now. */
export const EDITION_LEADS = {
  inside:
    'React Lite is free and available today. Pro and Team are planned, so they have no checkout yet.',
  connected:
    'Start free with Lite. Pro moves sessions into NetSuite; Team licenses the same code for five developers.',
  connectedPaid:
    'Pro moves sessions into NetSuite; Team licenses the same code for five developers.',
  built: 'For business owners who want the outcome, not the framework.',
}
export const NOT_ON_SALE_LEAD =
  'These editions are not on sale yet. Leave your email and you will hear when they are.'
export const NOT_ON_SALE_WHY =
  'This edition is not on sale yet. Leave your email and you will hear when it is.'

export const FACTS = [
  {
    icon: 'github',
    title: 'Code through GitHub',
    copy: 'Confirm your GitHub account after payment and the repository invite follows.',
  },
  {
    icon: 'camera',
    title: 'Runs on fixtures first',
    copy: 'Explore every kit locally before you connect a NetSuite account.',
  },
  {
    icon: 'users',
    title: 'Seats are developers',
    copy: 'Team editions license the code for five GitHub collaborators, not NetSuite users.',
  },
]

export const PATHS = [
  {
    family: 'inside',
    name: 'Inside NetSuite',
    copy: 'For signed-in internal users. The app is served from your account, so there is no separate frontend to host.',
    route: 'React editions →',
  },
  {
    family: 'connected',
    name: 'Connected to NetSuite',
    copy: 'A separately hosted interface with a server-side integration into your account.',
    route: 'Next.js editions →',
  },
  {
    family: 'built',
    name: 'Need someone to build it',
    copy: 'Skip the framework decision. Bring the workflow and I scope the right build with you.',
    route: 'Services →',
  },
]

export const BUILD_PROCESS = [
  {
    title: 'Understand the workflow',
    copy: 'Who uses it, what it replaces, and where it has to run.',
  },
  {
    title: 'Document the architecture',
    copy: 'Inside or connected, constraints, and who owns which account setup.',
  },
  {
    title: 'Scope the implementation',
    copy: 'What is in, what is out, and what it costs.',
  },
  {
    title: 'Demonstrate in a sandbox',
    copy: 'Working software in your sandbox before anything reaches production.',
  },
  {
    title: 'Agree on handover',
    copy: 'Who owns the code and the account afterwards.',
  },
]

/* `sessions` only matters to an app hosted outside NetSuite. */
export const QUESTIONS = [
  {
    k: 'where',
    label: 'Where does the app need to run?',
    opts: [
      ['inside', 'Inside NetSuite'],
      ['connected', 'Hosted separately'],
    ],
  },
  {
    k: 'who',
    label: 'Who is building it?',
    opts: [
      ['dev', 'I have a developer'],
      ['build', 'I need it built'],
    ],
  },
  {
    k: 'sessions',
    label: 'Where should sessions live?',
    opts: [
      ['pg', 'Postgres is fine'],
      ['ns', 'Inside NetSuite'],
    ],
    skipInside: true,
  },
  {
    k: 'seats',
    label: 'How many developers need the code?',
    opts: [
      ['one', 'Just one'],
      ['five', 'Up to five'],
    ],
  },
]

/* A row of `cells: 'price'` or `'status'` is filled from Payload. `rec` is
   the recommended column. */
export const COMPARE = {
  inside: {
    family: 'React editions',
    head: ['Lite', 'Pro', 'Team'],
    rec: 0,
    rows: [
      {
        label: 'Runs',
        cells: ['Inside NetSuite', 'Inside NetSuite', 'Inside NetSuite'],
      },
      {
        label: 'Hosting',
        cells: [
          'Served from your account',
          'Served from your account',
          'Served from your account',
        ],
      },
      {
        label: 'Code seats',
        cells: [
          '1 GitHub account',
          '1 GitHub account',
          '5 GitHub collaborators',
        ],
      },
      { label: 'Price', cells: 'price' },
      { label: 'Status', cells: 'status' },
    ],
  },
  connected: {
    family: 'Next.js editions',
    head: ['Lite', 'Pro', 'Team'],
    rec: 1,
    rows: [
      {
        label: 'Runs',
        cells: [
          'Hosted, connected to NetSuite',
          'Hosted, connected to NetSuite',
          'Hosted, connected to NetSuite',
        ],
      },
      {
        label: 'Sessions',
        cells: ['Postgres', 'Inside NetSuite', 'Inside NetSuite'],
      },
      {
        label: 'Session reads',
        cells: [
          'Standard',
          'Cached to reduce repeats',
          'Cached to reduce repeats',
        ],
      },
      {
        label: 'Code seats',
        cells: [
          '1 GitHub account',
          '1 GitHub collaborator',
          '5 GitHub collaborators',
        ],
      },
      { label: 'Price', cells: 'price' },
    ],
  },
}

/* The heading and first step describe how an edition is reached, so
   lib/commerce/kitEditions.js picks the pair that matches what is on sale. */
export const SETUP_INTROS = {
  both: {
    kicker: '04 · After you check out',
    first:
      'Claim a Lite edition or check out, then confirm the GitHub account that gets the invite.',
  },
  free: {
    kicker: '04 · After you claim Lite',
    first:
      'Claim a Lite edition, then confirm the GitHub account that gets the invite.',
  },
  paid: {
    kicker: '04 · After you check out',
    first: 'Check out, then confirm the GitHub account that gets the invite.',
  },
  none: {
    kicker: '04 · After you buy',
    first:
      'When an edition ships, confirm the GitHub account that gets the invite.',
  },
}

/* The first step's copy comes from SETUP_INTROS. */
export const SETUP_STEPS = [
  { icon: 'github', title: 'Get GitHub access' },
  {
    icon: 'terminal',
    title: 'Run the local example',
    copy: 'Start it with fixtures. No NetSuite account is needed for this step.',
  },
  {
    icon: 'settings',
    title: 'Configure your account',
    copy: 'Set up authentication and permissions in the NetSuite account you will deploy to.',
  },
  {
    icon: 'shield',
    title: 'Validate in your sandbox',
    copy: 'Prove it against real data in a sandbox before anything reaches production.',
  },
]

export const STANDARD_STACK = ['Supabase', 'Drizzle', 'Prisma', 'Manifest']

/* The Standard edition's data layers, in picker order. `files` are the
   standard layout of each tool, shown as planned structure: the kits are not
   built yet, so nothing here describes shipped code. */
export const STACKS = [
  {
    id: 'supabase',
    label: 'Supabase',
    sub: 'Postgres as a service',
    glyph: 'SB',
    cap: 'Hosted Postgres with auth, storage and row-level security.',
    files: [
      'supabase/config.toml',
      'supabase/migrations/',
      'lib/supabase/server.ts',
      'lib/supabase/client.ts',
    ],
  },
  {
    id: 'drizzle',
    label: 'Drizzle',
    sub: 'SQL-first ORM',
    glyph: 'DZ',
    cap: 'A SQL-first TypeScript ORM. Schema in code, migrations you can read.',
    files: [
      'drizzle.config.ts',
      'db/schema.ts',
      'db/migrations/',
      'db/index.ts',
    ],
  },
  {
    id: 'prisma',
    label: 'Prisma',
    sub: 'Schema-first ORM',
    glyph: 'PR',
    cap: 'A schema-first ORM with a generated, fully typed client.',
    files: ['prisma/schema.prisma', 'prisma/migrations/', 'lib/prisma.ts'],
  },
  {
    id: 'manifest',
    label: 'Manifest',
    sub: 'One-file backend',
    glyph: 'YML',
    cap: 'A whole backend in one YAML file, with a REST API and an admin panel.',
    files: ['manifest/backend.yml'],
  },
]

/* The files every data layer shares. The first two sit above the layer's own
   files and the rest below them. */
export const COMMON = ['app/', 'components/', '.env.example', 'package.json']

export const STANDARD_STEPS = [
  {
    icon: 'database',
    title: 'Pick a data layer',
    copy: 'Supabase, Drizzle, Prisma or Manifest. Change it any time before you join.',
  },
  {
    icon: 'mail',
    title: 'Join the waitlist',
    copy: 'One email when your kit ships. Nothing else.',
  },
  {
    icon: 'rocket',
    title: 'The top pick ships first',
    copy: 'Waitlist signups per data layer set the order the kits get built.',
  },
]

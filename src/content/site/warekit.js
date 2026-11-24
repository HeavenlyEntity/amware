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
      cta: 'Buy Pro',
      tone: 'solid',
      rec: false,
    },
    {
      id: 'react-team',
      label: 'React / Team',
      full: 'WareKit React NetSuite (Team)',
      head: 'A shared SuiteApp foundation, in development.',
      copy: 'The planned React Pro edition for five developers, with one shared source foundation.',
      listLabel: 'Planned',
      items: [
        'The same planned Pro code',
        'Five developers',
        'Team onboarding',
      ],
      // TODO(alec): confirm this wording before React Team goes on sale.
      onSale: {
        head: 'A shared SuiteApp foundation.',
        copy: 'The React Pro edition for five developers, with one shared source foundation.',
        listLabel: 'Included',
        items: ['The same Pro code', 'Five developers', 'Team onboarding'],
      },
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
      copy: 'The Next Pro codebase for five developers. Add developers after purchase as your team needs access.',
      listLabel: 'Included',
      items: [
        'Everything in Next Pro',
        'Five developers',
        'Add developers after purchase',
      ],
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

/* Said once on the compare table and again where money changes hands. */
export const START_WITH_PRO =
  'Start with Pro. Move to Team later and pay only the difference.'
export const NEVER_CHECKS =
  'Your app never checks a license. Nothing stops working if you go over a limit.'
export const REFUND_NOTE =
  "Full refund within 14 days if you haven't accepted the GitHub invite."
export const UPGRADE_NOTE = 'Already on Pro? Pay only the difference.'
export const UPGRADE_HREF = '/access/resend?intent=upgrade'
export const ENTERPRISE_CTA = 'Talk to me about Enterprise'
/* TODO(alec): "quoted per deal, with the limits set to fit you" is a licence
   term the board doesn't carry. Confirm it against the licence text. */
export const ENTERPRISE_NOTE =
  'More than five developers is past Team. Enterprise is quoted per deal, with the limits set to fit you.'

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
    title: 'Licensed by developer',
    copy: 'Team editions license the code for five developers, not NetSuite users.',
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
      ['more', 'More than five'],
    ],
  },
]

/* A row of `cells: 'price'`, `'status'`, `'developers'` or `'accounts'` is
   filled from Payload, so no limit is typed twice. `note` sits under the
   row's label. `rec` is the recommended column. */
/* TODO(alec): sandboxes and Release Preview not counting is a licence term
   the board doesn't carry. Confirm it against the licence text. */
export const ACCOUNTS_NOTE =
  "Yours or a client's. Sandboxes and Release Preview don't count."
const ACCOUNTS_ROW = {
  label: 'NetSuite accounts',
  cells: 'accounts',
  note: ACCOUNTS_NOTE,
}

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
      { label: 'Developers', cells: 'developers' },
      ACCOUNTS_ROW,
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
      { label: 'Developers', cells: 'developers' },
      ACCOUNTS_ROW,
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
    copy: 'Set up authentication and permissions in the NetSuite account you will deploy to. With a paid edition, also add your license key to .env as WAREKIT_LICENSE_KEY, beside NS_ACCOUNT_ID.',
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
    /* TODO(alec): a promise about build order, from the board. Confirm the
       waitlist counts really set it. */
    title: 'The top pick ships first',
    copy: 'Waitlist signups per data layer set the order the kits get built.',
  },
]

/* ---- kit story -----------------------------------------------------------
 * The illustrated sections on a kit's product page, and the "what happens
 * next" strip on its setup page. Keyed by the product row's `stack` and
 * `tier`; a product with no entry renders none of them, so a React kit, a
 * guide or anything new looks the way it did before the story existed.
 *
 * Every fact is from the kit repository's README.md and docs/sessions.md
 * (amwaredotdev/warekit-next-netsuite and its -lite twin). Nothing here says
 * more than they do. Backticks mark inline code, resolved by inlineCode().
 *
 * `highlights` are phrases of the product's own tagline. They are only ever
 * applied to the tagline as it is stored: a phrase the tagline no longer
 * contains simply highlights nothing, so this can never add words to it. */

const NEXT_FLOW = {
  title: 'The browser never talks to NetSuite.',
  copy: 'NetSuite sends no CORS headers, and the only way around that is a credential in the bundle. So every NetSuite call goes through the app’s API routes, which hold the credential server-side.',
}

const nextNodes = (restletNote) => [
  { icon: 'browser', name: 'Browser', note: 'Your users. No secrets here.' },
  {
    icon: 'vercel',
    name: 'Next.js on Vercel',
    note: 'API routes hold the credential. `server-only`, so a leak fails the build.',
    accent: true,
  },
  { icon: 'restlet', name: 'NetSuite RESTlet', note: restletNote },
]

const NEXT_LAYERS = {
  title: 'Four layers between your traffic and the limit.',
  copy: 'NetSuite allows 15 concurrent requests on Service Tier 1, plus 10 per SuiteCloud Plus licence, shared by every integration in the account. A session read per request uses that up and starts returning 429s. Pro spends NetSuite calls on state changes, not on traffic.',
  items: [
    {
      name: 'Signed session cookie',
      note: 'Most requests make no NetSuite call at all.',
    },
    {
      name: 'Per-instance cache',
      note: 'Repeat reads inside one warm function.',
    },
    {
      name: 'In-flight collapsing',
      note: 'Concurrent misses for one key become one request.',
    },
    {
      name: 'N/cache in the RESTlet',
      note: 'Saves the search and the record load once a call arrives.',
    },
  ],
  trade:
    'The trade, stated plainly: sign-out is eventually consistent, up to the cache TTL (30 seconds by default, tunable).',
}

const NEXT_QUICK_START = {
  title: 'It runs before you have a NetSuite account.',
  copy: 'Three commands start it against built-in fixtures. Provision the account later.',
  commands: ['pnpm install', 'cp .env.example .env', 'pnpm dev'],
  note: 'No NetSuite account, no credentials. Sign-in needs an https tunnel: `pnpm dev:tunnel` starts one.',
}

const dir = (name, depth = 0, note = '') => ({ name, depth, note, dir: true })
const file = (name, depth = 0, note = '') => ({ name, depth, note, dir: false })

const nextTree = (pro) => [
  dir('apps/'),
  dir('web/', 1, 'the Next.js app'),
  dir('suiteapp/', 1, 'SDF project and RESTlets'),
  dir('e2e/', 1, 'Playwright tests'),
  dir('packages/'),
  dir('netsuite-server/', 1, 'server-only NetSuite client'),
  ...(pro
    ? [dir('netsuite-sessions/', 1, 'Better Auth adapter and cache')]
    : []),
  dir('brand/', 1),
  dir(
    'docs/',
    0,
    pro ? 'authentication, sessions, tooling' : 'authentication, tooling'
  ),
  dir('tooling/', 0, 'build, sync, tunnel'),
  file('.env.example'),
  file('warekit.json'),
]

const NEXT_ROADMAP =
  'Session storage is the first Pro feature to land. Licensing, role mapping, the data layer, the schema generator and observability are roadmap, and the repository says so rather than implying otherwise.'

const nextSteps = (licensed) => ({
  title: 'From invite to running app.',
  accept: { title: 'Accept the invite', note: 'From the email GitHub sends.' },
  run: {
    title: 'Clone and run',
    note: 'It runs on built-in fixtures before you connect NetSuite.',
  },
  /* Lite has no license key, so it has no third card. */
  key: licensed
    ? {
        title: 'Add your key',
        note: 'Your key is on your license page. The link is in your purchase email.',
      }
    : null,
})

const NEXT_PRO = {
  highlights: [
    'sessions in NetSuite',
    'one less service',
    'survives real traffic',
  ],
  flow: {
    ...NEXT_FLOW,
    nodes: nextNodes(
      'The SuiteScript half, deployed by SDF. Sessions live in a custom record.'
    ),
  },
  layers: NEXT_LAYERS,
  repo: { name: 'amwaredotdev/warekit-next-netsuite', tree: nextTree(true) },
  quickStart: NEXT_QUICK_START,
  roadmap: NEXT_ROADMAP,
  next: nextSteps(true),
}

export const kitStory = {
  'next-netsuite': {
    lite: {
      highlights: ['talk to NetSuite', 'Hosted on Vercel'],
      flow: {
        ...NEXT_FLOW,
        nodes: nextNodes('The SuiteScript half, deployed by SDF.'),
      },
      layers: null,
      repo: {
        name: 'amwaredotdev/warekit-next-netsuite-lite',
        tree: nextTree(false),
      },
      quickStart: NEXT_QUICK_START,
      roadmap: null,
      next: nextSteps(false),
    },
    pro: NEXT_PRO,
    /* Team is the Pro repository, licensed for more developers. */
    team: {
      ...NEXT_PRO,
      highlights: ['licensed for a team', 'up to five GitHub accounts'],
    },
  },
}

/** The story for a stack and tier, or null when there is none. */
export function storyFor(stack, tier) {
  if (typeof stack !== 'string' || typeof tier !== 'string') return null
  // Own keys only: a tier of "constructor" is not a story.
  const byStack = Object.hasOwn(kitStory, stack) ? kitStory[stack] : null
  return byStack && Object.hasOwn(byStack, tier) ? byStack[tier] : null
}

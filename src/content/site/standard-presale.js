/* Copy and data for the WareKit Standard founding-presale page, lifted from
   the approved board (Presale.dc.html). Plain data only: the page components
   read it. Prices here are the fallback figures; the live price comes from
   the product row. `{data}` and `{pay}` in the hero command are filled with
   the visitor's picks. */

export const PRESALE = {
  hero: {
    eyebrow: '// WAREKIT · STANDARD',
    chipsOpen: [
      'founding presale',
      'wave 1 of 4',
      'for cursor and claude code',
    ],
    chipsClosed: ['presale opens with wave 1', 'for cursor and claude code'],
    title: 'Your agent writes the code. The kit keeps it in line.',
    lede: 'WareKit Standard is a Next.js starter for people building with an AI agent. Accounts, teams, payments and AI are wired on day one. The rules are checks the build has to pass, so month two looks like week one.',
    command: 'warekit create my-app --data {data} --pay {pay}',
    commandStatus:
      'one data layer · one payment provider · nothing you didn’t pick',
    cta: 'become a founding member →',
    ctaClosed: 'join the waitlist →',
    secondary: { label: 'see what ships ↓', href: '#ships' },
    note: 'one payment · refund on request until v1.0',
    noteClosed: 'one email when the presale opens · nothing else',
  },
  picker: {
    title: 'Pick your stack once.',
    copy: 'The kit removes everything you didn’t pick, so your agent sees one way to do each thing.',
    dataLabel: 'Data layer',
    payLabel: 'Payments',
    treeTitle: 'my-app/ · what you get',
    lemon:
      'Lemon Squeezy is not supported. It stops processing payments on 31 March 2027.',
  },
  pains: {
    index: '01',
    eyebrow: 'SOUND FAMILIAR',
    meta: 'two of these true? keep reading',
    title: 'It works in week one. Month two is the problem.',
    copy: 'The agent is fast. Nothing tells it where things go, so every session invents a new way.',
    items: [
      'Every fix the agent makes breaks two other things.',
      'There are three ways to fetch data in the repo, and the agent just wrote a fourth.',
      'Billing works until a webhook fires twice.',
      'You can’t prove one customer can’t read another customer’s data.',
      'A secret key ended up in the code the browser downloads.',
      'Each new session starts from zero, with no record of what you already decided.',
    ],
  },
  ships: {
    index: '02',
    eyebrow: 'WHAT SHIPS',
    meta: 'wired, not stubbed',
    title: 'The parts every product needs, already connected.',
    copy: 'You start on the idea. The accounts, the money and the AI calls are done.',
    caption: 'six parts · one repository · nothing stubbed',
    items: [
      {
        id: 'accounts',
        label: '/accounts',
        title: 'People and teams.',
        description:
          'Personal and team accounts, roles and invitations. Every row belongs to an account.',
        colSpan: 2,
      },
      {
        id: 'ai',
        label: '/ai',
        title: 'AI you can charge for.',
        description:
          'Chat, text and structured output on the Vercel AI SDK. Every call is metered into billing.',
        rowSpan: 2,
      },
      {
        id: 'payments',
        label: '/payments',
        title: 'Payments that hold up.',
        description:
          'Subscriptions, one-time payments and usage billing, on the provider you pick.',
      },
      {
        id: 'dev-tool',
        label: '/dev-tool',
        title: 'A workbench on your machine.',
        description:
          'Checks settings, inspects tenants, previews emails and replays payment events.',
      },
      {
        id: 'interface',
        label: '/interface',
        title: 'A site and a dashboard.',
        description:
          'Marketing pages, a dashboard, settings and admin screens, in AMWARE’s own animated components.',
        colSpan: 2,
      },
      {
        id: 'stack',
        label: '/stack',
        title: 'A stack you already know.',
        description:
          'Next.js 16, TypeScript and Tailwind 4 on pnpm and Turborepo.',
      },
    ],
  },
  guards: {
    index: '03',
    eyebrow: 'THE GUARDS',
    meta: 'the reason to start here',
    title: 'Rules the build has to pass.',
    copy: 'Other kits hand your agent a list of rules and hope. Here a broken rule fails the build, before it becomes your problem. Hover a card to watch it work.',
    items: [
      {
        id: 'boundaries',
        art: 'api-gateway',
        title: 'One place for each thing.',
        copy: 'Shared code lives in packages and is written once. An import that crosses a boundary stops the build.',
      },
      {
        id: 'isolation',
        art: 'firewall',
        title: 'Customers can’t see each other.',
        copy: 'A test suite tries to read one account’s data from another, on the data layer you picked.',
      },
      {
        id: 'replay',
        art: 'billing',
        title: 'Billing survives a replay.',
        copy: 'Every payment event is signed, checked and safe to receive twice. A test sends each one twice to prove it.',
      },
      {
        id: 'secrets',
        art: 'encryption',
        title: 'Secrets stay on the server.',
        copy: 'The app refuses to start on a missing setting, and a check blocks any secret from reaching the browser.',
      },
      {
        id: 'journey',
        art: 'ci-pipeline',
        title: 'The whole journey, tested.',
        copy: 'A browser test signs up, creates a team, invites someone, pays, records usage and cancels.',
      },
      {
        id: 'memory',
        art: 'version-control',
        title: 'Your agent remembers.',
        copy: 'Rules in every package, skills for the common jobs, and a decisions file written at each release, so a new session starts from what you decided.',
      },
    ],
  },
  waves: {
    index: '04',
    eyebrow: 'FOUR WAVES',
    meta: 'founding members get each one',
    title: 'Built in the open, one wave at a time.',
    copy: 'You get the repository at wave 1 and every wave after it. The price goes up as each wave lands.',
    pin: 'Today',
    columns: [
      {
        label: 'Wave 1',
        caption: 'The working kit.',
        fill: 1,
        items: [
          {
            title: 'Core and interface',
            status: 'In the repository',
            state: 'shipped',
          },
          {
            title: 'Supabase and Drizzle',
            status: 'In the repository',
            state: 'shipped',
          },
          {
            title: 'Creem and Stripe',
            status: 'In the repository',
            state: 'shipped',
          },
          {
            title: 'AI, guards, dev tool, tests',
            status: 'In the repository',
            state: 'shipped',
          },
        ],
        icons: [
          { label: 'Supabase', icon: 'supabase' },
          { label: 'Drizzle', icon: 'drizzle' },
          { label: 'Stripe', icon: 'stripe' },
        ],
      },
      {
        label: 'Wave 2',
        caption: 'More ways to pay.',
        fill: 0,
        today: true,
        items: [
          { title: 'Prisma', status: 'Up next', state: 'active' },
          {
            title: 'Polar and Dodo Payments',
            status: 'Up next',
            state: 'active',
          },
          {
            title: 'Usage-based billing',
            status: 'Up next',
            state: 'active',
          },
        ],
        icons: [
          { label: 'Prisma', icon: 'prisma' },
          { label: 'Polar', icon: 'polar' },
          { label: 'Dodo Payments', icon: 'dodo' },
        ],
      },
      {
        label: 'Wave 3',
        caption: 'More backends.',
        fill: 0,
        items: [
          { title: 'Appwrite', status: 'Planned', state: 'planned' },
          { title: 'Manifest', status: 'Planned', state: 'planned' },
          { title: 'Whop', status: 'Planned', state: 'planned' },
        ],
        icons: [
          { label: 'Appwrite', icon: 'appwrite' },
          { label: 'Whop', icon: 'whop' },
        ],
      },
      {
        label: 'Wave 4',
        caption: 'Version 1.0.',
        fill: 0,
        items: [
          {
            title: 'The starter library',
            status: 'Planned',
            state: 'planned',
          },
          {
            title: 'The documentation site',
            status: 'Planned',
            state: 'planned',
          },
          {
            title: 'The free Lite edition',
            status: 'Planned',
            state: 'planned',
          },
        ],
      },
    ],
  },
  founding: {
    index: '05',
    eyebrow: 'FOUNDING MEMBERS',
    meta: '50 seats · one payment',
    title: 'Pay once. Get every wave.',
    copy: 'Founding members pay half. If the kit isn’t for you, ask for a refund any time before v1.0.',
    seats: 50,
    fallback: { pro: 149, team: 299 },
    regular: { pro: 299, team: 599 },
    toggle: {
      off: 'After launch',
      on: 'Founding',
      badge: 'Half price',
      label: 'Show the founding price',
    },
    unit: 'one time',
    corner: 'One payment, in USD',
    note: 'Pro and Team include 12 months of updates after v1.0. Lite is free and ships with v1.0.',
    plans: [
      {
        id: 'lite',
        name: 'Lite',
        description: 'Free. One app, personal accounts, the same guards.',
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'For one developer and their agent.',
        featured: true,
        badge: 'Recommended',
      },
      {
        id: 'team',
        name: 'Team',
        description: 'The same kit, licensed for five developers.',
      },
    ],
    groups: [
      {
        title: 'The kit',
        rows: [
          { label: 'Developers', values: ['1', '1', '5'] },
          {
            label: 'Accounts',
            values: ['Personal', 'Personal and team', 'Personal and team'],
          },
          {
            label: 'Data layers',
            values: ['Supabase', 'All five', 'All five'],
          },
          {
            label: 'Payments',
            values: [false, 'All five providers', 'All five providers'],
          },
          { label: 'Usage billing and AI', values: [false, true, true] },
          { label: 'Guards and agent rules', values: [true, true, true] },
          { label: 'The starter library', values: [false, true, true] },
        ],
      },
      {
        title: 'Founding terms',
        rows: [
          {
            label: 'Repository access',
            values: ['At v1.0', 'From wave 1', 'From wave 1'],
          },
          { label: 'Every wave through v1.0', values: [false, true, true] },
          {
            label: '30-minute launch review call',
            values: [false, true, true],
          },
          {
            label: 'Refund on request until v1.0',
            values: [false, true, true],
          },
          {
            label: 'Add developers when you hire',
            values: [false, false, true],
          },
        ],
      },
    ],
    building: {
      label: 'What are you building?',
      hint: 'Optional. Your answers decide which starter I build next.',
    },
    cta: {
      pro: 'Get founding Pro',
      team: 'Get founding Team',
      lite: 'Notify me at v1.0',
      waitlist: 'Join the waitlist',
    },
  },
  faqs: {
    eyebrow: '// 06 · QUESTIONS',
    title: 'Straight answers.',
    copy: 'Read these before you buy.',
    items: [
      {
        question: 'What do I get the day I pay?',
        answer:
          'An invite to the private repository with everything built so far, then each wave as it lands.',
      },
      {
        question: 'What if it isn’t for me?',
        answer:
          'Ask for a refund any time before v1.0 ships. You get it back, no form to fill in.',
      },
      {
        question: 'Do I need to know how to code?',
        answer:
          'You need to be comfortable running a project in Cursor or Claude Code. If you build in Lovable or Bolt, this kit is not for you yet.',
      },
      {
        question: 'Can I change my stack later?',
        answer:
          'You can add a provider to an existing project. Swapping one data layer for another in a live project is not something I promise.',
      },
      {
        question: 'What happens when my product has real users?',
        answer:
          'Founding members get a 30-minute launch review with me. If it grows past what one person and an agent can hold, ',
        link: {
          label: 'a fractional CTO engagement',
          href: '/services',
          after: ' picks up from there.',
        },
      },
    ],
  },
  band: {
    eyebrow: '// START HERE',
    title: 'Start the build you won’t have to rescue.',
    copy: '50 founding seats. Half price.',
    cta: 'become a founding member →',
    ctaClosed: 'join the waitlist →',
    note: 'refund on request until v1.0',
  },
  waitlist: {
    kicker: 'Join the waitlist',
    title: 'Be first when the presale opens.',
    lead: 'Your pick is saved with your email. Change it in the picker above.',
    cta: 'Notify me',
    note: 'One email when the presale opens. Nothing else.',
  },
}

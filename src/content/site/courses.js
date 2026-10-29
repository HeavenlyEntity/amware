/* Static content for the Secure the Stack landing on /courses, copied from
   the approved Courses design (docs/design/2026-10-27-portfolio-upgrade,
   courses.design.html), whose source is Amware/secure-the-stack/COURSE-OUTLINE.md
   and the two offers in the B2C plan. Published CMS courses still list under
   "All courses" on the page. */

/* The nine modules. Module 1 is built; the rest are outlined. */
export const MODULES = [
  {
    short: 'Security foundations',
    title: 'Security Foundations for Full-Stack Developers',
    goal: 'Install the mental model: how attackers think, what goes wrong in this stack, how to threat-model it, and how to set up a testing lab.',
    weeks: [
      'The AppSec mindset and how attackers think',
      'The OWASP Top 10, mapped to your stack',
      'Threat modeling a full-stack app',
      'Building your vulnerability testing lab',
    ],
    project:
      'OrbitDesk, a vulnerable Next.js app with 12 planted findings. Recon it, threat-model it and rate what you find.',
    built: true,
  },
  {
    short: 'Auth and sessions',
    title: 'Authentication & Session Security',
    goal: 'Understand, break and fix how users prove who they are and stay signed in.',
    weeks: [
      'How Supabase Auth actually works',
      'Sessions, cookies and tokens in Next.js',
      'Middleware as an auth gate, and CVE-2025-29927',
      'Account lifecycle attacks',
    ],
    project:
      'An app whose auth looks fine but can be bypassed several ways, including a spoofed-header middleware bypass.',
    built: false,
  },
  {
    short: 'Row-level security',
    title: 'Authorization & Row-Level Security',
    goal: 'Master broken access control, the top source of data breaches in this stack.',
    weeks: [
      'AuthN vs AuthZ, and Postgres RLS from first principles',
      'Supabase RLS in depth, and CVE-2025-48757',
      'The subtle RLS traps',
      'The service_role key and privilege escalation',
    ],
    project:
      "A multi-tenant SaaS where tenants can read each other's data through several distinct RLS mistakes.",
    built: false,
  },
  {
    short: 'Injection',
    title: 'Injection & the Data Layer',
    goal: 'Understand injection deeply, and the exact places ORMs stop protecting you.',
    weeks: [
      'SQL injection from the ground up',
      "Prisma's safe and unsafe edges",
      "Drizzle's raw escape hatches",
      'Postgres hardening and other injection',
    ],
    project:
      'A reporting feature whose dynamic query builder is injectable through both Prisma and Drizzle.',
    built: false,
  },
  {
    short: 'Server actions',
    title: 'API, Route Handlers & Server Actions',
    goal: 'Secure the server boundary, where most logic flaws live.',
    weeks: [
      'The server and client trust boundary in Next.js',
      'IDOR and broken object-level authorization',
      'Mass assignment and over-posting',
      'SSRF, open redirects and request forgery',
    ],
    project:
      'A REST and server-actions app with an IDOR, a mass-assignment privilege bump and an SSRF.',
    built: false,
  },
  {
    short: 'Frontend',
    title: 'Client-Side & Frontend Security',
    goal: 'Secure everything that reaches the browser.',
    weeks: [
      'XSS in a React world',
      'Content Security Policy and security headers',
      'Secrets in the bundle',
      'Dependencies and supply chain',
    ],
    project:
      'A content app with stored XSS in rendered markdown, a key leaked into the bundle and no CSP.',
    built: false,
  },
  {
    short: 'Secrets and infra',
    title: 'Secrets, Config & Infrastructure',
    goal: 'Secure the things around the code, where real breaches often start.',
    weeks: [
      'Secrets management done right',
      'Supabase Storage and bucket security',
      'Deployment and platform config',
      'Logging, monitoring and incident basics',
    ],
    project:
      'An app with a public bucket leaking private files, a committed secret and a permissive CORS config.',
    built: false,
  },
  {
    short: 'Testing in CI',
    title: 'Testing, Tooling & Automation',
    goal: 'Make security continuous instead of a one-time audit.',
    weeks: [
      'SAST and dependency scanning',
      'DAST and dynamic testing',
      'Writing security tests',
      'Security in CI/CD',
    ],
    project:
      'Take an earlier vulnerable app and build the CI pipeline that would have caught each bug.',
    built: false,
  },
  {
    short: 'Capstone audit',
    title: 'Capstone: Full-Application Audit & Client Report',
    goal: 'Put it all together and produce the professional deliverable.',
    weeks: [
      'Scoping and methodology',
      'The assessment',
      'Rating and prioritization',
      'Writing the report',
    ],
    project:
      'A complete, client-ready security assessment of an unseen capstone app.',
    built: false,
  },
]

/* Same nine modules at every pace. */
export const PACES = {
  intensive: {
    label: 'Intensive',
    total: '4 to 5 months',
    perModule: 'about 2 weeks',
  },
  standard: {
    label: 'Standard',
    total: '8 to 9 months',
    perModule: 'about 4 weeks',
  },
  relaxed: {
    label: 'Relaxed',
    total: '10 to 12 months',
    perModule: '5 to 6 weeks',
  },
}

/* Both prices are labelled as planned or pilot; keep those labels. */
export const TRACKS = {
  dev: {
    kicker: 'For working developers',
    name: 'Security-First Engineer',
    items: [
      'The full nine-module curriculum',
      'The community of other builders',
      'Coaching with Alec',
    ],
    price: '$5,000',
    priceSub: 'Planned price',
    cta: 'Join the waitlist',
  },
  change: {
    kicker: 'For career changers',
    name: 'Secure Builder Accelerator',
    items: [
      'The curriculum, paced for people new to code',
      'The community of other builders',
      'Coaching with Alec through your first role',
    ],
    price: '$3,000',
    priceSub: 'Pilot cohort',
    cta: 'Apply for the pilot',
  },
}

/* Track finder. Every `why` restates the visitor's own answer or something
   the page already says about a track (prerequisites, "paced for people new
   to code", coaching through the first role), so it makes no new claims.
   `s` scores the two tracks over the first three answers; the fourth
   answer only sets the pace. */
export const QUIZ = [
  {
    q: 'Where are you with code today?',
    hint: 'Pick the closest match.',
    opts: [
      {
        t: 'I ship code at work',
        d: 'Developer, engineer or technical founder',
        icon: 'programmer',
        s: {
          dev: 3,
        },
        why: 'You already ship code for a living.',
      },
      {
        t: 'I build on the side',
        d: 'Freelance work, side projects or a bootcamp',
        icon: 'code',
        s: {
          dev: 2,
          change: 1,
        },
        why: 'You build real projects on your own time.',
      },
      {
        t: "I'm learning to code",
        d: 'Tutorials, courses and first small apps',
        icon: 'checklist',
        s: {
          change: 2,
        },
        why: "You're still learning to code.",
      },
      {
        t: "I'm switching into tech",
        d: 'Coming over from another career',
        icon: 'rocket',
        s: {
          change: 3,
        },
        why: "You're moving into tech from another field.",
      },
    ],
  },
  {
    q: 'Could you build a full-stack app today?',
    hint: 'The engineer track assumes JS or TS, React and SQL basics.',
    opts: [
      {
        t: 'Yes, without much help',
        d: 'Front end, API and database',
        icon: 'system',
        s: {
          dev: 3,
        },
        why: 'You meet the prerequisites: JS or TS, React and SQL.',
      },
      {
        t: 'Yes, with the docs open',
        d: 'I get there, with some searching',
        icon: 'search',
        s: {
          dev: 2,
        },
        why: 'You can build a full-stack app with the docs open, which is enough to start.',
      },
      {
        t: 'Parts of one',
        d: 'A front end or an API, not both yet',
        icon: 'blocks',
        s: {
          change: 2,
        },
        why: 'You can build parts of an app; the Accelerator paces the curriculum for that.',
      },
      {
        t: 'Not yet',
        d: "That's what I'm working toward",
        icon: 'tasks',
        s: {
          change: 3,
        },
        why: 'The Accelerator is paced for people new to code.',
      },
    ],
  },
  {
    q: 'What do you want out of the course?',
    opts: [
      {
        t: 'Ship code that holds up',
        d: 'Find and fix the holes before attackers do',
        icon: 'gauge',
        s: {
          dev: 2,
        },
        why: 'You want to harden the code you already write.',
      },
      {
        t: 'Run security assessments',
        d: 'Scope, rate and write the client report',
        icon: 'workflow',
        s: {
          dev: 2,
        },
        why: 'You want to run assessments and write the report yourself.',
      },
      {
        t: 'Land my first tech role',
        d: 'With security as my edge',
        icon: 'network',
        s: {
          change: 3,
        },
        why: 'You want coaching through your first role, which comes with the Accelerator.',
      },
      {
        t: 'Build safely from day one',
        d: 'Security habits before bad habits',
        icon: 'customize',
        s: {
          change: 2,
        },
        why: 'You want security habits from your first app on.',
      },
    ],
  },
  {
    q: 'How fast do you want to finish?',
    hint: 'Same nine modules at every pace. Go at the pace where the quizzes stay easy.',
    opts: [
      {
        t: 'Intensive',
        d: '4 to 5 months · about 2 weeks per module',
        icon: 'rocket',
        pace: 'intensive',
      },
      {
        t: 'Standard',
        d: '8 to 9 months · about 4 weeks per module',
        icon: 'gauge',
        pace: 'standard',
      },
      {
        t: 'Relaxed',
        d: '10 to 12 months · 5 to 6 weeks per module',
        icon: 'responsive',
        pace: 'relaxed',
      },
    ],
  },
]

export const COURSE = {
  name: 'Secure the Stack',
  summary:
    'Vulnerability testing for apps on Supabase, Next.js, Drizzle, Prisma and Postgres. For developers who can build a full-stack app but were never taught to break one.',
  stack: ['Supabase', 'Next.js', 'Drizzle', 'Prisma', 'Postgres'],
  stats: [
    { v: '9', l: 'modules, from foundations to a client-ready audit' },
    { v: '~34', l: 'weekly lessons, each ending in a quiz' },
    { v: '9', l: 'staged vulnerable apps to work through' },
  ],
}

/* The loop every module runs. */
export const LOOP = [
  {
    t: 'Find',
    d: 'Recon a staged app the way an attacker would.',
    icon: 'search',
  },
  {
    t: 'Rate',
    d: 'Score each finding by likelihood and impact.',
    icon: 'gauge',
  },
  {
    t: 'Fix',
    d: 'Patch it, then write the test that keeps it fixed.',
    icon: 'code',
  },
]

export const OUTCOMES = [
  {
    t: 'Think like an attacker',
    d: 'Threat-model a modern JS/TS full-stack app systematically, starting from where the trust boundaries sit.',
    icon: 'search',
  },
  {
    t: 'Find, rate and fix',
    d: 'Exploit and remediate the vulnerability classes that actually hit Supabase, Next.js, Drizzle, Prisma and Postgres apps.',
    icon: 'gauge',
  },
  {
    t: 'Catch regressions in CI',
    d: 'Wire security testing into your workflow so a fixed bug stays fixed.',
    icon: 'workflow',
  },
  {
    t: 'Write the client report',
    d: 'Produce a professional security assessment, the deliverable a fractional CTO hands a founder.',
    icon: 'checklist',
  },
]

export const PREREQUISITES = {
  need: ['Comfort building full-stack apps: JS or TS, React and SQL basics.'],
  wontNeed: [
    'Any security background. Module 1 starts from how attackers think.',
  ],
}

export const ASSESSMENT = [
  { t: 'Weekly quiz', d: 'Active recall while the lesson is fresh.' },
  { t: 'Module quiz', d: 'Mixes earlier weeks back in, so it sticks.' },
  {
    t: 'Hands-on project',
    d: "New code, same ideas. That's where skill comes from.",
  },
]

export const CALLBACK_NOTE =
  'Later modules re-exploit earlier bugs on purpose. CVE-2025-29927 shows up in Module 2 and again in Module 7.'

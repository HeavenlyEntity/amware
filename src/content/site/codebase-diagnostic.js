/* The /services/codebase-diagnostic page's own words, in one place so the
   tests can hold the page to them (design: boards/Diagnostic.dc.html).
   No price, no length and no credit toward the Sprint: none of those is
   decided, so none is said. */

export const DIAGNOSTIC = {
  meta: {
    title: 'Codebase Diagnostic',
    description:
      'A senior engineer reads your app and tells you, in plain English, what is costing you users, what is unsafe, and what to fix first. It starts with a free 15-minute call.',
  },
  hero: {
    eyebrow: '// SERVICES · CODEBASE DIAGNOSTIC',
    chips: ['for ai-built and vendor-built apps'],
    title: 'Find out what is actually wrong.',
    lede: 'You can’t read the code, so you can’t tell a small bug from a real danger. I read all of it and give you a plain-English report: what is costing you users, what is unsafe, and what to fix first.',
    cta: 'book a free intro call →',
    secondary: { label: 'see what you get ↓', href: '#report' },
    note: 'no code access needed for the call',
  },
  sample: {
    title: 'your-app · diagnostic report',
    tag: 'sample',
    findings: [
      {
        level: 'P0',
        title: 'One customer can read another’s orders.',
        note: 'Fix first. Half a day.',
      },
      {
        level: 'P1',
        title: 'Some subscribers were never charged.',
        note: 'The payment event is ignored when it arrives late.',
      },
      {
        level: 'P2',
        title: 'Nobody has tested a restore.',
        note: 'A backup exists. Whether it works is unknown.',
      },
    ],
    caption: 'An example of how findings read. Not from a real client.',
  },
  // TODO(alec): the Diagnostic's length. The board said "one week"; not confirmed.
  start: {
    index: '01',
    eyebrow: 'HOW IT STARTS',
    meta: 'nothing starts until the scope is agreed',
    title: 'Two free calls before you pay a thing.',
    copy: 'You leave the calls knowing your biggest technical risk, whether or not you go further.',
    steps: [
      {
        day: 'Step 1',
        effort: '15 min · free',
        title: 'Intro call.',
        body: 'A quick hello. You tell me what the app does and what keeps breaking.',
        artifact: {
          kind: 'rows',
          title: 'Intro call',
          meta: '15 min · free',
          rows: [
            {
              mark: '01',
              name: 'What the app does',
              role: 'You tell me',
              done: 'Covered',
            },
            {
              mark: '02',
              name: 'What keeps breaking',
              role: 'You tell me',
              done: 'Covered',
            },
            {
              mark: '03',
              name: 'A longer call, or not',
              role: 'We decide together',
              tag: 'Next',
            },
          ],
        },
      },
      {
        day: 'Step 2',
        effort: '45 min · free',
        title: 'Strategy call.',
        body: 'We go through the problems and your goals, and decide whether a Diagnostic is the right next step.',
        artifact: {
          kind: 'outline',
          title: 'Strategy call',
          sub: '45 minutes, free',
          sections: [
            { label: 'Your problems', state: 'done' },
            { label: 'Your goals', state: 'done' },
            { label: 'Biggest risk', state: 'doing' },
            { label: 'Next step', state: 'todo' },
          ],
          foot: 'You leave knowing your biggest technical risk.',
        },
      },
      {
        day: 'Step 3',
        effort: 'After both calls',
        title: 'The Diagnostic.',
        body: 'You give me read-only access. I read the code, the database rules and the accounts it runs on.',
        artifact: {
          kind: 'meter',
          title: 'The Diagnostic',
          sub: 'Read-only access',
          badge: 'In progress',
          meterLabel: 'Places read',
          meterValue: '5 of 8',
          pct: 62.5,
          figures: [
            { label: 'Access', value: 'Read-only' },
            { label: 'Places', value: '8' },
          ],
        },
      },
      {
        day: 'Step 4',
        effort: '60 min',
        title: 'Report and walkthrough.',
        body: 'You get the written report, then we go through it together. Bring your developer if you have one.',
        artifact: {
          kind: 'progress',
          title: 'Written report',
          done: 'Delivered',
          figures: [
            { label: 'Format', value: 'Written' },
            { label: 'Walkthrough', value: '60 min' },
            { label: 'Yours', value: 'To keep' },
          ],
        },
      },
    ],
  },
  review: {
    index: '02',
    eyebrow: 'WHAT I READ',
    meta: 'eight places an app breaks',
    title: 'The parts your users feel, and the parts they don’t yet.',
    copy: 'Most apps built fast break in the same few places. I check every one.',
    items: [
      {
        kicker: 'Access',
        title: 'Sign-in and sessions.',
        copy: 'Can someone get in who shouldn’t?',
        icon: 'LogIn',
      },
      {
        kicker: 'Data',
        title: 'Who can see whose data.',
        copy: 'Tested as real users, not by reading settings.',
        icon: 'Database',
      },
      {
        kicker: 'Money',
        title: 'Payments.',
        copy: 'Is everyone who should be charged actually charged?',
        icon: 'CreditCard',
      },
      {
        kicker: 'Secrets',
        title: 'Keys and passwords.',
        copy: 'Anything exposed in the code or the browser.',
        icon: 'KeyRound',
      },
      {
        kicker: 'Releases',
        title: 'Shipping a change.',
        copy: 'Why every release breaks something, and how to undo one.',
        icon: 'Rocket',
      },
      {
        kicker: 'Recovery',
        title: 'Backups.',
        copy: 'Whether you could get your data back tomorrow.',
        icon: 'DatabaseBackup',
      },
      {
        kicker: 'Shape',
        title: 'The code itself.',
        copy: 'Can another developer pick it up, or only the tool that wrote it?',
        icon: 'Braces',
      },
      {
        kicker: 'Ownership',
        title: 'Who holds the keys.',
        copy: 'The code, the hosting and the domain: yours, or your vendor’s?',
        icon: 'UserCog',
      },
    ],
  },
  report: {
    index: '03',
    eyebrow: 'WHAT YOU GET',
    meta: 'yours to keep',
    title: 'A report you can read.',
    copy: 'It is written for you, not for an engineer. You can act on it with me, with your own developer, or with someone else.',
    items: [
      'A one-page summary in plain English',
      'Every finding ranked by what it costs you',
      'A fix-first list, in order',
      'A 60-minute walkthrough call',
      'A fixed price for the fix, if you want one',
    ],
    specs: [
      { term: 'access', value: 'read-only' },
      { term: 'deposit', value: 'refunded if I can’t help' },
      { term: 'report', value: 'yours to keep' },
    ],
  },
  promise: {
    index: '04',
    eyebrow: 'THE PROMISE',
    meta: 'read this before you book',
    title: 'If I can’t help, the deposit comes back.',
    copy: 'The Diagnostic starts with a deposit. If I read the app and can’t help, you get all of it back. Scope is agreed before any work starts, so there are no surprise invoices.',
    forYou: [
      'You have a live or nearly live app, built with AI tools or by a vendor.',
      'It is costing you users, sleep or money, and you need it steady.',
      'You want one senior person who explains things in plain English.',
    ],
    notForYou: [
      'You want the cheapest hourly coder you can find.',
      'You want someone to take orders without ever pushing back.',
      'You are happy to keep patching it yourself.',
    ],
  },
  // TODO(alec): whether the deposit counts toward the Sprint. Not confirmed, so not said.
  next: {
    index: '05',
    eyebrow: 'WHAT COMES NEXT',
    meta: 'you choose',
    title: 'The report ends with a plan, not a pitch.',
    copy: 'What you do with it is your call. If you want me to fix it, the next step has a fixed price.',
    cards: [
      {
        kicker: 'Fixed price',
        title: 'Stabilization Sprint.',
        copy: 'I fix what the report found, starting with what costs you users. The price is agreed before work starts.',
      },
      {
        kicker: 'Monthly',
        title: 'Keep it steady.',
        copy: 'A care plan or a fractional CTO retainer, so someone senior owns the app after it is fixed.',
      },
      {
        kicker: 'Or',
        title: 'Take it elsewhere.',
        copy: 'The report is yours. Hand it to your own developer or another shop and they will know where to start.',
      },
    ],
    link: { label: 'compare engagements →', href: '/services' },
  },
  band: {
    eyebrow: '// START HERE',
    title: 'Not sure how bad it is?',
    copy: 'Every week it stays broken, more users leave. Bring the app to a free call and find out where you stand.',
    cta: 'book a free intro call →',
  },
  booking: {
    serviceName: 'Intro call',
    notes:
      'Asking about: Codebase Diagnostic (from /services/codebase-diagnostic)',
    namespaceSuffix: 'diagnostic',
  },
  reserve: {
    kicker: 'codebase diagnostic',
    title: 'Reserve your Diagnostic.',
    lede: 'We have agreed the scope on our calls. The deposit holds your place. If I read the app and can’t help, it comes back in full.',
    cta: 'Reserve your Diagnostic',
    fallbackTitle: 'Ask me for your link.',
    fallbackCopy:
      'This page takes the deposit once we have spoken and agreed the scope. If you were sent here and it isn’t working, tell me and I will sort it out by hand.',
    fallbackCta: 'Get in touch',
  },
}

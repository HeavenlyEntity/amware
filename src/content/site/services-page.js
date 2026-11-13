/* The /services page's own words, in one place so the tests can hold the
   page to them (design: the services board, Main.dc.html and
   HeroMobile.dc.html). Tier names and the booking link are not here: they
   come from the Payload `services` rows. No service quotes a price: a
   retainer is scoped on the strategy call, a build gets a free quote from
   the contact form, and a deposit shows in the checkout before it is
   charged (owner decision 2026-11-12).

   Who it speaks to: founders who vibe-coded an app and lost control of it,
   and founders whose vendor stopped answering while the app breaks, users
   leave and security gaps open up.

   No figures, client counts or outcomes: the board has none, and nothing
   here may claim one. */

export const SERVICES_PAGE = {
  /* TODO(alec): confirm the hero and band promises ("find what is costing
     you users, and fix it in that order", "find the riskiest problem
     first") and the tools the lede names. */
  hero: {
    /* "SERVICES", not the board's "ENGAGEMENTS": the section below is
       already // SEC.01 / ENGAGEMENTS, and two eyebrows saying the same
       thing read as a typo (owner decision F13). */
    eyebrow: { index: '00', label: 'Services' },
    /* The dream-buyer call-out in the eyebrow row (conversion pass,
       2026-11-12): who this is for, before what it is. */
    location: 'For founders with an AI-built or vendor-built app',
    title: 'Stop losing users to an app you can’t fix.',
    lede: 'Lovable, Cursor or Bolt got you live, then every prompt started breaking something else. Or your developer went quiet while the bugs, churn and security holes piled up. I step in as your CTO, find what is costing you users, and fix it in that order.',
    /* Both calls are free since 2026-11-13: the button opens the 15-minute
       intro call, or the contact form when no Cal.com link loaded. */
    cta: 'book a free intro call',
    compare: 'compare engagements',
    callNote: 'Intro call · 15 min · free',
  },
  /* "Sound familiar?": the dream buyer's own problems, in their words, so
     they recognise themselves before they see a tier. */
  pain: {
    eyebrow: 'Sound familiar?',
    kicker: 'Two of these true? Book the call',
    title: 'The app got you this far. Now it’s holding you back.',
    items: [
      'Every fix the AI makes breaks two other things.',
      'You can’t read the code your tools wrote, so you can’t tell what’s wrong.',
      'Your developer or agency stopped answering, and the app is still yours to run.',
      'Users hit bugs, don’t complain, and quietly cancel.',
      'You don’t know whether your customers’ data is actually safe.',
      'You’re scared to ship anything in case it takes the app down.',
    ],
  },
  engagements: {
    index: '01',
    eyebrow: 'Engagements',
    title: 'Pick how much you want off your plate.',
    copy: 'Get a CTO’s read and a fix-first plan, or hand the whole mess over and get back an app that is steady, secure and shipping again.',
  },
  /* The risk reversal (owner decision 2026-11-13): both calls are free,
     the only deposit is the Codebase Diagnostic's and it is fully refunded
     if Alec can't help, and scope comes before work.
     TODO(alec): a stronger guarantee on the work itself (e.g. the first
     month) would go here once you decide one. */
  promise: {
    eyebrow: 'The promise',
    kicker: 'Nothing starts until the scope is agreed',
    title: 'Two free calls before you pay a thing.',
    copy: 'Start with a free 15-minute intro call, then a free 45-minute strategy call. You leave knowing your highest-priority technical risk and the next move to make. If the Codebase Diagnostic is the right next step, its deposit is fully refunded if I can’t help. Scope is agreed before any work starts, so there are no surprise invoices.',
  },
  /* Qualify as hard as we sell: the right founders lean in, the wrong ones
     leave before the call.
     TODO(alec): real capacity for the kicker ("I take on N retainers at a
     time") is the honest scarcity line; nothing claims it until then. */
  fit: {
    eyebrow: 'Is this you?',
    kicker: 'Read this before you book',
    title: 'Who this is for, and who it isn’t.',
    forLabel: 'For you if',
    notForLabel: 'Not for you if',
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
  /* The objections a founder brings to the booking button. Also published
     as FAQPage structured data, so every answer must stay visible here.
     TODO(alec): confirm "not by default" on the rewrite, and add the NDA
     and code-access answer ("Is my code safe with you?") once the terms
     are set. */
  faq: {
    eyebrow: 'Questions founders ask',
    title: 'Before you book.',
    items: [
      {
        question: 'I’m not technical. Will I follow any of this?',
        answer:
          'Yes. You get plain English and a list of what to fix first, not a lecture on frameworks.',
      },
      {
        question: 'Do I have to rewrite the whole app?',
        answer:
          'Not by default. We fix what costs you the most first. A rewrite only comes up if the code can’t be saved, and the decision is yours.',
      },
      {
        question: 'Will you work with my current developer or agency?',
        answer:
          'Yes. Holding your vendor or developers to a standard is part of the Fractional CTO retainer.',
      },
      {
        question: 'Why aren’t prices listed?',
        answer:
          'Every app is a different mess, so a listed price would be a guess. You get a scoped price on the call, before you commit to anything.',
      },
      {
        question: 'What if the call isn’t worth it?',
        answer:
          'Both calls are free. You pay nothing until you choose the Codebase Diagnostic, and its deposit is fully refunded if I can’t help.',
      },
    ],
  },
  band: {
    eyebrow: { index: '02', label: 'Start here' },
    title: 'Not sure how bad it is?',
    // TODO(alec): confirm the promise "We scope the right engagement
    // together before anything starts" is how every engagement begins.
    copy: 'Every week it stays broken, more users leave. Bring the app to a strategy call. We find the riskiest problem first and scope the fix together before anything starts.',
    glass: 'Scope\nfirst.',
    hint: 'Move to look closer · click to reshape',
  },
  /* What the intro-call popup records against a booking made from the
     hero or the band, where no tier has been chosen yet. */
  booking: {
    serviceName: 'Intro call',
    notes: 'Engagement: not sure yet (from /services)',
    namespaceSuffix: 'services',
  },
}

/** "3 retainers · scoped on a call", or nothing when there are none. */
export function retainerMeta(count) {
  if (!count) return null
  return `${count} ${count === 1 ? 'retainer' : 'retainers'} · scoped on a call`
}

/** The FAQ as shown, and as published in the FAQPage structured data. */
export function faqItems() {
  return SERVICES_PAGE.faq.items
}

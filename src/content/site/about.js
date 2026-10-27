import deskSelfie from '../../images/photos/desk-selfie.webp'

/* The About book. Each chapter's copy fills its right-hand page; `facts`
   are the two ruled rows on the left-hand page opposite it. Chapter 06 has
   no copy: it is the one still being written. */
export const chapters = [
  {
    number: '01',
    title: 'First program at eight',
    facts: [
      { label: 'Age', value: '8' },
      { label: 'Machine', value: 'eMachine, self-taught typing' },
    ],
    copy: 'I have loved making things and being creative for as long as I can remember. I wrote my first program at eight, two weeks after my mom brought home the brand new eMachine I taught myself to type on.',
  },
  {
    number: '02',
    title: 'Cars, art, and taking things apart',
    facts: [
      { label: 'Age', value: '13' },
      { label: 'First build', value: 'ASUS · 4 GB DDR2' },
    ],
    copy: 'The only thing I loved more than computers as a kid was cars, art, and taking things apart. At thirteen I started building PCs, chasing the biggest, baddest gaming rig. My first build was an ASUS with 4 GB of DDR2. A caveman these days.',
  },
  {
    number: '03',
    title: 'From factory floors to Schwab',
    facts: [
      { label: 'Started', value: 'Automation programmer, Honeywell' },
      { label: 'Then', value: 'Junior developer → Charles Schwab' },
    ],
    copy: 'That curiosity became a career. I started as an automation programmer at Honeywell Aerospace headquarters, where 10 to 30 laptops reached IT every day and each one had to be imaged and set up the same day. On a 36-laptop day, the old process finished 12. I built a tool that automated the imaging and setup, and the team finished 26: more than twice the output. From there I moved into web engineering as a junior developer, then joined Charles Schwab and shipped production code for one of the largest brokerages in the world. Every role deepened the same instinct: figure out how the machine works, then make it work better.',
  },
  {
    number: '04',
    title: 'Designing the systems, not just the features',
    facts: [
      { label: 'Role', value: 'Senior Lead' },
      { label: 'At', value: 'NewGen Business Solutions' },
    ],
    copy: 'At NewGen Business Solutions I stepped into a Senior Lead role and the work shifted from writing features to designing the systems they lived in. I owned architecture, set technical direction, and mentored engineers through complex builds. The hardest problems were never in the code. They were in the gap between what the business needed and what the technology could deliver.',
  },
  {
    number: '05',
    title: 'Bridging the boardroom and the codebase',
    facts: [
      { label: 'MBA', value: 'February 2026' },
      { label: 'Now', value: 'MiPi · Kingdom Kode · on-demand CTO' },
    ],
    copy: 'That realization led to an MBA, completed in February 2026: pitching real investors, stress-testing business models, learning the language of growth alongside the language of code. Today I am the founder of MiPi, co-founder of Kingdom Kode, and an on-demand CTO for teams who need someone who can whiteboard architecture in the morning and present unit economics in the afternoon.',
  },
  {
    number: '06',
    title: 'Being written.',
    inProgress: true,
    image: deskSelfie,
    caption: 'where it is being written · phoenix.az',
  },
]

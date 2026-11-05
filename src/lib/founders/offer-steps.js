/* The job offer wizard's step registry.
 *
 * Three questions, not two. The plan started at two, then the engineering
 * review added the classification gates and the responsibility chips so a cold
 * start could produce a real read. Each addition was locally right and nobody
 * re-totalled: step one ended up holding eight controls and roughly thirty tap
 * targets, which on a phone is about 1,400px of scrolling before the Next
 * button. The design review split it (DD9).
 *
 * The grouping is not arbitrary. Step one is the classification cluster, the
 * answers that decide whether this person is being paid a founder's rate or a
 * market one, which is a 30-40% swing. Step two is everything about the
 * company. Step three is what they were actually offered.
 */

export const OFFER_STEPS = [
  {
    id: 'seat',
    index: 1,
    eyebrow: 'Your seat',
    title: 'What are you being hired to be?',
    lead: 'These answers decide whether the market pays you a founder’s rate or a hire’s. It is the widest gap in the whole read.',
    next: 'Next: the company',
    fields: [
      'role',
      'joining',
      'fullTimeOnSigning',
      'finalTechnicalSay',
      'responsibilities',
    ],
    pending: 'Your seat and what you own',
    railIcon: 'programmer',
  },
  {
    id: 'company',
    index: 2,
    eyebrow: 'The company',
    title: 'Where is this company?',
    lead: 'Stage moves the numbers most. Industry and location are smaller corrections, and both default to no adjustment at all.',
    next: 'Next: the offer',
    fields: ['stage', 'industry', 'geo'],
    pending: 'Stage, industry and location',
    railIcon: 'network',
  },
  {
    id: 'offer',
    index: 3,
    eyebrow: 'The offer',
    title: 'What did they offer?',
    lead: 'Leave anything blank you have not been told yet. The ask still works; it just cannot compare.',
    next: 'See my ask',
    fields: [
      'offerMode',
      'offeredEquityPct',
      'optionCount',
      'fullyDilutedShares',
      'strikePrice',
      'offeredSalary',
      'vestingYears',
    ],
    pending: 'What they offered',
    railIcon: 'checklist',
  },
  {
    id: 'ask',
    index: 4,
    eyebrow: 'Your ask',
    title: 'Your ask',
    lead: null,
    next: null,
    fields: [],
    pending: null,
  },
]

export const offerStepByIndex = (index) =>
  OFFER_STEPS.find((step) => step.index === index)

/** Steps after `currentIndex` that still hold inputs. */
export const offerPendingAfter = (currentIndex) =>
  OFFER_STEPS.filter((step) => step.index > currentIndex && step.pending)

/* Options for the industry and location chip rows. Kept beside the steps so
   the labels and the engine keys cannot drift apart.

   `label` answers the question the chip row asks. `short` is the same choice
   said mid-sentence, which is what the copied ask needs: "times 1.1 for AI"
   reads, "times 1.1 for AI or machine learning" does not. One list, so a new
   industry cannot arrive with a label and no way to name it in prose. */

export const INDUSTRY_OPTIONS = [
  { value: 'saas', label: 'SaaS or general B2B software', short: 'SaaS' },
  { value: 'ai', label: 'AI or machine learning', short: 'AI' },
  { value: 'fintech', label: 'Fintech', short: 'fintech' },
  { value: 'health', label: 'Health tech', short: 'health tech' },
  {
    value: 'other',
    label: 'Something else, or not sure',
    short: 'this sector',
  },
]

export const GEO_OPTIONS = [
  {
    value: 'bay_nyc',
    label: 'Bay Area or New York',
    short: 'the Bay Area or New York',
  },
  { value: 'us_hub', label: 'Another US tech hub', short: 'a US tech hub' },
  { value: 'us_other', label: 'Elsewhere in the US', short: 'this location' },
  {
    value: 'remote_national',
    label: 'Remote, paid a national rate',
    short: 'remote at a national rate',
  },
]

/* `icon` is an icon-pack name (src/components/icon-pack.jsx), the same tiles
   the equity calculator's seat cards use. */
export const SEAT_OPTIONS = [
  { id: 'cto', label: 'CTO', icon: 'system' },
  { id: 'engineer', label: 'Software engineer', icon: 'computer' },
  { id: 'ceo_builder', label: 'CEO who builds', icon: 'rocket' },
]

export const JOINING_OPTIONS = [
  { id: 'formation', label: 'Co-founding at formation' },
  {
    id: 'fractional_conversion',
    label: 'Converting from fractional or contract',
  },
  { id: 'hired_after', label: 'Hired after formation' },
]

export const STAGE_OPTIONS = [
  { id: 'preseed', label: 'Pre-seed' },
  { id: 'seed', label: 'Seed' },
  { id: 'series_a', label: 'Series A' },
  { id: 'series_b_plus', label: 'Series B or later' },
]

export const OFFER_MODE_OPTIONS = [
  { id: 'percent', label: 'Percent, fully diluted' },
  { id: 'shares', label: 'Option count / shares' },
]

/* TODO(alec): confirm the vesting presets. The board draws 3 / 4 / 5 years;
   they are UI presets, not engine figures (BOUNDS allows 1–10 years), so
   "Other" takes any other value and a stored 6 never shows as "3 years". */
export const VESTING_PRESETS = [
  { value: 3, label: '3 years' },
  { value: 4, label: '4 years' },
  { value: 5, label: '5 years' },
]

/* TODO(alec): confirm the equity stepper's increment. The board steps the
   offered percent by 0.25 points; BOUNDS has no grain for it. The steppers
   round to two decimals, so 3 goes to 2.75 and then 2.5, never 2.8. */
export const EQUITY_STEP = 0.25

export const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

/* `[]` cannot mean both "not answered yet" and "none of these", so the chip
   group carries an explicit none option and the store records that the question
   was answered. Design review DD12. */
export const NONE_OF_THESE = '__none__'

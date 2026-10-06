'use client'

import Image from 'next/image'
import KingdomKodeMark from '@/components/brand/kingdom-kode-mark'
import logoMipi from '@/images/logos/mipi.svg'
import logoNewgen from '@/images/logos/newgen.png'
import logoSchwab from '@/images/logos/charles-schwab.png'
import logoDotCom from '@/images/logos/Dot_Com_Development.png'
import logoRlcanning from '@/images/logos/rlcanning-logo.png'

/* Record-block format ported from the RBP portfolio template's About page
   (github.com/DavidHDev/rbp-portfolio): labeled panels of logo rows, a
   collapsible Experience list with a blur fade, pill skills, and a stack
   chip wall. Restyled to amw tokens; physics stack omitted (no matter-js). */

/* `prior` marks the roles that carry OUTSIDE credibility and gives each its
   short form. The founder rows are his own companies and prove something
   different, so they are deliberately unmarked. The hero's proof strip reads
   from this, which means a rename here cannot leave the first viewport
   claiming an employer the record below no longer lists. */
const EXPERIENCE = [
  {
    company: 'Kingdom Kode',
    role: 'Co-Founder & CEO',
    period: '2025 - present',
    mark: KingdomKodeMark,
  },
  {
    company: 'MiPi',
    role: 'Founder & CEO',
    period: '2022 - present',
    logo: logoMipi,
  },
  {
    company: 'NewGen Business Solutions',
    role: 'Senior Lead Software Engineer',
    period: '2021 - 2025',
    logo: logoNewgen,
    prior: 'NewGen',
  },
  {
    company: 'Charles Schwab',
    role: 'Software Engineer',
    period: '2019 - 2021',
    logo: logoSchwab,
    prior: 'Charles Schwab',
  },
  {
    company: 'Dot Com Development',
    role: 'Junior Software Engineer',
    period: '2018 - 2019',
    logo: logoDotCom,
  },
  {
    company: 'RL Canning (Honeywell)',
    role: 'Automation Programmer',
    period: '2017 - 2020',
    logo: logoRlcanning,
    prior: 'Honeywell',
  },
]

const SKILLS = [
  'System Architecture',
  'Fractional CTO Work',
  'Full-Stack Engineering',
  'AI Product Development',
  'Industrial Automation',
  'Team Mentorship',
  'Business Strategy',
  'E-Commerce Builds',
]

/** Short names of the employers that carry outside credibility, in record
    order (most recent first). */
export const PRIOR_EMPLOYERS = EXPERIENCE.filter((e) => e.prior).map(
  (e) => e.prior
)

const ROW_HEIGHT = 64

function RecordPanel({ label, children, padded = true }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="amw-kicker">{label}</h3>
      <div
        className={`border-[var(--amw-line)] bg-[color-mix(in_srgb,var(--amw-card-2)_70%,transparent)] rounded-2xl border ${
          padded ? 'p-2 sm:p-3' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function RecordRow({ logo, mark: Mark, title, subtitle, meta }) {
  return (
    <li
      className="border-[var(--amw-line)] bg-[var(--amw-card)] flex items-center gap-4 rounded-xl border p-2"
      style={{ minHeight: ROW_HEIGHT }}
    >
      {/* Tiles stay white in both themes so every logo reads on a
          consistent ground; marks therefore render in their dark form. */}
      <span className="ring-[var(--amw-line)] inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white ring-1">
        {Mark ? (
          <Mark className="h-7 w-7 text-zinc-900" />
        ) : logo ? (
          <Image src={logo} alt="" className="h-7 w-7" unoptimized />
        ) : (
          <span className="amw-mono text-xs font-semibold text-[#0b756c]">
            {title.charAt(0)}
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <span className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {subtitle}
          {meta && (
            <span className="amw-mono ml-2 text-xs text-zinc-600 dark:text-zinc-400">
              {meta}
            </span>
          )}
        </span>
      </div>
    </li>
  )
}

/* NO LONGER COLLAPSIBLE. Six rows is not enough content to justify hiding half
   of it, and what it hid was the single strongest credential on a page whose
   whole job is to be believed: Charles Schwab sat behind a tap, 5.4 viewports
   down. The collapse saved about 290px on a 7,580px page - four percent - and
   cost the reader the proof. Showing all six also removes a state, an effect, a
   motion and a tap target from a page that was running about eleven motion
   systems against a budget of two to three. */
export function ExperienceRecord() {
  return (
    <RecordPanel label="Experience">
      <ul className="flex flex-col gap-2">
        {EXPERIENCE.map((entry) => (
          <RecordRow
            key={entry.company}
            logo={entry.logo}
            mark={entry.mark}
            title={entry.company}
            subtitle={entry.role}
            meta={entry.period}
          />
        ))}
      </ul>
    </RecordPanel>
  )
}

export function EducationRecord() {
  return (
    <RecordPanel label="Education">
      <ul className="flex flex-col gap-2">
        {/* School confirmed by Alec 2026-10-06. Both rows are mirrored in
            the Person JSON-LD (lib/seo/schema.js), which may only mark up
            what this panel shows. */}
        <RecordRow
          title="MBA, Business Administration"
          subtitle="Woolf University"
          meta="completed feb 2026"
        />
        <RecordRow
          title="Certified Full-Stack Software Developer"
          subtitle="Woz U"
          meta="issued feb 2019"
        />
      </ul>
    </RecordPanel>
  )
}

export function SkillsRecord() {
  return (
    <RecordPanel label="What I do">
      <div className="flex flex-wrap gap-2 p-1">
        {SKILLS.map((skill) => (
          <span
            key={skill}
            className="border-[var(--amw-line)] bg-[var(--amw-card)] rounded-full border px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300"
          >
            {skill}
          </span>
        ))}
      </div>
    </RecordPanel>
  )
}

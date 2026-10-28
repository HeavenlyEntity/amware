'use client'

import Image from 'next/image'
import KingdomKodeMark from '@/components/brand/kingdom-kode-mark'
import EdenKodeMark from '@/components/brand/edenkode-mark'
import MipiMark from '@/components/brand/mipi-mark'
import logoAmware from '@/images/logos/amware-crown-mark.webp'
import logoWoolf from '@/images/logos/woolf-university.webp'
import logoAnthropic from '@/images/logos/anthropic.svg'
import logoWozU from '@/images/logos/woz-u.webp'
import logoNewgen from '@/images/logos/newgen.png'
import logoSchwab from '@/images/logos/charles-schwab.png'
import logoDotCom from '@/images/logos/Dot_Com_Development.png'
import logoRlcanning from '@/images/logos/rlcanning-logo.png'

/* Record-block format ported from the RBP portfolio template's About page
   (github.com/DavidHDev/rbp-portfolio): labeled panels of logo rows, a
   collapsible Experience list with a blur fade, pill skills, and a stack
   chip wall. Restyled to amw tokens.

   Each list is one quiet panel: rows are separated by space and a hover
   tint, not by borders, so the logos and titles carry the hierarchy. */

/* `prior` marks the roles that carry OUTSIDE credibility and gives each its
   short form. The founder rows are his own companies and prove something
   different, so they are deliberately unmarked. The hero's proof strip reads
   from this, which means a rename here cannot leave the first viewport
   claiming an employer the record below no longer lists. */
/* AMWARE and EdenKode added 2026-10-11 from Alec's current resume. Two
   facts here still disagree with that resume and are left as they were
   until he confirms which is right: MiPi's start year (2022 here, 2020 on
   the resume) and the RL Canning dates (2017-2020 here, Jan-May 2019 on
   the resume). */
const EXPERIENCE = [
  {
    company: 'AMWARE Technologies LLC',
    role: 'Founder & Fractional CTO',
    period: '2026 - present',
    logo: logoAmware,
    logoSize: { w: 32, h: 22 },
  },
  {
    company: 'EdenKode',
    role: 'Chief Technology Officer',
    period: '2024 - present',
    mark: EdenKodeMark,
  },
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
    mark: MipiMark,
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

/* From Alec's resume, confirmed 2026-10-11. Every row is mirrored in the
   Person JSON-LD (lib/seo/schema.js), which may only mark up what this panel
   shows. Woz U is the school Steve Wozniak founded in 2017; Alec's
   certificate carries his signature. Say exactly that, so a reader who
   checks finds what the page says. Glendale Community College has no logo
   in the repo yet; its row shows a GCC monogram tile until one arrives. */
const EDUCATION = [
  {
    title: 'MBA, Business Administration',
    school: 'Woolf University',
    period: '2026',
    logo: logoWoolf,
    logoSize: { w: 30, h: 17 },
  },
  {
    title: 'Certified Full-Stack Software Developer',
    school:
      'Woz U, founded by Apple co-founder Steve Wozniak. Certificate signed by Wozniak.',
    period: '2019',
    logo: logoWozU,
  },
  {
    title: 'Associate of Science, Computer Science',
    school: 'Glendale Community College',
    period: '2020',
    monogram: 'GCC',
  },
  {
    title: 'AI Fluency for Small Businesses',
    school: 'Anthropic',
    period: '2026',
    logo: logoAnthropic,
    logoSize: { w: 24, h: 24 },
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

function RecordPanel({ label, children }) {
  return (
    <div>
      <h3 className="amw-kicker mb-3">{label}</h3>
      {children}
    </div>
  )
}

function RecordList({ children }) {
  return (
    <ul className="bg-[var(--amw-muted)] m-0 flex list-none flex-col gap-1 rounded-2xl p-2">
      {children}
    </ul>
  )
}

function RecordRow({
  logo,
  logoSize,
  mark: Mark,
  monogram,
  title,
  subtitle,
  meta,
}) {
  return (
    <li className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.04]">
      {/* Tiles stay white in both themes so every logo reads on a
          consistent ground; marks therefore render in their dark form. */}
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-white">
        {Mark ? (
          <Mark className="text-zinc-950 h-7 w-7" />
        ) : logo ? (
          <Image
            src={logo}
            alt=""
            className="object-contain"
            style={{ width: logoSize?.w ?? 28, height: logoSize?.h ?? 28 }}
            unoptimized
          />
        ) : (
          <span className="amw-mono text-xs font-semibold tracking-[0.04em] text-[#0b756c]">
            {monogram ?? title.charAt(0)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold tracking-[-0.01em] text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <span className="text-[var(--amw-mut)] text-sm leading-snug">
          {subtitle}
        </span>
      </span>
      {meta && (
        <span className="amw-mono text-[var(--amw-mut)] shrink-0 text-right text-xs tabular-nums">
          {meta}
        </span>
      )}
    </li>
  )
}

/* NO LONGER COLLAPSIBLE. Six rows is not enough content to justify hiding half
   of it, and what it hid was the single strongest credential on a page whose
   whole job is to be believed: Charles Schwab sat behind a tap, 5.4 viewports
   down. The collapse saved about 290px on a 7,580px page - four percent - and
   cost the reader the proof. Showing every row also removes a state, an
   effect, a motion and a tap target from a page that was running about eleven
   motion systems against a budget of two to three. */
export function ExperienceRecord() {
  return (
    <RecordPanel label="Experience">
      <RecordList>
        {EXPERIENCE.map((entry) => (
          <RecordRow
            key={entry.company}
            logo={entry.logo}
            logoSize={entry.logoSize}
            mark={entry.mark}
            title={entry.company}
            subtitle={entry.role}
            meta={entry.period}
          />
        ))}
      </RecordList>
    </RecordPanel>
  )
}

export function EducationRecord() {
  return (
    <RecordPanel label="Education">
      <RecordList>
        {EDUCATION.map((entry) => (
          <RecordRow
            key={entry.title}
            logo={entry.logo}
            logoSize={entry.logoSize}
            monogram={entry.monogram}
            title={entry.title}
            subtitle={entry.school}
            meta={entry.period}
          />
        ))}
      </RecordList>
    </RecordPanel>
  )
}

export function SkillsRecord() {
  return (
    <RecordPanel label="What I do">
      <div className="flex flex-wrap gap-2">
        {SKILLS.map((skill) => (
          <span
            key={skill}
            className="bg-[var(--amw-muted)] ring-[var(--amw-line)] rounded-full px-4 py-2 text-sm text-zinc-700 ring-1 ring-inset dark:text-zinc-300"
          >
            {skill}
          </span>
        ))}
      </div>
    </RecordPanel>
  )
}

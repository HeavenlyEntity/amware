'use client'

import { IconBrandGithub } from '@tabler/icons-react'

import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import { useSetupProgress } from '@/components/commerce/SetupProgress'
import { Rise, TypedCommands } from '@/components/warekit/kit-motion'

/*
 * `// sec.01 / what happens next` on a kit's setup page: accept the invite,
 * clone and run, add your key. The words are the kit's `next` story and its
 * quick start, from content/site/warekit.js; the repository is the one the
 * page already shows. The small mock inside each card is decorative and
 * hidden from assistive tech: the card's own title and note say the step.
 *
 * Client only so the first card can light up the moment the form on the same
 * page succeeds.
 */

function StepCard({ n, title, note, highlight = false, children }) {
  return (
    <li
      className="amw-kit-card amw-kit-lift flex flex-col gap-4 p-5"
      style={
        highlight
          ? {
              outline:
                '1px solid color-mix(in srgb, var(--amw-accent) 55%, transparent)',
              outlineOffset: '-1px',
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)] grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold"
        >
          {n}
        </span>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
      </div>
      <div aria-hidden="true">{children}</div>
      <p className="text-[var(--amw-mut)] text-[13px] leading-[1.55]">{note}</p>
    </li>
  )
}

/**
 * @param {{ story: any, repo?: string | null }} props
 */
export function NextStepsStrip({ story, repo }) {
  const progress = useSetupProgress()
  const next = story?.next
  if (!next) return null

  const fullName = repo || story.repo?.name || ''
  const [owner, name] = fullName.includes('/')
    ? fullName.split('/')
    : ['amwaredotdev', fullName]
  let n = 0

  return (
    <Rise className="mt-[5.5rem]" aria-labelledby="setup-next">
      <SectionEyebrow index="01" label="what happens next" />
      <h2
        id="setup-next"
        className="text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-zinc-900 dark:text-zinc-50 sm:text-[2rem]"
      >
        {next.title}
      </h2>

      <ol className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StepCard
          n={++n}
          title={next.accept.title}
          note={next.accept.note}
          highlight={Boolean(progress?.sent)}
        >
          <div className="amw-kit-inset flex flex-col gap-3 p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-zinc-100">
                <IconBrandGithub size={16} stroke={1.5} />
              </span>
              <span className="text-[var(--amw-ink)] min-w-0 text-[13px] leading-snug">
                <b className="font-semibold">{owner}</b> invited you to{' '}
                <b className="font-semibold">{name}</b>
              </span>
            </div>
            <span className="self-start rounded-md bg-[#1f7a33] px-3 py-1.5 text-xs font-semibold text-white">
              Accept invitation
            </span>
          </div>
        </StepCard>

        <StepCard n={++n} title={next.run.title} note={next.run.note}>
          <div className="amw-kit-inset p-3.5">
            <TypedCommands
              commands={story.quickStart.commands}
              start={0.8}
              gapClass="gap-2"
              className="text-[var(--amw-ink)] text-xs"
            />
          </div>
        </StepCard>

        {next.key && (
          <StepCard n={++n} title={next.key.title} note={next.key.note}>
            <div className="amw-kit-inset amw-mono flex flex-col py-2.5 text-xs">
              <span className="text-[var(--amw-mut)] px-3.5 py-1"># .env</span>
              <span className="amw-kit-keyline text-[var(--amw-ink)] px-3.5 py-1">
                WAREKIT_LICENSE_KEY=
                <span className="text-[var(--amw-accent-ink)]">••••••••</span>
              </span>
              <span className="text-[var(--amw-ink)] px-3.5 py-1">
                NS_ACCOUNT_ID=
              </span>
            </div>
          </StepCard>
        )}
      </ol>
    </Rise>
  )
}

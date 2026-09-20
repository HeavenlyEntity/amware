import React from 'react'
import {
  IconApi,
  IconBrandNextjs,
  IconBrandReact,
  IconBrandTailwind,
  IconBrandTypescript,
  IconBrandVercel,
  IconCode,
  IconComponents,
  IconDatabase,
  IconPackageExport,
  IconShieldLock,
  IconTestPipe,
} from '@tabler/icons-react'

/*
 * The tech stack, with marks.
 *
 * Tabler because the project already depends on it, so this adds no bundle
 * and no second icon family. It is also the rare library that carries both
 * real brand marks and neutral glyphs, which matters here: Next.js and
 * Postgres have logos, SuiteScript and SDF have none and never will. A
 * brand-logo-only approach leaves holes in the middle of a row.
 *
 * Matched on keywords, not exact strings. These values are typed into a CMS
 * field: "Next.js" becomes "Next.js 16" the first time someone updates a
 * kit, and an equality map would quietly fall back to a generic glyph with
 * nobody the wiser. Longest pattern wins so "react" cannot claim
 * "react-native" or "TanStack React Query".
 */

/* Each entry is [match, mark, colour]. Colours are the brands' own.
 *
 * INK means the brand's logo is black (Next.js, Vercel, shadcn). Drawing
 * those in #000 would erase them in dark mode, so they take the ink token
 * and flip with the theme -- still the right mark, still monochrome, still
 * visible. Technologies with no brand at all (SuiteScript, SDF) take ink
 * too, because inventing a colour for them would imply a brand that does
 * not exist. */
const INK = 'var(--amw-ink)'

const MARKS = [
  ['next.js', IconBrandNextjs, INK],
  ['nextjs', IconBrandNextjs, INK],
  ['react', IconBrandReact, '#61dafb'],
  ['typescript', IconBrandTypescript, '#3178c6'],
  ['tailwind', IconBrandTailwind, '#06b6d4'],
  ['vercel', IconBrandVercel, INK],
  ['postgres', IconDatabase, '#4169e1'],
  ['shadcn', IconComponents, INK],
  ['tanstack', IconApi, '#ef4444'],
  ['playwright', IconTestPipe, '#2ead33'],
  ['vitest', IconTestPipe, '#6da13f'],
  ['better auth', IconShieldLock, '#7c3aed'],
  ['auth', IconShieldLock, '#7c3aed'],
  ['suitescript', IconCode, INK],
  ['sdf', IconPackageExport, INK],
]

/** Neutral rather than wrong: an unknown technology is still code. */
const FALLBACK = IconCode
const FALLBACK_COLOR = INK

function match(tech) {
  const name = String(tech || '').toLowerCase()
  let best = null
  for (const entry of MARKS) {
    if (!name.includes(entry[0])) continue
    if (!best || entry[0].length > best[0].length) best = entry
  }
  return best
}

export function stackIcon(tech) {
  return match(tech)?.[1] ?? FALLBACK
}

export function stackColor(tech) {
  return match(tech)?.[2] ?? FALLBACK_COLOR
}

const names = (stack) =>
  stack.map((s) => (typeof s === 'string' ? s : s?.tech)).filter(Boolean)

/*
 * Chips wrap rather than truncate. The datasheet row used to print the first
 * three of eight with no ellipsis and no count, so a kit looked like it had a
 * three-item stack -- the buyer had no way to know five were missing.
 */
/**
 * Typed through JSDoc because this is a .jsx file consumed by a .tsx page:
 * without it TypeScript infers the `[]` default as `never[]` and rejects
 * every real array passed in.
 *
 * @param {{
 *   stack?: (string | { tech?: string | null } | null)[],
 *   className?: string,
 * }} props
 */
export function StackChips({ stack = [], className = '' }) {
  const items = names(stack)
  if (items.length === 0) return null

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((tech) => {
        const Icon = stackIcon(tech)
        return (
          <li key={tech} className="amw-chip">
            {/* Decorative: the name is right there in the chip, so the mark
                must not be read out a second time. */}
            <Icon
              size={14}
              stroke={1.6}
              aria-hidden="true"
              className="text-[var(--amw-accent-ink)] shrink-0"
            />
            {tech}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The same stack as overlapping discs. Each mark carries its brand colour,
 * which is the whole point: a row of grey glyphs is a spec sheet, a row of
 * brand marks is a stack someone recognises at a glance.
 *
 * Names are real text inside each item, not a title attribute, so a screen
 * reader reads the list properly and the hover label is decoration rather
 * than the only way to find out what a mark is.
 *
 * @param {{
 *   stack?: (string | { tech?: string | null } | null)[],
 *   className?: string,
 *   onCard?: boolean,
 * }} props
 */
export function StackLogos({ stack = [], className = '', onCard = false }) {
  const items = names(stack)
  if (items.length === 0) return null

  return (
    <ul
      className={`amw-logo-stack ${
        onCard ? 'amw-logo-stack--on-card' : ''
      } ${className}`}
      aria-label={`Built with ${items.join(', ')}`}
    >
      {items.map((tech, i) => {
        const Icon = stackIcon(tech)
        return (
          <li
            key={tech}
            /* Later discs sit behind earlier ones. Inline because the count
               is only known at render, and a CSS rule per position would be
               a made-up limit on how many technologies a kit may list. */
            style={{ zIndex: items.length - i }}
          >
            <span
              className="amw-logo"
              style={{ '--logo': stackColor(tech) }}
              /* Focusable so a keyboard user can reach the label the same way
                 a pointer user hovers it. Not a button: nothing happens. */
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard access to the visible technology tooltip.
              tabIndex={0}
            >
              <Icon size={20} stroke={1.6} aria-hidden="true" />
              <span className="sr-only">{tech}</span>
            </span>
            <span className="amw-logo-name" aria-hidden="true">
              {tech}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

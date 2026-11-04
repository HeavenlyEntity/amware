import Link from 'next/link'
import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconChevronRight,
  IconLoader2,
} from '@tabler/icons-react'

/*
 * The home page's primary button, as a component: an accent fill, an Inter
 * medium label and a 40px round knob holding a chevron. On hover it rounds
 * into a pill and the knob grows (`.amw-kit-cta` in styles/kit.css).
 *
 * The same pattern is repeated as an inline class string in about sixteen
 * other files. Only the kit product and setup pages use this one; folding the
 * rest in is a separate change.
 *
 * No hooks, so it renders on the server and inside client components alike.
 * `state` is the caller's: `pending` puts a spinner in the knob, `done` a
 * check. The label stays the caller's too.
 */

const KNOB_ICON = { size: 16, stroke: 2, 'aria-hidden': true }

function Knob({ state, icon }) {
  return (
    <span className="amw-kit-knob" aria-hidden="true">
      {state === 'pending' ? (
        <IconLoader2 {...KNOB_ICON} className="amw-kit-spin" />
      ) : state === 'done' ? (
        <IconCheck {...KNOB_ICON} stroke={2.4} className="amw-kit-pop" />
      ) : icon === 'external' ? (
        <IconArrowUpRight {...KNOB_ICON} />
      ) : (
        <IconChevronRight {...KNOB_ICON} className="relative left-px" />
      )}
    </span>
  )
}

/**
 * Typed through JSDoc because this is a .jsx file used from .tsx pages.
 *
 * @param {{
 *   href?: string,
 *   external?: boolean,
 *   variant?: 'accent' | 'white',
 *   state?: 'idle' | 'pending' | 'done',
 *   icon?: 'chevron' | 'external',
 *   full?: boolean,
 *   className?: string,
 *   children?: import('react').ReactNode,
 *   [key: string]: unknown,
 * }} props
 */
export function ChevronCta({
  href,
  external = false,
  variant = 'accent',
  state = 'idle',
  icon,
  full = false,
  className = '',
  children,
  ...rest
}) {
  const cls = `amw-kit-cta amw-kit-cta--${variant} ${
    full ? 'w-full' : ''
  } ${className}`.trim()
  const body = (
    <>
      <span className="min-w-0">{children}</span>
      <Knob state={state} icon={icon ?? (external ? 'external' : 'chevron')} />
    </>
  )

  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} {...rest}>
        {body}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {body}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={cls}
      aria-busy={state === 'pending' ? true : undefined}
      {...rest}
    >
      {body}
    </button>
  )
}

/*
 * The secondary action, from the about page: a hairline ring that turns teal
 * on hover, with an arrow that slides in beside the label.
 */
export function RingLink({ href, className = '', children, ...rest }) {
  return (
    <Link
      href={href}
      className={`amw-kit-ring hover:text-[var(--amw-accent-ink)] hover:ring-[var(--amw-accent)] min-h-12 ring-zinc-900/15 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-5 text-sm font-medium text-zinc-700 no-underline ring-1 ring-inset transition-colors duration-200 dark:text-zinc-200 dark:ring-white/[0.18] ${className}`}
      {...rest}
    >
      {children}
      <IconArrowRight
        size={16}
        stroke={1.5}
        aria-hidden="true"
        className="amw-kit-chev"
      />
    </Link>
  )
}

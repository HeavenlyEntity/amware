'use client'

import Link from 'next/link'

import { trackCta } from '@/components/founders/analytics'

/* A path card's link: tracks the pointer so the card's teal spotlight sits
   under it (`--mx` / `--my`, read by `.amw-dk-step::before`), and records a
   value-free CTA click. The card's content stays server-rendered. */
export function SpotlightLink({ href, className = '', children, ...rest }) {
  const onPointerMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty(
      '--mx',
      `${event.clientX - box.left}px`
    )
    event.currentTarget.style.setProperty(
      '--my',
      `${event.clientY - box.top}px`
    )
  }
  return (
    <Link
      href={href}
      className={className}
      onPointerMove={onPointerMove}
      onClick={() => trackCta()}
      {...rest}
    >
      {children}
    </Link>
  )
}

/* The hero's one primary action, tracked the same value-free way. */
export function TrackedLink({ href, className = '', children, ...rest }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackCta()}
      {...rest}
    >
      {children}
    </Link>
  )
}

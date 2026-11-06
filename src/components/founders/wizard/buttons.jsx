'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import '@/styles/founders-wizard.css'

/*
 * The desk's three button weights (board `.eq-next.wp-cta`, `.eq-backbtn`,
 * `.eq-textbtn`), plus the mono hand-off link.
 *
 * NextButton: the one primary per screen. Teal, a dark dot with a chevron,
 *   square corners that round on hover. With `href` it renders a Link.
 *   `block` makes it full width below `sm`.
 * BackButton: the outlined secondary, chevron left. `icon` replaces it.
 * TextButton: an underlined quiet action.
 * MonoLink: the accent mono link the boards use for hand-offs.
 */

export function NextButton({
  children,
  href,
  onClick,
  disabled = false,
  block = false,
  className = '',
  ...rest
}) {
  const classes = `amw-wz-next group ${
    block ? 'amw-wz-next--block' : ''
  } ${className}`
  const body = (
    <>
      <span>{children}</span>
      <span className="amw-wz-next-dot" aria-hidden="true">
        <ChevronRight className="size-4 relative left-px" />
      </span>
    </>
  )
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes} {...rest}>
        {body}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...rest}
    >
      {body}
    </button>
  )
}

export function BackButton({
  children = 'Back',
  onClick,
  icon,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`amw-wz-backbtn ${className}`}
    >
      {icon ?? <ChevronLeft className="size-4" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function TextButton({ children, onClick, className = '', ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`amw-wz-textbtn ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function MonoLink({ href, children, onClick, className = '' }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`amw-wz-monolink ${className}`}
    >
      {children}
    </Link>
  )
}

'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { IconCheck, IconCopy } from '@tabler/icons-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'

/* The client half of the kit pages' motion. The ambient loops and the
   page-load rise are CSS (styles/kit.css); what is here needs to know
   something: whether a section has been seen, or whether a copy worked. */

/* The design system's ease, as motion takes it. */
export const KIT_EASE = [0.2, 0.7, 0.2, 1]

/**
 * A section that rises 16px into place the first time it is scrolled to.
 * `i` staggers siblings 70ms apart. Under reduced motion it is simply there.
 *
 * @param {{ i?: number, as?: 'div' | 'section' | 'li', className?: string,
 *   children?: import('react').ReactNode, [key: string]: unknown }} props
 */
export function Rise({ i = 0, as = 'section', className, children, ...rest }) {
  const reduced = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.6, delay: i * 0.07, ease: KIT_EASE }
      }
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Marks its subtree `data-in="true"` once it has been in view, for the CSS
 * that draws checks and types commands. Under reduced motion the attribute is
 * left off entirely, and with it every one of those animations: the content
 * is drawn and typed from the start.
 *
 * @param {{ as?: 'div' | 'ul' | 'ol', className?: string,
 *   children?: import('react').ReactNode, [key: string]: unknown }} props
 */
export function InView({ as = 'div', className, children, ...rest }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, amount: 0.3 })
  const reduced = useReducedMotion()
  const Tag = as
  return (
    <Tag
      ref={ref}
      data-in={reduced ? undefined : seen ? 'true' : 'false'}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Commands as `$ …` lines that type themselves out, 1s apart, once seen. The
 * last one carries the cursor.
 *
 * @param {{ commands: string[], className?: string, start?: number,
 *   gapClass?: string }} props
 */
export function TypedCommands({
  commands,
  className = '',
  start = 0.2,
  gapClass = 'gap-2.5',
}) {
  return (
    <InView className={`amw-mono flex flex-col ${gapClass} ${className}`}>
      {commands.map((cmd, i) => (
        <span
          key={cmd}
          className="amw-kit-type block whitespace-pre"
          style={{ '--d': `${start + i}s` }}
        >
          <span className="text-[var(--amw-accent-ink)]" aria-hidden="true">
            ${' '}
          </span>
          {cmd}
          {i === commands.length - 1 && (
            <span className="amw-cursor" aria-hidden="true" />
          )}
        </span>
      ))}
    </InView>
  )
}

const COPIED_MS = 1800

/**
 * Copies the commands, one per line, and says so for a moment. A failed copy
 * (no clipboard, or permission refused) says nothing rather than claim it
 * worked.
 *
 * @param {{ text: string, label?: string }} props
 */
export function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  const reduced = useReducedMotion()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="hover:text-[var(--amw-accent-ink)] hover:ring-[var(--amw-accent)] ring-[var(--amw-line-strong)] min-h-11 text-[var(--amw-ink)] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-medium ring-1 ring-inset transition-colors duration-200"
      >
        <AnimatePresence initial={false} mode="wait">
          {copied ? (
            <motion.span
              key="done"
              className="text-[var(--amw-accent-ink)] inline-flex items-center gap-1.5"
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: KIT_EASE }}
            >
              <IconCheck size={14} stroke={2} aria-hidden="true" />
              Copied
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              className="inline-flex items-center gap-1.5"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <IconCopy size={14} stroke={1.6} aria-hidden="true" />
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      {/* Announced, since a label change inside a button may not be. */}
      <span className="sr-only" role="status">
        {copied ? 'Commands copied' : ''}
      </span>
    </>
  )
}

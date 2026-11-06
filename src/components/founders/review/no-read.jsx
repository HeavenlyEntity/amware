import Link from 'next/link'
import { ArrowLeftRight, Percent } from 'lucide-react'

import { ASK_HREF, EQUITY_HREF } from '@/lib/founders/tools'

const TOOLS = [
  {
    href: EQUITY_HREF,
    icon: Percent,
    title: 'Equity calculator',
    // TODO(alec): "About three minutes" is the board's claim; nothing measures
    // the run time. Confirm it or drop the sentence.
    body: 'Is the stake sized for the work? About three minutes.',
  },
  {
    href: ASK_HREF,
    icon: ArrowLeftRight,
    title: 'Job offer calculator',
    body: 'What to ask for, in cash and equity, and where to stop.',
  },
]

/* The spotlight follows the pointer through two custom properties. */
const followPointer = (event) => {
  const box = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`)
}

/** Section 1 without a read: the two tools, or the blanks to fill by hand. */
export function NoRead({ manual, onManual }) {
  return (
    <>
      <div className="rv-tools">
        {TOOLS.map(({ href, icon: Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="rv-tool"
            onMouseMove={followPointer}
          >
            <span className="rv-tool-ico" aria-hidden="true">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span className="rv-tool-text">
              <span className="rv-tool-title">{title}</span>
              <span className="rv-tool-body">{body}</span>
              <span className="amw-kicker rv-tool-kick">
                Run it, then come back →
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="rv-or">or describe it yourself</p>
      <label className="rv-lbl" htmlFor="rv-manual">
        The offer, in your words <small>Fill the blanks you know</small>
      </label>
      <div className="rv-input">
        <textarea
          id="rv-manual"
          rows={9}
          className="rv-mono"
          value={manual}
          onChange={(event) => onManual(event.target.value)}
        />
      </div>
    </>
  )
}

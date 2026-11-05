import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { DESK_HREF, liveTools } from '@/lib/founders/tools'

/* The way back to the desk from a tool or the review, as the boards draw it:
   a mono accent link at the top of the content. It replaces the old eyebrow's
   icon row, which the dock now does better. Not sticky: the boards define a
   sticky bar but never use it. */
export function DeskBackLink({ className = '' }) {
  return (
    <div data-print="hide" className={className}>
      <Link
        href={DESK_HREF}
        className="amw-eyebrow min-h-11 group mb-0 inline-flex items-center gap-2 no-underline"
      >
        <ArrowLeft
          className="size-3.5 in-data-[reduced-motion=true]:transition-none in-data-[reduced-motion=true]:group-hover:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          strokeWidth={2.25}
          aria-hidden="true"
        />
        Founders’ Desk
      </Link>
    </div>
  )
}

/** "Tool 01", numbered by position among the live tools, so it cannot drift
    from the registry when a tool goes live. */
export function toolNumber(id) {
  const index = liveTools().findIndex((tool) => tool.id === id)
  return index < 0 ? null : String(index + 1).padStart(2, '0')
}

/* `// Tool 01 / Equity calculator`, the calculators' page eyebrow. */
export function ToolEyebrow({ id, className = '' }) {
  const tool = liveTools().find((entry) => entry.id === id)
  if (!tool) return null
  return (
    <p data-print="hide" className={`amw-eyebrow mb-0 ${className}`}>
      {`// Tool ${toolNumber(id)} / ${tool.label}`}
    </p>
  )
}

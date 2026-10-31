import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { BUILD_PROCESS } from '@/content/site/warekit'

export function BuiltPanel() {
  return (
    <div className="pr-built pj-rise">
      <div>
        <p className="pj-kicker">Built for your business</p>
        <h3 className="pr-built-title">
          Bring the workflow. Leave the framework to me.
        </h3>
        <p className="pr-built-copy">
          A kit is a foundation, not a finished app. If you would rather not
          choose an authentication framework, a strategy call scopes the build
          before anything starts.
        </p>
        <div className="pr-built-acts">
          <Link href="/services" className="pj-btn pj-btn--across">
            <span>Book a strategy call</span>
            <span className="pj-btn-dot">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
          {/* TODO(alec): confirm the strategy call amount. */}
          <span className="pj-kicker">Strategy call · $1,500.00</span>
        </div>
      </div>
      <ol className="pr-process" aria-label="How a build engagement runs">
        {BUILD_PROCESS.map(({ title, copy }, i) => (
          <li key={title}>
            <span className="pr-process-n">0{i + 1}</span>
            <div>
              <b>{title}</b>
              <span>{copy}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

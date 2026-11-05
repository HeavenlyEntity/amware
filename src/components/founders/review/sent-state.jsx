import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { DESK_HREF } from '@/lib/founders/tools'

const DOT_COLOURS = ['var(--rv-dot-a)', 'var(--amw-accent)', 'var(--rv-dot-c)']

/**
 * The main card once the review is sent. Lives in place of /thank-you, which
 * is the newsletter's page. It does not survive a reload: `askedAt` stays
 * set, so a reload shows the prefilled form again, which is fine for a form
 * that has already done its job.
 */
export function SentState({ email, replyBy, urgent, onAnother, headingRef }) {
  return (
    <div className="rv-sent" role="status">
      <div className="rv-burst" aria-hidden="true">
        <span className="rv-burst-ring" />
        <span className="rv-burst-ring" />
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="rv-dot"
            style={{ '--a': `${i * 30}deg`, '--c': DOT_COLOURS[i % 3] }}
          />
        ))}
        <span className="rv-burst-core">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="rv-sent-h rv-rise"
        style={{ '--d': '.35s' }}
      >
        Sent. It is with me now.
      </h2>
      <p className="rv-sent-body rv-rise" style={{ '--d': '.45s' }}>
        I will reply to <strong>{email}</strong> by <strong>{replyBy}</strong>.
        A confirmation is on its way to your inbox now.
      </p>
      {urgent && (
        // TODO(alec): "top of the pile" is a promise with no triage behind it
        // yet; the only effect today is "(answering this week)" in the subject.
        <p
          className="amw-kicker rv-sent-urgent rv-rise"
          style={{ '--d': '.55s' }}
        >
          Marked as answering this week · it goes to the top of the pile
        </p>
      )}
      <div className="rv-sent-actions rv-rise" style={{ '--d': '.6s' }}>
        <Link href={DESK_HREF} className="rv-cta">
          Back to the desk
          <span className="rv-cta-dot" aria-hidden="true">
            <ChevronRight className="size-4" />
          </span>
        </Link>
        <button type="button" className="rv-backbtn" onClick={onAnother}>
          Send another
        </button>
      </div>
    </div>
  )
}

import { Check } from 'lucide-react'

const ROW_WIDTHS = [78, 62, 84, 56, 72, 66, 80]

function Brand() {
  return (
    <div className="gd-cv-brand">
      <svg
        width="14"
        height="10"
        viewBox="0 0 28 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M2 18h24M3 14 2 3l7 5 5-7 5 7 7-5-1 11z" />
      </svg>
      AMWARE
    </div>
  )
}

/* Drawn covers, always decorative: the callers hide them from assistive
   tech, and the same facts are in the text beside them. The page stat comes
   from Payload and drops out when the read fails.
   TODO(alec): "Ed. 01", "15m" and "8 runbooks" are the board's. Confirm them
   against the Switch Clone PDF. */
export function PlaybookCover({ pages, className = '' }) {
  return (
    <div className={`gd-doc gd-cv-play ${className}`}>
      <Brand />
      <p className="gd-cv-kick">A fractional CTO playbook · Ed. 01</p>
      <p className="gd-cv-title">
        The 15-Minute Key Rotation <em>Playbook.</em>
      </p>
      <div className="gd-cv-stats">
        <span>
          15m<small>Window</small>
        </span>
        <span>
          8<small>Runbooks</small>
        </span>
        {pages && (
          <span>
            {pages}
            <small>Pages</small>
          </span>
        )}
      </div>
      <div className="gd-cv-foot">
        <span>Alec Mingione</span>
        <span>amware.dev</span>
      </div>
    </div>
  )
}

export function ChecklistCover({ className = '', style }) {
  return (
    <div className={`gd-doc gd-cv-check gd-ticks ${className}`} style={style}>
      <Brand />
      <p className="gd-cv-kick">Free founder resource</p>
      <p className="gd-cv-title">Dev Shop Contract Red Flags</p>
      <ul className="gd-cv-rows">
        {ROW_WIDTHS.map((width, n) => (
          <li key={n} style={{ '--n': n }}>
            <i>
              <Check width={8} height={8} strokeWidth={4} aria-hidden="true" />
            </i>
            <b style={{ width: `${width}%` }} />
          </li>
        ))}
      </ul>
      <div className="gd-cv-foot">
        <span>Checklist · 2 pages</span>
        <span>amware.dev</span>
      </div>
    </div>
  )
}

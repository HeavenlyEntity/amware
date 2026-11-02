'use client'

import { Check } from 'lucide-react'

import { PATHS } from '@/content/site/warekit'
import { Reveal } from './reveal'

const MONO = 'JetBrains Mono, monospace'
const SANS = 'Inter, sans-serif'

function InsideDiagram() {
  return (
    <svg viewBox="0 0 320 132">
      <rect
        x="60"
        y="18"
        width="200"
        height="96"
        rx="14"
        fill="#141419"
        stroke="rgba(255,255,255,.18)"
      />
      <text
        x="74"
        y="38"
        fill="#71717a"
        fontFamily={MONO}
        fontSize="9"
        letterSpacing="1.5"
      >
        NETSUITE ACCOUNT
      </text>
      <rect
        className="pr-pulse"
        x="108"
        y="50"
        width="104"
        height="48"
        rx="10"
        fill="rgba(60,232,206,.14)"
        stroke="#3ce8ce"
      />
      <text
        x="160"
        y="78"
        textAnchor="middle"
        fill="#5eead4"
        fontFamily={SANS}
        fontSize="12"
        fontWeight="600"
      >
        React app
      </text>
      <circle
        cx="28"
        cy="74"
        r="9"
        fill="none"
        stroke="#a1a1aa"
        strokeWidth="1.5"
      />
      <path
        className="pr-flow"
        d="M40 74 H106"
        stroke="#3ce8ce"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}

function ConnectedDiagram() {
  return (
    <svg viewBox="0 0 320 132">
      <rect
        x="16"
        y="40"
        width="84"
        height="44"
        rx="10"
        fill="rgba(60,232,206,.14)"
        stroke="#3ce8ce"
      />
      <text
        x="58"
        y="66"
        textAnchor="middle"
        fill="#5eead4"
        fontFamily={SANS}
        fontSize="11"
        fontWeight="600"
      >
        Next.js app
      </text>
      <path
        className="pr-flow"
        d="M102 62 H214"
        stroke="#3ce8ce"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="216"
        y="22"
        width="88"
        height="80"
        rx="12"
        fill="#141419"
        stroke="rgba(255,255,255,.18)"
      />
      <text
        x="260"
        y="66"
        textAnchor="middle"
        fill="#d4d4d8"
        fontFamily={SANS}
        fontSize="11"
        fontWeight="600"
      >
        NetSuite
      </text>
      <ellipse
        className="pr-pulse"
        cx="58"
        cy="108"
        rx="18"
        ry="5"
        fill="none"
        stroke="#a1a1aa"
      />
      <path
        d="M40 108 v10 a18 5 0 0 0 36 0 v-10"
        fill="none"
        stroke="#a1a1aa"
      />
      <path d="M58 86 V102" stroke="#71717a" strokeDasharray="2 3" />
      <text
        x="86"
        y="118"
        fill="#71717a"
        fontFamily={MONO}
        fontSize="8"
        letterSpacing="1"
      >
        SESSIONS
      </text>
    </svg>
  )
}

const STEPS = [
  { cx: 40, on: true },
  { cx: 100 },
  { cx: 160 },
  { cx: 220 },
  { cx: 280, on: true, pulse: true },
]

function BuiltDiagram() {
  return (
    <svg viewBox="0 0 320 132">
      <g fontFamily={MONO} fontSize="9" fill="#a1a1aa">
        {STEPS.map(({ cx, on, pulse }, i) => (
          <g key={cx}>
            <circle
              className={pulse ? 'pr-pulse' : undefined}
              cx={cx}
              cy="66"
              r="14"
              fill={pulse ? 'rgba(60,232,206,.14)' : '#141419'}
              stroke={on ? '#3ce8ce' : 'rgba(255,255,255,.25)'}
            />
            <text
              x={cx}
              y="69"
              textAnchor="middle"
              fill={on ? '#5eead4' : undefined}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </g>
      <path
        className="pr-flow"
        d="M54 66 H86 M114 66 H146 M174 66 H206 M234 66 H266"
        stroke="#3ce8ce"
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="40"
        y="100"
        textAnchor="middle"
        fill="#71717a"
        fontFamily={MONO}
        fontSize="8"
      >
        SCOPE
      </text>
      <text
        x="280"
        y="100"
        textAnchor="middle"
        fill="#71717a"
        fontFamily={MONO}
        fontSize="8"
      >
        HANDOVER
      </text>
    </svg>
  )
}

const DIAGRAMS = {
  inside: InsideDiagram,
  connected: ConnectedDiagram,
  built: BuiltDiagram,
}

const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function PathPicker({ family, onPick }) {
  return (
    <section
      id="pr-run"
      aria-labelledby="pr-run-title"
      className="pj-wrap pr-first"
    >
      <Reveal>
        <p className="pj-kicker">01 · Where does your app run?</p>
        <h2 id="pr-run-title" className="pj-h2">
          Pick the architecture, then the edition.
        </h2>
        <p className="pj-lead">
          The first decision is where the app lives. Everything else follows
          from it.
        </p>
      </Reveal>
      <Reveal
        delay={0.1}
        className="pr-paths"
        role="group"
        aria-label="Where does your app run?"
      >
        {PATHS.map((path) => {
          const Diagram = DIAGRAMS[path.family]
          return (
            <button
              key={path.family}
              type="button"
              className="pr-path"
              aria-pressed={family === path.family}
              onClick={() => onPick(path.family)}
              onMouseMove={spot}
            >
              <span className="pr-path-tick" aria-hidden="true">
                <Check width={12} height={12} strokeWidth={3.5} />
              </span>
              <span className="pr-diagram" aria-hidden="true">
                <Diagram />
              </span>
              <span>
                <span className="pr-path-name">{path.name}</span>
                <span className="pr-path-copy">{path.copy}</span>
              </span>
              <span className="pr-path-route">{path.route}</span>
            </button>
          )
        })}
      </Reveal>
    </section>
  )
}

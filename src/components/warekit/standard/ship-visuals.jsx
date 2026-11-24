'use client'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { BRAND_ICONS } from './brand-icons'

/* The six pictures for the presale's "what ships" bento, keyed by the
   `PRESALE.ships.items[].id` they illustrate. All are decorative and hidden
   from assistive tech: the tile's label, title and description carry the
   meaning, so nothing in here is focusable. None shows a person's name, a
   company name or a money figure. Styles are the `st-` rules in the
   "Standard presale" block of products.css, on the `--amw-*` tokens. */

/* ---- ai: an assistant panel that streams its reply ------------------------
   Ported from the board's chat tile (`.mi-chat*`, renamed `st-chat`). The
   reply streams word by word after three typing dots: word n of 13 starts at
   3 + n * 2.4 / 12 seconds, on one 10 second loop. useReducedMotion says
   "reduced" on the server and on the first client render, so the still
   version is what is server-rendered; the animated one takes over only once
   the reader's setting allows it. */

const PROMPT = 'Draft a welcome email for new teams.'
const REPLY = [
  'Subject: Welcome aboard.',
  'Your workspace is ready.',
  'Invite your team to get started.',
]
const REPLY_WORDS = REPLY.join(' ').split(' ').length
const STREAM_START = 3
const STREAM_LENGTH = 2.4

function ReplyLines({ still }) {
  let at = 0
  return REPLY.map((line) => {
    const words = line.split(' ')
    return (
      <span key={line} className="st-chat-line">
        {words.map((word, i) => {
          const n = at++
          const last = n === REPLY_WORDS - 1
          return (
            <span
              key={`${word}-${i}`}
              className={last && !still ? 'st-chat-w amw-cursor' : 'st-chat-w'}
              style={
                still
                  ? undefined
                  : {
                      animationDelay: `${(
                        STREAM_START +
                        (n * STREAM_LENGTH) / (REPLY_WORDS - 1)
                      ).toFixed(2)}s`,
                    }
              }
            >
              {word + (i < words.length - 1 ? ' ' : '')}
            </span>
          )
        })}
      </span>
    )
  })
}

function AssistantVisual() {
  const still = useReducedMotion()
  return (
    <div
      className="st-chat"
      data-still={still ? '' : undefined}
      aria-hidden="true"
    >
      <div className="st-chat-bar">
        <span className="st-chat-dot" />
        assistant
        <span className="st-chat-live">streaming</span>
      </div>
      <div className="st-chat-thread">
        <div className="st-chat-user">{PROMPT}</div>
        <div className="st-chat-bot">
          {still ? null : (
            <span className="st-chat-typing">
              <i />
              <i />
              <i />
            </span>
          )}
          <ReplyLines still={still} />
        </div>
      </div>
      <div className="st-chat-meter">
        <div className="st-chat-meter-row">
          <span>usage this call</span>
          <span>metered</span>
        </div>
        <div className="st-chat-track">
          <span className="st-chat-fill" />
        </div>
      </div>
      <div className="st-chat-input">
        Ask anything
        <span className="st-chat-send">
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14m-7-7l7 7l-7 7" />
          </svg>
        </span>
      </div>
    </div>
  )
}

/* ---- accounts: a team's members, by role ---------------------------------
   Three member rows with a blank avatar and a placeholder bar where a name
   would sit, each tagged by role, then a dashed pending invitation. The
   invitation is the accent. */

const ROLES = ['Owner', 'Admin', 'Member']

function AccountsVisual() {
  return (
    <div className="st-vis st-acct" aria-hidden="true">
      <div className="st-vis-head">
        <span>team account</span>
        <span>3 members</span>
      </div>
      <ul className="st-acct-list">
        {ROLES.map((role, index) => (
          <li key={role} className="st-acct-row">
            <span className="st-acct-avatar" />
            <span
              className="st-acct-name"
              style={{ '--st-bar': `${68 - index * 12}%` }}
            />
            <span className="st-vis-chip">{role}</span>
          </li>
        ))}
        <li className="st-acct-row st-acct-invite">
          <span className="st-acct-avatar">
            <svg
              viewBox="0 0 24 24"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="st-acct-name" style={{ '--st-bar': '44%' }} />
          <span className="st-acct-sent">Invite sent</span>
        </li>
      </ul>
    </div>
  )
}

/* ---- payments: a plan and the events behind it ---------------------------
   The plan row on top, then the webhook log: a checkout, a renewal, and the
   same renewal delivered again and ignored. The active badge is the accent. */

const EVENTS = [
  { name: 'checkout.completed', status: 'ok' },
  { name: 'subscription.renewed', status: 'ok' },
  { name: 'subscription.renewed', status: 'replayed · ignored', ignored: true },
]

function PaymentsVisual() {
  return (
    <div className="st-vis st-pay" aria-hidden="true">
      <div className="st-pay-plan">
        <span className="st-pay-plan-name">Pro · monthly</span>
        <span className="st-pay-active">active</span>
      </div>
      <ul className="st-vis-log">
        {EVENTS.map((event, index) => (
          <li
            key={`${event.name}-${index}`}
            className="st-vis-log-row"
            data-muted={event.ignored ? '' : undefined}
          >
            <span className="st-vis-log-key">{event.name}</span>
            <span className="st-vis-log-status">{event.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---- dev-tool: the environment check -------------------------------------
   A terminal-style panel checking three settings: two pass, the AI key is
   missing and carries the accent. */

const SETTINGS = [
  { key: 'DATABASE_URL', status: 'ok' },
  { key: 'BILLING_WEBHOOK_SECRET', status: 'ok' },
  { key: 'AI_API_KEY', status: 'missing', flag: true },
]

function DevToolVisual() {
  return (
    <div className="st-vis st-env" aria-hidden="true">
      <div className="st-vis-head">
        <span>
          <span className="st-env-prompt">$</span> check env
        </span>
        <span>2 / 3</span>
      </div>
      <ul className="st-vis-log">
        {SETTINGS.map((setting) => (
          <li
            key={setting.key}
            className="st-vis-log-row"
            data-flag={setting.flag ? '' : undefined}
          >
            <span className="st-vis-log-key">{setting.key}</span>
            <span className="st-vis-log-status">{setting.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---- interface: a skeleton dashboard -------------------------------------
   A window with a side rail, three cards and a bar chart, in shapes only:
   no words and no numbers. The latest bar carries the accent. */

const BARS = [38, 52, 44, 66, 58, 74, 62, 86, 70, 92, 80, 100]

function InterfaceVisual() {
  return (
    <div className="st-vis st-ui" aria-hidden="true">
      <div className="st-ui-top">
        <i />
        <i />
        <i />
      </div>
      <div className="st-ui-body">
        <div className="st-ui-rail">
          <span className="st-ui-logo" />
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="st-ui-nav"
              data-current={index === 1 ? '' : undefined}
            />
          ))}
        </div>
        <div className="st-ui-main">
          <div className="st-ui-cards">
            {[0, 1, 2].map((index) => (
              <div key={index} className="st-ui-card">
                <span className="st-ui-line" />
                <span className="st-ui-line st-ui-line--big" />
              </div>
            ))}
          </div>
          <div className="st-ui-chart">
            {BARS.map((height, index) => (
              <span
                key={index}
                className="st-ui-bar"
                data-on={index === BARS.length - 1 ? '' : undefined}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- stack: five logo tiles ----------------------------------------------
   The framework, Next.js, carries the accent edge. */

const STACK = [
  ['nextjs', 'Next.js'],
  ['typescript', 'TypeScript'],
  ['tailwind', 'Tailwind CSS'],
  ['pnpm', 'pnpm'],
  ['turborepo', 'Turborepo'],
]

function StackVisual() {
  return (
    <div className="st-vis st-stack" aria-hidden="true">
      {STACK.map(([id, name]) => {
        const icon = BRAND_ICONS[id]
        return (
          <span
            key={id}
            className="st-stack-tile"
            data-on={id === 'nextjs' ? '' : undefined}
            title={name}
          >
            <svg
              viewBox={icon.viewBox}
              width="20"
              height="20"
              fill={icon.stroke ? 'none' : 'currentColor'}
              stroke={icon.stroke ? 'currentColor' : undefined}
            >
              <path d={icon.d} />
            </svg>
          </span>
        )
      })}
    </div>
  )
}

export const SHIP_VISUALS = {
  accounts: AccountsVisual,
  ai: AssistantVisual,
  payments: PaymentsVisual,
  'dev-tool': DevToolVisual,
  interface: InterfaceVisual,
  stack: StackVisual,
}

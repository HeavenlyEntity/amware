'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Clock, Send } from 'lucide-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { ContactCaptcha } from '@/components/ContactCaptcha'
import { DeskBackLink } from '@/components/founders/desk-back-link'
import { FoundersDeskDock } from '@/components/founders/desk-dock'
import { announceDesk } from '@/components/founders/desk-toast'
import { DeskBackdrop } from '@/components/founders/desk/desk-backdrop'
import { NoRead } from '@/components/founders/review/no-read'
import { ReadCard, ReadSkeleton } from '@/components/founders/review/read-card'
import { ReviewHero } from '@/components/founders/review/review-hero'
import { ReviewRail } from '@/components/founders/review/review-rail'
import {
  DEADLINE_OPTIONS,
  DEFAULT_DEADLINE,
  HELP_OPTIONS,
  MANUAL_TEMPLATE,
  NOTE_MAX,
  URGENT_DEADLINE,
  buildReview,
  composeReview,
  defaultHelp,
  emailValid,
  manualFilled,
  nameValid,
  replyByDate,
} from '@/components/founders/review/review-message'
import { SentState } from '@/components/founders/review/sent-state'
import {
  hasHydrated,
  onHydrated,
  useOfferStore,
} from '@/lib/founders/offer-store'
import { useContactSubmit } from '../use-contact-submit'

import '@/styles/founders-review.css'

/*
 * Review my offer (design: the "Review my offer · redesign" board).
 *
 * The read comes from the shared store, and only when the visitor actually
 * asked for a review (`askedAt`), so typing this URL gets the manual form. It
 * computes from the asking tool's snapshot when there is one, so the numbers
 * match the calculator they just left. Nothing is sent anywhere until Send:
 * the name, email, note, chips and toggles live in this component and are
 * gone on reload, the same as the old form.
 */

const serverNotHydrated = () => false

/* The reply-by date is today's, so it cannot be in the prerendered HTML: the
   server says "within two business days" and the browser fills in the date.
   A string snapshot compares by value, so this never loops. */
const noSubscribe = () => () => {}
const serverReplyBy = () => null

const LINKS = [
  {
    href: '/services',
    title: 'Need a CTO on call?',
    copy: 'See how an engagement works and what the first month looks like.',
    label: 'Work with me',
  },
  {
    href: '/products',
    title: 'Rather start building today?',
    copy: 'The boilerplates ship the same foundations I start my own products from.',
    label: 'Browse boilerplates',
  },
]

function SectionHead({ n, id, done, title, sub }) {
  return (
    <>
      <div className="rv-sec-head">
        <span className="rv-num" data-done={done} aria-hidden="true">
          {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
        </span>
        <h2 id={id} className="rv-h2">
          {title}
        </h2>
      </div>
      <p className="rv-sub">{sub}</p>
    </>
  )
}

/* The deadline as a radiogroup: arrow keys move and select, like ChipGroup's
   segmented variant, drawn as the board's sliding thumb. */
function Deadline({ value, onChange }) {
  const refs = useRef([])
  const index = Math.max(
    0,
    DEADLINE_OPTIONS.findIndex((option) => option.id === value)
  )
  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      event.key
    ]
    let next = null
    if (step)
      next = (index + step + DEADLINE_OPTIONS.length) % DEADLINE_OPTIONS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = DEADLINE_OPTIONS.length - 1
    if (next === null) return
    event.preventDefault()
    refs.current[next]?.focus()
    onChange(DEADLINE_OPTIONS[next].id)
  }
  return (
    <div
      className="rv-seg"
      role="radiogroup"
      aria-labelledby="rv-deadline-label"
      style={{ '--n': DEADLINE_OPTIONS.length, '--i': index }}
    >
      <span className="rv-seg-thumb" aria-hidden="true" />
      {DEADLINE_OPTIONS.map((option, i) => (
        <button
          key={option.id}
          ref={(node) => {
            refs.current[i] = node
          }}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          tabIndex={option.id === value ? 0 : -1}
          onClick={() => onChange(option.id)}
          onKeyDown={onKeyDown}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function OfferReviewForm() {
  const reduced = useReducedMotion()
  const hydrated = useSyncExternalStore(
    onHydrated,
    hasHydrated,
    serverNotHydrated
  )
  /* The whole store, so the review follows a clear from the dock. The state
     object only changes on a write, and nothing on this page writes but the
     bin. */
  const store = useOfferStore()
  const review = useMemo(
    () => (hydrated ? buildReview(store.askedRead()) : null),
    [hydrated, store]
  )
  const status = !hydrated ? 'loading' : review ? 'read' : 'none'

  const [off, setOff] = useState([])
  const [briefOn, setBriefOn] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  /* null means "the default for whatever section 1 shows", so the chips need
     no effect to follow hydration or a clear. */
  const [helpChoice, setHelpChoice] = useState(null)
  const help = helpChoice ?? defaultHelp(Boolean(review))
  const [deadline, setDeadline] = useState(DEFAULT_DEADLINE)
  const [note, setNote] = useState('')
  const [manual, setManual] = useState(MANUAL_TEMPLATE)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [sent, setSent] = useState(null)
  const sentHeading = useRef(null)

  const {
    submitting,
    error,
    captchaToken,
    setCaptchaToken,
    captchaAttempt,
    submit,
    reset,
  } = useContactSubmit()

  const composed = composeReview({
    review,
    off,
    briefOn,
    help,
    deadline,
    note,
    manual,
  })

  const readOk = review ? composed.includedCount > 0 : manualFilled(manual)
  const nameOk = nameValid(name)
  const emailOk = emailValid(email.trim())
  const captchaOk = Boolean(captchaToken)
  const ready = hydrated && readOk && nameOk && emailOk && captchaOk
  const emailBad = emailTouched && email.trim() !== '' && !emailOk
  const urgent = deadline === URGENT_DEADLINE

  const sendLabel = submitting
    ? 'Sending'
    : !captchaOk
    ? 'Complete the security check'
    : !nameOk || !emailOk
    ? 'Add your name and email'
    : !readOk
    ? // TODO(alec): not on the board, which has no label for an empty
      // read with valid contact details. Confirm the copy.
      review
      ? 'Leave at least one line ticked'
      : 'Describe the offer first'
    : 'Send for review'

  /* After the send the form unmounts, so focus would fall to <body>. Move it
     to the sent heading and bring the card into view instead. */
  useEffect(() => {
    if (!sent) return
    const heading = sentHeading.current
    heading?.focus({ preventScroll: true })
    heading?.closest('.rv-main')?.scrollIntoView?.({
      block: 'start',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [sent, reduced])

  const toggleFact = (id) =>
    setOff((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    )

  const toggleBrief = () => {
    const next = !briefOn
    setBriefOn(next)
    announceDesk(next ? 'Full brief attached' : 'Full brief left out')
  }

  const toggleHelp = (id) =>
    setHelpChoice((prev) => {
      const current = prev ?? defaultHelp(Boolean(review))
      return current.includes(id)
        ? current.filter((k) => k !== id)
        : [...current, id]
    })

  async function handleSubmit(event) {
    event.preventDefault()
    const ok = await submit({
      name: name.trim(),
      email: email.trim(),
      subject: composed.subject,
      message: composed.message,
    })
    if (ok) setSent({ email: email.trim(), replyBy: replyByDate(), urgent })
  }

  /* "Send another": a fresh widget (tokens are single-use), a cleared note
     and the default chips. The name, email, deadline, ticked lines and the
     brief toggle stay. */
  const sendAnother = () => {
    reset()
    setNote('')
    setHelpChoice(null)
    setSent(null)
  }

  /* The dock's bin: empty the shared answers, so section 1 drops to the
     manual form. The name, email, note and anything typed by hand stay; the
     line toggles belonged to the read that just went, so they reset. */
  const clearDeskAnswers = () => {
    useOfferStore.getState().clear()
    setOff([])
    setBriefOn(true)
    setPreviewOpen(false)
  }

  const todayReplyBy = useSyncExternalStore(
    noSubscribe,
    replyByDate,
    serverReplyBy
  )
  const replyBy = sent?.replyBy ?? todayReplyBy

  return (
    <div
      className="amw amw-rv relative isolate"
      data-reduced={reduced ? 'true' : undefined}
    >
      <DeskBackdrop />
      <div className="rv-wrap">
        <DeskBackLink className="mt-2" />
      </div>
      <header className="rv-wrap mt-4">
        <ReviewHero status={status} from={review?.from} />
      </header>

      <main className="rv-wrap mt-8">
        <div className="rv-grid">
          <div className="rv-main rv-card rv-rise" style={{ '--d': '.34s' }}>
            {sent ? (
              <SentState
                email={sent.email}
                replyBy={sent.replyBy}
                urgent={sent.urgent}
                onAnother={sendAnother}
                headingRef={sentHeading}
              />
            ) : (
              <form noValidate onSubmit={handleSubmit}>
                <section className="rv-sec" aria-labelledby="rv-s1">
                  {status === 'none' ? (
                    <SectionHead
                      n={1}
                      id="rv-s1"
                      done={manualFilled(manual)}
                      title="Tell me about the offer"
                      sub="The calculators fill this in for you. Without one, the blanks below are what I need."
                    />
                  ) : (
                    <SectionHead
                      n={1}
                      id="rv-s1"
                      done={Boolean(review) && composed.includedCount > 0}
                      title="Check what you are sending"
                      sub="Your read from the desk, line by line. Untick anything you would rather keep to yourself."
                    />
                  )}
                  <div className="rv-body">
                    {status === 'loading' ? (
                      <ReadSkeleton />
                    ) : review ? (
                      <ReadCard
                        review={review}
                        off={off}
                        onToggle={toggleFact}
                        briefOn={briefOn}
                        onBriefToggle={toggleBrief}
                        composed={composed}
                        previewOpen={previewOpen}
                        onPreview={() => setPreviewOpen((open) => !open)}
                      />
                    ) : (
                      <NoRead manual={manual} onManual={setManual} />
                    )}
                  </div>
                </section>

                <section className="rv-sec" aria-labelledby="rv-s2">
                  <SectionHead
                    n={2}
                    id="rv-s2"
                    done={help.length > 0}
                    title="What do you want a read on?"
                    sub="Pick what matters. It tells me where to spend the reply."
                  />
                  <div className="rv-body">
                    <div
                      className="rv-chips"
                      role="group"
                      aria-label="What do you want a read on?"
                    >
                      {HELP_OPTIONS.map((option) => {
                        const on = help.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className="rv-chip"
                            aria-pressed={on}
                            onClick={() => toggleHelp(option.id)}
                          >
                            <Check aria-hidden="true" strokeWidth={2.5} />
                            {option.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-6">
                      <span id="rv-deadline-label" className="rv-lbl">
                        When do you need to answer them?
                      </span>
                      <Deadline value={deadline} onChange={setDeadline} />
                      {urgent && (
                        // TODO(alec): "top of the pile" needs triage behind it;
                        // today urgency only reaches the subject line.
                        <p className="rv-urgent rv-step">
                          <Clock
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          This one goes to the top of the pile. Put the exact
                          deadline in the note so I can work back from it.
                        </p>
                      )}
                    </div>

                    <div className="mt-6">
                      <label htmlFor="rv-note" className="rv-lbl">
                        Anything the numbers miss <small>Optional</small>
                      </label>
                      <div className="rv-input">
                        <textarea
                          id="rv-note"
                          rows={4}
                          maxLength={NOTE_MAX}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="A competing offer, a founder you are unsure about, a deadline, a term that worries you."
                          aria-describedby="rv-note-count"
                        />
                        <span id="rv-note-count" className="rv-count">
                          {note.length} / {NOTE_MAX}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rv-sec" aria-labelledby="rv-s3">
                  <SectionHead
                    n={3}
                    id="rv-s3"
                    done={nameOk && emailOk}
                    title="Where should I reply?"
                    // TODO(alec): "No newsletter, no list." is a policy claim;
                    // the contact collection subscribes no one today. Confirm.
                    sub="Only used to answer you. No newsletter, no list."
                  />
                  <div className="rv-body">
                    <div className="rv-two">
                      <div>
                        <label htmlFor="rv-name" className="rv-lbl">
                          Name
                        </label>
                        <div className="rv-input">
                          <input
                            id="rv-name"
                            type="text"
                            name="name"
                            required
                            aria-required="true"
                            autoComplete="name"
                            placeholder="Your name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                          />
                          {nameOk && (
                            <span className="rv-ok" aria-hidden="true">
                              <Check className="size-3" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="rv-email" className="rv-lbl">
                          Email
                        </label>
                        <div className="rv-input" data-bad={emailBad}>
                          <input
                            id="rv-email"
                            type="email"
                            name="email"
                            required
                            aria-required="true"
                            aria-invalid={emailBad || undefined}
                            aria-describedby={
                              emailBad ? 'rv-email-err' : undefined
                            }
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            onBlur={() => setEmailTouched(true)}
                          />
                          {emailOk && (
                            <span className="rv-ok" aria-hidden="true">
                              <Check className="size-3" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>
                        {emailBad && (
                          <p id="rv-email-err" className="rv-err">
                            That address is missing something. Check the part
                            after the @.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* The real Turnstile widget inside the board's frame: its
                        iframe cannot be styled, so the board's mock checkbox is
                        not reproduced (fork 7). */}
                    <div className="rv-captcha">
                      <ContactCaptcha
                        key={captchaAttempt}
                        onToken={setCaptchaToken}
                      />
                      <span className="amw-kicker rv-captcha-kick">
                        Security check
                      </span>
                    </div>
                  </div>
                </section>

                {error && (
                  <p role="alert" className="rv-alert rv-step">
                    {error}
                  </p>
                )}

                <div className="rv-nav">
                  <ul
                    id="rv-ready"
                    className="rv-ready"
                    aria-label="Ready to send"
                  >
                    {[
                      ['Your read', readOk],
                      ['Name', nameOk],
                      ['Email', emailOk],
                      ['Security check', captchaOk],
                    ].map(([label, done]) => (
                      <li key={label} data-done={done}>
                        <i aria-hidden="true" />
                        {label}
                        <span className="sr-only">
                          {done ? ', done' : ', not yet'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="submit"
                    className="rv-cta rv-send"
                    disabled={!ready || submitting}
                    aria-busy={submitting}
                    aria-describedby="rv-ready"
                  >
                    <span aria-live="polite">{sendLabel}</span>
                    <span className="rv-cta-dot" aria-hidden="true">
                      <Send className="size-4" />
                    </span>
                    {submitting && (
                      <span className="rv-send-bar" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <ReviewRail sent={Boolean(sent)} replyBy={replyBy} />
        </div>

        <div className="rv-links">
          {LINKS.map((card) => (
            <Link key={card.href} href={card.href} className="rv-link">
              <span className="min-w-0">
                <span className="rv-link-title">{card.title}</span>
                <span className="rv-link-body">{card.copy}</span>
                <span className="rv-link-label">{card.label}</span>
              </span>
              <span className="rv-link-dot" aria-hidden="true">
                <ChevronRight className="size-4 relative left-px" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <FoundersDeskDock current="review" onClear={clearDeskAnswers} />
    </div>
  )
}

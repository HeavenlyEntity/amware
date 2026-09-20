'use client'

import { identity } from '@/content/site/identity'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Clock, MapPin, MessageSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'
import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import { briefForContact } from '@/lib/founders/handoff'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import { computeRead } from '@/lib/founders/equity/engine'
import { ContactCaptcha } from '@/components/ContactCaptcha'
import {
  hasHydrated,
  onHydrated,
  useOfferStore,
} from '@/lib/founders/offer-store'

/* Contact page in the "minimal" landing template's grammar: a centred
   section header, soft muted panels, template-style inputs, and the
   chevron-circle primary action. Submission still posts to
   /api/contact-submissions (Payload + Resend) and lands on /thank-you. */

const easeOut = [0.16, 1, 0.3, 1]

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease: easeOut },
}

const details = [
  {
    icon: MapPin,
    title: 'Phoenix, Arizona',
    copy: 'Remote first. I work with teams everywhere.',
  },
  {
    icon: Clock,
    title: 'Replies within two business days',
    copy: 'Mon to Fri, 9:00 am to 6:00 pm (MST).',
  },
  {
    icon: MessageSquare,
    title: 'Every message reaches me',
    copy: 'No forms into the void. I read and answer each one myself.',
  },
]

const socialLinks = [
  {
    label: 'Follow on X',
    icon: TwitterIcon,
    href: 'https://x.com/AmwareDotDev',
  },
  {
    label: 'Follow on LinkedIn',
    icon: LinkedInIcon,
    href: identity.linkedin,
  },
  {
    label: 'Follow on GitHub',
    icon: GitHubIcon,
    href: 'https://github.com/HeavenlyEntity',
  },
]

const fieldClasses =
  'border-[var(--amw-line-strong)] bg-[var(--amw-card)] focus:border-[var(--amw-accent)] focus:ring-[var(--amw-accent)]/20 w-full min-w-0 appearance-none rounded-md border px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:text-sm'

function Field({ id, label, hint, required, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {label}
        {required && (
          <span
            className="text-[var(--amw-accent-ink)] ml-1"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {hint}
        </p>
      )}
    </div>
  )
}

/* Copy variants per entry point. `offer-review` is the Founders' Desk
   CTA: it acknowledges the tool and prefills a template with blanks; no
   calculator value is ever passed here. */
const TOPICS = {
  default: {
    eyebrow: 'OPEN A LINE',
    title: 'Let’s Talk Shop',
    lead: 'A question, a proposal, or just a hello. Send it over and I will get back to you.',
    subject: undefined,
    message: undefined,
    ack: null,
  },
  'offer-review': {
    eyebrow: 'OFFER REVIEW',
    title: 'Get a read on your offer',
    lead: 'Your read from the Founders’ Desk is already in the message. Add your name and email, change anything, and send.',
    subject: 'Offer review',
    message: [
      'Role and seat: ',
      'Stage (last closed round): ',
      'Joining as (formation / converting from fractional / hired after): ',
      'Offered equity (% fully diluted, or option count / FD shares): ',
      'Salary vs market: ',
      'Company’s stated exit path: ',
      'The read the calculator gave me: ',
      '',
      'What I want help with: ',
    ].join('\n'),
    ack: 'Prefilled from your read. Your answers stay in this browser. Edit anything before you send.',
  },
}

export default function ContactForm({ topic = 'default' }) {
  const copy = TOPICS[topic] ?? TOPICS.default
  const router = useRouter()
  const [subject, setSubject] = useState(copy.subject ?? '')
  const [message, setMessage] = useState(copy.message ?? '')

  /* The calculator's CTA stashes a filled brief for this device only;
     take it once so the form arrives with the values, never a blank
     template. A plain visit keeps the template with blanks. */
  /* Prefill from the shared store rather than a second stash of the same data
     (design review D6). `askedAt` is the intent signal: it is set when the user
     clicks a review CTA, so typing this URL directly still gets an empty form.
     The store persists to sessionStorage and hydrates after mount, so wait for
     that rather than reading defaults on the first paint. */
  useEffect(() => {
    if (topic !== 'offer-review') return undefined
    const fill = () => {
      const s = useOfferStore.getState()
      if (!s.askedAt) return
      try {
        const filled = briefForContact(computeRead(s.inputs()))
        setSubject(filled.subject)
        setMessage(filled.message)
      } catch {
        /* leave the template in place rather than clearing what they can see */
      }
    }
    if (hasHydrated()) {
      fill()
      return undefined
    }
    return onHydrated(fill)
  }, [topic])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAttempt, setCaptchaAttempt] = useState(0)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!captchaToken) {
      setError(
        'Please complete the security check before sending your message.'
      )
      return
    }
    setSubmitting(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      subject: form.get('subject'),
      message: form.get('message'),
    }

    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-turnstile-token': captchaToken,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submission failed')

      /* Reported here, in the success handler, not on /thank-you: that page
         is also where the newsletter lands, and a page cannot tell which
         form sent someone to it. Payload returns the created row, and its id
         is the event id, so a retried send is one lead rather than two.
         Fired before the navigation on purpose -- Whop sends with keepalive,
         and a client-side route change cancels nothing anyway. */
      const created = await res.json().catch(() => null)
      const submissionId = created?.doc?.id
      whopTrack(WHOP_EVENT.lead, {
        event_id: submissionId ? `contact_${submissionId}` : undefined,
        name: payload.name ? String(payload.name) : undefined,
        email: payload.email ? String(payload.email) : undefined,
      })
      router.push('/thank-you')
    } catch {
      // Tokens are single-use, including when a later step in the request fails.
      setCaptchaToken('')
      setCaptchaAttempt((value) => value + 1)
      setError(
        'Your message did not send. Check your connection and try again; nothing you typed was lost.'
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="amw">
      <section className="min-[400px]:px-6 px-0 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-12 text-center md:mb-16" {...fadeInUp}>
            <SectionEyebrow index="00" label={copy.eyebrow} />
            <h1
              style={{ fontFamily: 'Layer, sans-serif' }}
              className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
            >
              {copy.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              {copy.lead}
            </p>
            {copy.ack && <p className="amw-kicker mt-4">{copy.ack}</p>}
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
            {/* Details column */}
            <div className="flex flex-col gap-4 md:gap-6">
              {details.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    className="bg-[var(--amw-muted)] flex gap-4 rounded-2xl p-6"
                    {...fadeInUp}
                    transition={{ ...fadeInUp.transition, delay: index * 0.1 }}
                  >
                    <span
                      className="border-[var(--amw-line)] bg-[var(--amw-card)] text-[var(--amw-accent-ink)] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h2 className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {item.copy}
                      </p>
                    </div>
                  </motion.div>
                )
              })}

              <motion.div
                className="bg-[var(--amw-muted)] flex items-center justify-between gap-4 rounded-2xl p-6"
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: 0.3 }}
              >
                <p className="amw-kicker">Elsewhere</p>
                <div className="flex items-center gap-3">
                  {socialLinks.map(({ label, icon: Icon, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:bg-[var(--amw-accent)] hover:text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/10 text-zinc-800 transition-all duration-300 hover:scale-110 motion-reduce:hover:scale-100 dark:bg-white/10 dark:text-zinc-200"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4 fill-current" />
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Form column */}
            <motion.form
              onSubmit={handleSubmit}
              className="bg-[var(--amw-muted)] min-[400px]:px-6 rounded-2xl px-2 py-6 md:p-8"
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.1 }}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field id="contact-name" label="Name" required>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className={fieldClasses}
                  />
                </Field>
                <Field id="contact-email" label="Email" required>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={fieldClasses}
                  />
                </Field>
              </div>

              <div className="mt-6">
                <Field id="contact-subject" label="Subject">
                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="What is this about?"
                    className={fieldClasses}
                  />
                </Field>
              </div>

              <div className="mt-6">
                <Field
                  id="contact-message"
                  label="Message"
                  required
                  hint="A sentence or two on what you are building, and where you are stuck, is plenty."
                >
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={message ? 14 : 6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    aria-describedby="contact-message-hint"
                    placeholder="Tell me a little about it"
                    className={`${fieldClasses} resize-y`}
                  />
                </Field>
              </div>

              <ContactCaptcha key={captchaAttempt} onToken={setCaptchaToken} />

              {error && (
                <p
                  role="alert"
                  className="mt-6 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400"
                >
                  {error}
                </p>
              )}

              <div className="mt-8 flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You will get a confirmation by email right away.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !captchaToken}
                  aria-busy={submitting}
                  className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:rounded-md disabled:hover:shadow-none sm:w-auto"
                >
                  <span aria-live="polite">
                    {submitting
                      ? 'Sending'
                      : captchaToken
                      ? 'Send Message'
                      : 'Complete CAPTCHA to Send'}
                  </span>
                  <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 group-disabled:scale-100 dark:bg-zinc-900 dark:text-zinc-50">
                    <ChevronRight
                      className={`relative left-px h-4 w-4 ${
                        submitting ? 'animate-pulse' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </div>
            </motion.form>
          </div>

          {/* Other ways in, in the template's link-card language. */}
          <motion.div
            className="mt-6 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-2"
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.2 }}
          >
            {[
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
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="border-[var(--amw-line)] bg-[var(--amw-card)] hover:border-[var(--amw-accent)] group flex items-center justify-between gap-6 rounded-2xl border p-6 no-underline transition-colors duration-300"
              >
                <div>
                  <h2 className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {card.copy}
                  </p>
                  <p className="text-[var(--amw-accent-ink)] mt-3 text-sm font-medium">
                    {card.label}
                  </p>
                </div>
                <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                  <ChevronRight
                    className="relative left-px h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}

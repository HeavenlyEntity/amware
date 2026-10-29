'use client'

import { useCallback, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'

import { ContactCaptcha } from '@/components/ContactCaptcha'
import { PACES, TRACKS } from '@/content/site/courses'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  const d = 28 + (i % 3) * 8
  return {
    '--x': `${Math.round(Math.cos(a) * d)}px`,
    '--y': `${Math.round(Math.sin(a) * d)}px`,
    '--r': `${i * 47}deg`,
    '--dl': `${(i % 4) * 0.03}s`,
    background: i % 2 ? '#3ce8ce' : '#a7f3d0',
  }
})

/* The waitlist posts to the contact form's endpoint, so sign-ups land in
   contact-submissions. That endpoint requires a Turnstile token, so the
   same security check sits under the field. The success state (and its
   burst) only shows after the request succeeds. */
export function CourseWaitlist({ track, pace }) {
  const t = TRACKS[track]
  const [email, setEmail] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [status, setStatus] = useState('idle')
  /* What was filed, so the confirmation doesn't follow later changes to
     the track cards. */
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAttempt, setCaptchaAttempt] = useState(0)
  const onToken = useCallback((token) => setCaptchaToken(token), [])

  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    const address = email.trim()
    if (!EMAIL.test(address)) {
      setInvalid(true)
      return
    }
    if (!captchaToken) {
      setError('Complete the security check, then join the waitlist.')
      return
    }
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/contact-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-turnstile-token': captchaToken,
        },
        body: JSON.stringify({
          /* The form only asks for an email, and the collection requires a
             name, so the address stands in for it. */
          name: address,
          email: address,
          subject: `Courses waitlist · ${t.name} · ${PACES[pace].label}`,
          message: `Waitlist sign-up for Secure the Stack: ${t.name} track, ${PACES[pace].label} pace (${PACES[pace].total}).`,
        }),
      })
      if (!res.ok) {
        /* Payload explains security-check failures (400, 503); show that
           rather than blaming the connection. */
        const body = await res.json().catch(() => null)
        throw new Error(body?.errors?.[0]?.message || '')
      }
      setSent({ trackName: t.name, email: address })
      setStatus('sent')
    } catch (err) {
      /* Turnstile tokens are single-use, even when a later step fails. */
      setCaptchaToken('')
      setCaptchaAttempt((n) => n + 1)
      setError(
        err instanceof Error && err.message
          ? `Your sign-up did not send: ${err.message}`
          : 'Your sign-up did not send. Check your connection and try again; your email is still here.'
      )
      setStatus('idle')
    }
  }

  const reset = () => {
    setEmail('')
    setStatus('idle')
    setCaptchaToken('')
    setCaptchaAttempt((n) => n + 1)
  }

  if (status === 'sent' && sent) {
    return (
      <div className="co-wl grid gap-3">
        <div className="co-done co-pop" role="status">
          <i className="co-burst" aria-hidden="true">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {BURST.map((style, i) => (
              <i key={i} style={style} />
            ))}
          </i>
          <span>
            You&apos;re on the list for <b>{sent.trackName}</b>. We&apos;ll
            email {sent.email} when the cohort opens.
          </span>
        </div>
        <button type="button" className="co-reset" onClick={reset}>
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form className="co-wl" onSubmit={submit} noValidate>
      <div className="co-wl-in">
        <div>
          <p className="co-wl-title" aria-live="polite">
            Join the waitlist · {t.name}
          </p>
          <p className="co-wl-copy">
            You&apos;ll hear first when the cohort opens. Module 1 ships first.
          </p>
          <input
            type="email"
            name="email"
            className="co-field"
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setInvalid(false)
            }}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'co-wl-err' : undefined}
          />
          {invalid && (
            <p id="co-wl-err" className="co-err">
              Enter an email address like name@example.com.
            </p>
          )}
        </div>
        <button
          type="submit"
          className="pj-btn pj-btn--across"
          disabled={status === 'sending'}
          aria-busy={status === 'sending'}
        >
          <span>{status === 'sending' ? 'Sending…' : t.cta}</span>
          <span className="pj-btn-dot">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>
      <ContactCaptcha key={captchaAttempt} onToken={onToken} />
      {error && (
        <p role="alert" className="co-err">
          {error}
        </p>
      )}
    </form>
  )
}

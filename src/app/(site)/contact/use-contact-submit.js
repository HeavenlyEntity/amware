'use client'

import { useCallback, useRef, useState } from 'react'

import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/*
 * The one send path for every contact surface: /contact, /contact/enterprise
 * and the offer review. It owns the Turnstile token, the widget's remount key,
 * the POST to Payload's contact collection, the Whop `lead`, and the error
 * copy, so the forms differ only in what they collect and where they land.
 *
 * The payload is always `{ name, email, subject, message }`, the four fields
 * `ContactSubmissions` accepts. Anything a form adds (the review's deadline
 * and help chips) is folded into `subject` and `message` before it gets here,
 * so no column or server field changes.
 */

export const CAPTCHA_REQUIRED =
  'Please complete the security check before sending your message.'

export const SEND_FAILED =
  'Your message did not send. Check your connection and try again; nothing you typed was lost.'

/**
 * @param {{ onSuccess?: (result: { id: unknown }) => void }} options
 *   Called after the lead is reported. `submitting` stays true afterwards, so
 *   a page that navigates away never flashes an enabled button; a page that
 *   stays calls `reset()` before taking another send.
 */
export function useContactSubmit({ onSuccess } = {}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAttempt, setCaptchaAttempt] = useState(0)
  /* Set synchronously, so a second submit fired before the re-render (a
     double Enter) cannot reuse the spent token. */
  const inFlight = useRef(false)

  /* Tokens are single-use, so every retry needs a fresh widget: clear the
     token and bump the key the widget is mounted under. */
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('')
    setCaptchaAttempt((value) => value + 1)
  }, [])

  /** Ready for another send: a fresh widget, no error, not submitting. */
  const reset = useCallback(() => {
    resetCaptcha()
    setError(null)
    setSubmitting(false)
    inFlight.current = false
  }, [resetCaptcha])

  const submit = useCallback(
    async (payload) => {
      if (submitting || inFlight.current) return false
      if (!captchaToken) {
        setError(CAPTCHA_REQUIRED)
        return false
      }
      inFlight.current = true
      setSubmitting(true)
      setError(null)

      let submissionId
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
           Fired before the page moves on purpose -- Whop sends with
           keepalive, and a client-side route change cancels nothing anyway. */
        const created = await res.json().catch(() => null)
        submissionId = created?.doc?.id
        whopTrack(WHOP_EVENT.lead, {
          event_id: submissionId ? `contact_${submissionId}` : undefined,
          name: payload.name ? String(payload.name) : undefined,
          email: payload.email ? String(payload.email) : undefined,
        })
      } catch {
        // Tokens are single-use, including when a later step in the request fails.
        resetCaptcha()
        setError(SEND_FAILED)
        setSubmitting(false)
        inFlight.current = false
        return false
      }
      /* The token is spent; never leave it in state for a later send. The
         widget itself is replaced by `reset()` when the page takes another. */
      setCaptchaToken('')
      /* Outside the try: the row exists and the lead is reported, so nothing
         the page does next may be mistaken for a failed send. */
      onSuccess?.({ id: submissionId })
      return true
    },
    [submitting, captchaToken, onSuccess, resetCaptcha]
  )

  return {
    submitting,
    error,
    captchaToken,
    setCaptchaToken,
    captchaAttempt,
    submit,
    reset,
  }
}

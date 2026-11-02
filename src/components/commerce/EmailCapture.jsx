'use client'

import { useCallback, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'

import { ContactCaptcha } from '@/components/ContactCaptcha'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

class ServerMessage extends Error {}

/* One-field email capture for the kit waitlists and the Red Flags checklist.
   It posts to the contact form's endpoint, so every sign-up lands in
   contact-submissions with the subject that routes its mail (see
   src/lib/contact-intents.js). The address stands in for the name, which the
   collection requires. The success state only shows after the request
   succeeds. `successMessage` is a string or a function of the address. */
export function EmailCapture({
  subject,
  message,
  cta,
  note,
  successMessage,
  idPrefix,
  onSuccess,
}) {
  const [email, setEmail] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [status, setStatus] = useState('idle')
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAttempt, setCaptchaAttempt] = useState(0)
  const onToken = useCallback((token) => setCaptchaToken(token), [])
  const errId = `${idPrefix}-err`

  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    const address = email.trim()
    if (!EMAIL.test(address)) {
      setInvalid(true)
      return
    }
    if (!captchaToken) {
      setError('Complete the security check, then try again.')
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
          name: address,
          email: address,
          subject,
          message,
        }),
      })
      if (!res.ok) {
        /* Payload explains security-check and mail failures; show that
           rather than blaming the connection. */
        const body = await res.json().catch(() => null)
        throw new ServerMessage(body?.errors?.[0]?.message || '')
      }
      setSentTo(address)
      setStatus('sent')
      onSuccess?.(address)
    } catch (err) {
      /* Turnstile tokens are single-use, even when a later step fails. */
      setCaptchaToken('')
      setCaptchaAttempt((n) => n + 1)
      /* A thrown fetch failure is a network error whose message is the
         browser's ("Failed to fetch"); only a server explanation, carried by
         ServerMessage, is worth showing. */
      setError(
        err instanceof ServerMessage && err.message
          ? `Your email did not send: ${err.message}`
          : 'Your email did not send. Check your connection and try again; your address is still here.'
      )
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-3 rounded-xl bg-[#3ce8ce]/[0.08] px-3.5 py-3 text-sm text-zinc-300 shadow-[inset_0_0_0_1px_rgba(60,232,206,0.3)]"
      >
        <i className="text-zinc-950 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3ce8ce]">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </i>
        <span>
          {typeof successMessage === 'function'
            ? successMessage(sentTo)
            : successMessage}
        </span>
      </div>
    )
  }

  const sending = status === 'sending'
  return (
    <form onSubmit={submit} noValidate>
      <div className="mt-4 flex gap-2">
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setInvalid(false)
          }}
          aria-invalid={invalid}
          aria-describedby={invalid ? errId : undefined}
          className="aria-[invalid=true]:shadow-[inset_0_0_0_1px_#f87171] h-11 min-w-0 flex-1 rounded-[10px] border-0 bg-[#0b0b0f] px-3.5 text-[15px] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] outline-none transition-shadow placeholder:text-zinc-500 focus:shadow-[inset_0_0_0_1px_#3ce8ce,0_0_0_4px_rgba(60,232,206,0.14)]"
        />
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className="min-h-11 text-zinc-950 group inline-flex items-center gap-2 whitespace-nowrap rounded-full border-0 bg-[#3ce8ce] px-4 text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#3ce8ce] disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {sending ? 'Sending…' : cta}
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        </button>
      </div>
      {invalid && (
        <p id={errId} className="mt-2 text-[13px] text-red-300">
          Enter an email address like name@company.com.
        </p>
      )}
      {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
      <ContactCaptcha key={captchaAttempt} onToken={onToken} tone="dark" />
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-red-300">
          {error}
        </p>
      )}
    </form>
  )
}

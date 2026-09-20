'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'

export function ContactCaptcha({ onToken }) {
  const container = useRef(null)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('loading')
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const handleReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    if (!siteKey || ready) return
    const timeout = setTimeout(
      () => setStatus((current) => (current === 'loading' ? 'error' : current)),
      20000
    )
    return () => clearTimeout(timeout)
  }, [siteKey, ready, attempt])

  useEffect(() => {
    if (!ready || !siteKey || !window.turnstile || !container.current) return
    const turnstile = window.turnstile
    let widget
    try {
      widget = turnstile.render(container.current, {
        sitekey: siteKey,
        action: 'contact',
        size: 'normal',
        theme: 'auto',
        'response-field': false,
        callback: (token) => {
          onToken(token)
          setStatus('verified')
        },
        'expired-callback': () => {
          onToken('')
          setStatus('loading')
        },
        'error-callback': () => {
          onToken('')
          setStatus('error')
        },
        'timeout-callback': () => {
          onToken('')
          setStatus('error')
        },
      })
    } catch {
      onToken('')
      // Surface a synchronous failure from the external widget API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error')
    }
    return () => {
      if (widget !== undefined) turnstile.remove(widget)
    }
  }, [ready, siteKey, attempt, onToken])

  const failed = !siteKey || status === 'error'
  return (
    <div className="mt-6">
      {siteKey && (
        <Script
          id="cloudflare-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={handleReady}
          onError={() => {
            onToken('')
            setStatus('error')
          }}
        />
      )}
      <div ref={container} className="min-h-[65px]" />
      {failed && (
        <p
          role="alert"
          className="mt-2 text-xs text-zinc-600 dark:text-zinc-400"
        >
          The security check could not load. Please try again or refresh the
          page.
        </p>
      )}
      {failed && siteKey && (
        <button
          type="button"
          className="min-h-11 mt-2 px-2 text-sm underline"
          onClick={() => {
            onToken('')
            setStatus('loading')
            if (!window.turnstile) {
              window.location.reload()
              return
            }
            setAttempt((value) => value + 1)
          }}
        >
          Retry security check
        </button>
      )}
    </div>
  )
}

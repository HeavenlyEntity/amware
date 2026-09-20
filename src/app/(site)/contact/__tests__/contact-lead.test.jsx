import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'

import ContactForm from '../ContactForm'

/* The contact form is the site's lead form. What matters here is only that
   a successful send reaches the pixel as one `lead`, carrying the id Payload
   assigned so a retry cannot become a second lead, and that a failed send
   reaches it as nothing. */

let track
let challenge

vi.mock('next/script', () => ({
  default: function Script({ onReady }) {
    useEffect(() => {
      onReady()
    }, [onReady])
    return null
  },
}))

beforeEach(() => {
  track = vi.fn()
  window.whop = { track }
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key')
  window.turnstile = {
    render: (_container, options) => {
      challenge = options
      options.callback('verified-token')
      return 'widget'
    },
    remove: vi.fn(),
  }
})

afterEach(() => {
  delete window.whop
  delete window.turnstile
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function fill() {
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'Ada Lovelace' },
  })
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'ada@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/subject/i), {
    target: { value: 'Hello' },
  })
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: 'A question.' },
  })
}

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: /send/i }))

describe('ContactForm lead event', () => {
  it.each(['expired-callback', 'error-callback', 'timeout-callback'])(
    'blocks stale verification after %s',
    async (callback) => {
      vi.stubGlobal('fetch', vi.fn())
      render(<ContactForm />)
      fill()
      act(() => challenge[callback]())
      submit()
      expect(fetch).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
      expect(screen.getByLabelText(/message/i)).toHaveValue('A question.')
    }
  )

  it('blocks a submission until verification finishes', async () => {
    window.turnstile.render = () => 'widget'
    vi.stubGlobal('fetch', vi.fn())
    render(<ContactForm />)
    fill()
    submit()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('reports one lead with the submission id, name and email on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ doc: { id: 42 } }),
      })
    )
    render(<ContactForm />)
    fill()
    submit()

    await waitFor(() => expect(track).toHaveBeenCalledTimes(1))
    expect(fetch.mock.calls[0][1].headers['x-turnstile-token']).toBe(
      'verified-token'
    )
    expect(track).toHaveBeenCalledWith('lead', {
      event_id: 'contact_42',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })
  })

  it('still reports the lead when the response body is not readable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('no body')
        },
      })
    )
    render(<ContactForm />)
    fill()
    submit()

    await waitFor(() => expect(track).toHaveBeenCalledTimes(1))
    const [, data] = track.mock.calls[0]
    expect(data).not.toHaveProperty('event_id')
    expect(data).toMatchObject({ email: 'ada@example.com' })
  })

  it('reports nothing when the send fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(<ContactForm />)
    fill()
    submit()

    await screen.findByText(/did not send/i)
    expect(track).not.toHaveBeenCalled()
    await waitFor(() => expect(window.turnstile.remove).toHaveBeenCalled())
    expect(screen.getByLabelText(/message/i)).toHaveValue('A question.')
  })
})

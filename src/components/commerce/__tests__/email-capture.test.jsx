import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

/* The Turnstile widget needs Cloudflare's script. The stub hands over a
   token on request, and counts mounts so a test can see the widget being
   remounted for a fresh single-use token. */
const captcha = vi.hoisted(() => ({ mounts: 0, empty: false }))
vi.mock('@/components/ContactCaptcha', async () => {
  const React = await import('react')
  return {
    ContactCaptcha: ({ onToken }) => {
      React.useEffect(() => {
        captcha.mounts += 1
        onToken(captcha.empty ? '' : `tok-${captcha.mounts}`)
      }, [onToken])
      return <div data-testid="captcha" />
    },
  }
})

import { EmailCapture } from '@/components/commerce/EmailCapture'

const props = {
  subject: 'Red Flags checklist',
  message: 'Red Flags checklist request.',
  cta: 'Send it',
  note: 'One email with the PDF.',
  successMessage: 'On its way.',
  idPrefix: 'gd-rf',
}

const fill = (value) =>
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value },
  })
const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /send it/i }))

beforeEach(() => {
  captcha.mounts = 0
  captcha.empty = false
  vi.stubGlobal('fetch', vi.fn())
})

describe('EmailCapture', () => {
  it('rejects a malformed address before any request', () => {
    render(<EmailCapture {...props} />)
    fill('not-an-email')
    submit()
    expect(
      screen.getByText('Enter an email address like name@company.com.')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts the contact body shape with the Turnstile token', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const onSuccess = vi.fn()
    render(<EmailCapture {...props} onSuccess={onSuccess} />)
    fill(' ada@example.com ')
    submit()
    await screen.findByText('On its way.')
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/contact-submissions')
    expect(init.method).toBe('POST')
    expect(init.headers['x-turnstile-token']).toBe('tok-1')
    expect(JSON.parse(init.body)).toEqual({
      name: 'ada@example.com',
      email: 'ada@example.com',
      subject: 'Red Flags checklist',
      message: 'Red Flags checklist request.',
    })
    expect(onSuccess).toHaveBeenCalledWith('ada@example.com')
  })

  it('shows the success message on success', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    expect(await screen.findByText('On its way.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
  })

  it('shows a real error and no success when the server returns 500', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [{ message: 'We could not send it.' }] }),
    })
    const onSuccess = vi.fn()
    render(<EmailCapture {...props} onSuccess={onSuccess} />)
    fill('ada@example.com')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not send it.'
    )
    expect(screen.queryByText('On its way.')).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'ada@example.com'
    )
  })

  it('shows a connection error when the request itself fails', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/check your connection/i)
    expect(alert).not.toHaveTextContent(/failed to fetch/i)
    expect(screen.queryByText('On its way.')).not.toBeInTheDocument()
  })

  it('falls back to a generic error when the 500 body is not JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    })
    render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not send/i)
    expect(screen.queryByText('On its way.')).not.toBeInTheDocument()
  })

  it('discards the used token after a failure and sends a fresh one on retry', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    await screen.findByRole('alert')
    /* The widget is remounted, which issues tok-2. */
    await waitFor(() => expect(captcha.mounts).toBe(2))
    submit()
    await screen.findByText('On its way.')
    expect(fetch.mock.calls[0][1].headers['x-turnstile-token']).toBe('tok-1')
    expect(fetch.mock.calls[1][1].headers['x-turnstile-token']).toBe('tok-2')
  })

  it('asks for the security check when no token has arrived', () => {
    captcha.empty = true
    render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    expect(screen.getByRole('alert')).toHaveTextContent(/security check/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ignores a second click while a request is in flight', async () => {
    let resolve
    fetch.mockReturnValue(new Promise((r) => (resolve = r)))
    const { container } = render(<EmailCapture {...props} />)
    fill('ada@example.com')
    submit()
    fireEvent.submit(container.querySelector('form'))
    expect(screen.getByRole('button')).toHaveTextContent('Sending…')
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve({ ok: true, json: async () => ({}) })
    await screen.findByText('On its way.')
  })
})

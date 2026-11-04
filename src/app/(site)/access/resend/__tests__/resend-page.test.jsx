import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

/* The action has its own tests in resendLink.test.js. Here it is a stand-in,
   so what is checked is the page: its words by intent, the hidden field that
   carries the intent, and that every answer is shown as the action gave it. */
const resendLink = vi.fn()
vi.mock('@/lib/commerce/resendLink', () => ({
  resendLink: (...args) => resendLink(...args),
}))

import ResendPage from '../page'

const renderPage = async (searchParams) =>
  render(
    await ResendPage({
      searchParams: Promise.resolve(searchParams),
    })
  )

const send = async (email = 'jane@acme.com') => {
  fireEvent.change(screen.getByLabelText('Email you bought with'), {
    target: { value: email },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send link' }))
  })
}

beforeEach(() => {
  resendLink.mockReset()
  resendLink.mockResolvedValue({ done: true, error: null })
})

describe('Resend page', () => {
  it('keeps its plain words without an intent', async () => {
    await renderPage({})
    expect(
      screen.getByRole('heading', { level: 1, name: 'Resend your access link' })
    ).toBeInTheDocument()
    expect(document.querySelector('input[name="intent"]')).toBeNull()
  })

  it('talks about upgrading with intent=upgrade', async () => {
    await renderPage({ intent: 'upgrade' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Upgrade your license' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Enter the email you bought with, and I'll send your license page."
      )
    ).toBeInTheDocument()
  })

  it('sends the intent with the form', async () => {
    await renderPage({ intent: 'upgrade' })
    await send()
    const formData = resendLink.mock.calls[0][1]
    expect(formData.get('intent')).toBe('upgrade')
    expect(formData.get('email')).toBe('jane@acme.com')
  })

  it.each([[{ intent: 'gold' }], [{ intent: ['upgrade', 'x'] }]])(
    'reads only a known intent from the URL: %j',
    async (query) => {
      await renderPage(query)
      const upgrading = Boolean(document.querySelector('input[name="intent"]'))
      expect(upgrading).toBe(query.intent[0] === 'upgrade')
    }
  )

  it('shows one confirmation, which says nothing about what was found', async () => {
    await renderPage({})
    await send()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/if that email has a purchase/i)
    expect(status.textContent).not.toMatch(/not found|no purchase|unknown/i)
  })

  it('shows the same confirmation for any address', async () => {
    await renderPage({})
    await send('known@acme.com')
    const first = screen.getByRole('status').textContent
    await send('nobody@nowhere.test')
    expect(screen.getByRole('status').textContent).toBe(first)
  })

  it('shows a retry as an alert, not the confirmation', async () => {
    resendLink.mockResolvedValue({
      done: false,
      error: 'I could not look that up just now. Please try again in a moment.',
    })
    await renderPage({})
    await send()
    expect(screen.getByRole('alert')).toHaveTextContent(/try again/i)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

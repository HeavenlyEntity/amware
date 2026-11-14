import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))
/* Turnstile needs Cloudflare's script; the stub hands over a token. */
vi.mock('@/components/ContactCaptcha', async () => {
  const React = await import('react')
  return {
    ContactCaptcha: ({ onToken }) => {
      React.useEffect(() => onToken('tok'), [onToken])
      return null
    },
  }
})
const track = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/whop', async (load) => ({
  ...(await load()),
  whopTrack: track,
}))

import { AiSearchChecklist } from '../ai-search-checklist'
import { AI_SEARCH_CHECKLIST } from '@/content/site/ai-search-checklist'
import { AI_SEARCH_CHECKLIST_SUBJECT } from '@/lib/contact-intents'

/* The Build & support freebie as a visitor meets it: the checklist and its
   five steps, one email field, and the intro call only once the PDF is on
   its way. */

const booking = { link: 'amware/intro-call', namespace: 'intro-call' }

const send = async (address = 'ada@example.com') => {
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: address },
  })
  fireEvent.click(screen.getByRole('button', { name: /send it/i }))
  await screen.findByRole('status')
}

beforeEach(() => {
  track.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ doc: { id: 7 } }) }))
  )
})

describe('AiSearchChecklist', () => {
  it('offers the checklist and its five steps, with no call yet', () => {
    render(<AiSearchChecklist booking={booking} />)
    expect(
      screen.getByRole('heading', { name: AI_SEARCH_CHECKLIST.title })
    ).toBeInTheDocument()
    const steps = screen.getByRole('list', { name: 'The five steps' })
    expect(steps.querySelectorAll('li')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /intro call/i })).toBeNull()
  })

  it('posts the sign-up under the checklist subject', async () => {
    render(<AiSearchChecklist booking={booking} />)
    await send()
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/contact-submissions')
    expect(JSON.parse(init.body)).toMatchObject({
      email: 'ada@example.com',
      subject: AI_SEARCH_CHECKLIST_SUBJECT,
      message: AI_SEARCH_CHECKLIST.form.message,
    })
    expect(track).toHaveBeenCalledWith(
      'lead',
      expect.objectContaining({
        email: 'ada@example.com',
        event_id: 'checklist_7',
      })
    )
  })

  it('offers the intro call once the PDF is on its way', async () => {
    render(<AiSearchChecklist booking={booking} />)
    await send()
    expect(screen.getByRole('status')).toHaveTextContent(
      'On its way to ada@example.com.'
    )
    const cta = await screen.findByRole('button', {
      name: /book a free intro call/i,
    })
    expect(cta).toHaveAttribute('data-cal-link', 'amware/intro-call')
    expect(cta).toHaveAttribute('data-cal-namespace', 'intro-call-checklist')
  })

  it('falls back to the contact form without a Cal.com link', async () => {
    render(<AiSearchChecklist booking={null} />)
    await send()
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /book a free intro call/i })
      ).toHaveAttribute('href', '/contact')
    )
  })

  it('keeps the call hidden when the sign-up fails', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => null })
    render(<AiSearchChecklist booking={booking} />)
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send it/i }))
    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: /intro call/i })).toBeNull()
    expect(track).not.toHaveBeenCalled()
  })
})

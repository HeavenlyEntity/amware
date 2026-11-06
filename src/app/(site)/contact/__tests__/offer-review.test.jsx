import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { useEffect } from 'react'

import ContactForm from '../ContactForm'
import OfferReviewForm from '../offer-review/OfferReviewForm'
import { EXAMPLE } from '@/lib/founders/equity/benchmarks'
import { INITIAL, useOfferStore } from '@/lib/founders/offer-store'
import { exampleStorePatch } from '@/lib/founders/worked-example'

/* The offer review (/contact/offer-review), split off the general contact
   form. Ports the old prefill suite (plan tests 32 and 33) and the lead suite
   onto the new form, and checks the split left /contact alone. */

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/contact/offer-review',
  useSearchParams: () => new URLSearchParams(),
}))

/* The desk's WebGL pieces belong to the desk build and have no canvas in
   jsdom; the page only has to mount them. */
vi.mock('@/components/founders/desk/desk-backdrop', () => ({
  DeskBackdrop: () => null,
}))
vi.mock('@/components/founders/desk/glass-panel', () => ({
  GlassPanel: ({ children }) => <div>{children}</div>,
}))

vi.mock('next/script', () => ({
  default: function Script({ onReady }) {
    useEffect(() => {
      onReady()
    }, [onReady])
    return null
  },
}))

let track
let challenge
let renders

beforeEach(() => {
  useOfferStore.setState({ ...INITIAL })
  push.mockReset()
  track = vi.fn()
  renders = 0
  window.whop = { track }
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key')
  window.turnstile = {
    render: (_container, options) => {
      renders += 1
      challenge = options
      options.callback(`verified-token-${renders}`)
      return `widget-${renders}`
    },
    remove: vi.fn(),
  }
})

afterEach(() => {
  delete window.whop
  delete window.turnstile
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const asked = () => new Date().toISOString()

/* The dock's worked example (store keys only) plus a real ask. */
const seedFromEquity = ({ snapshot = true } = {}) => {
  useOfferStore.setState({ ...exampleStorePatch() })
  if (snapshot) {
    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
  } else {
    useOfferStore.getState().markAsked()
  }
}

/* The drawer is inert while closed, so the query reaches into it. */
const preview = () =>
  screen.getByRole('region', { name: 'The message as sent', hidden: true })

const sendButton = () =>
  screen.getAllByRole('button').find((button) => button.type === 'submit')

function fillContact() {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Ada Lovelace' },
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  })
}

const submit = () => fireEvent.submit(sendButton().closest('form'))

const okFetch = (id = 42) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ doc: { id } }) })

describe('prefill only after a real ask (test 32)', () => {
  it('shows the read the equity calculator showed, from its snapshot', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    expect(
      screen.getByText('Prefilled from your equity read')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/stays in this browser until you send/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Check what you are sending' })
    ).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Benchmark band 8.5 to 15.5 percent; offered 3 percent',
      })
    ).toBeInTheDocument()
    expect(preview().textContent).toContain('Ask for 12.')
    expect(preview().textContent).not.toContain('Ask for 13.')
  })

  it('falls back to the shared answers when an ask carries no snapshot', () => {
    seedFromEquity({ snapshot: false })
    render(<OfferReviewForm />)
    expect(screen.getByText('13%')).toBeInTheDocument()
  })

  it('fills every line with a value, and the subject from the seat', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    const text = preview().textContent
    expect(text).toContain('Role and seat: CTO')
    expect(text).toContain('Stage (last closed round): pre-seed')
    expect(text).toMatch(/Offered equity: [\d.]+%/)
    expect(text).toMatch(/Salary vs market: \$\d+k offered vs \$\d+k market/)
    expect(text).toMatch(/The read: .+, range [\d.]+–[\d.]+%/)
    expect(text).toContain('--- Full brief ---')
    expect(
      screen.getByText('Subject · Offer review: CTO at pre-seed')
    ).toBeInTheDocument()
  })

  it('follows the store, so a different seat produces a different brief', () => {
    useOfferStore.setState({
      ...INITIAL,
      ...EXAMPLE,
      role: 'engineer',
      stage: 'seed',
      askedAt: asked(),
    })
    render(<OfferReviewForm />)
    expect(preview().textContent).toContain('Role and seat: Software engineer')
    expect(
      screen.getByText('Subject · Offer review: Software engineer at seed')
    ).toBeInTheDocument()
  })

  it('names the job offer tool when it asked', () => {
    useOfferStore.setState({ ...exampleStorePatch() })
    useOfferStore.getState().markAsked({ from: 'job-offer' })
    render(<OfferReviewForm />)
    expect(
      screen.getByText('Prefilled from your job offer ask')
    ).toBeInTheDocument()
    expect(preview().textContent).toMatch(/The ask: \$\d+k and [\d.]+%, floor/)
    expect(screen.getByText(/9 of 9 lines included/)).toBeInTheDocument()
  })
})

describe('a plain visit stays empty (test 33)', () => {
  it('does not prefill when the visitor never asked for a review', () => {
    useOfferStore.setState({ ...INITIAL, ...EXAMPLE, askedAt: null })
    render(<OfferReviewForm />)
    expect(
      screen.getByRole('heading', { name: 'Tell me about the offer' })
    ).toBeInTheDocument()
    expect(screen.getByText(/No read attached yet/)).toBeInTheDocument()
    const manual = screen.getByLabelText(/The offer, in your words/).value
    expect(manual).not.toMatch(/Role and seat: \S/)
    expect(manual.split('\n').filter((l) => /:\s*$/.test(l))).toHaveLength(6)
    expect(
      screen.queryByRole('region', {
        name: 'The message as sent',
        hidden: true,
      })
    ).toBeNull()
  })

  it('shows a skeleton, not "No read attached", until the store hydrates', async () => {
    const persist = useOfferStore.persist
    vi.spyOn(persist, 'hasHydrated').mockReturnValue(false)
    seedFromEquity()
    render(<OfferReviewForm />)
    expect(screen.queryByText(/No read attached yet/)).toBeNull()
    expect(screen.queryByText('12%')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Check what you are sending' })
    ).toBeInTheDocument()
    expect(sendButton()).toBeDisabled()
  })

  it('drops to the manual form when the dock’s bin clears the answers', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    fireEvent.change(screen.getByLabelText(/Anything the numbers miss/), {
      target: { value: 'Keep me' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Clear my answers' }))
    expect(
      screen.getByRole('heading', { name: 'Tell me about the offer' })
    ).toBeInTheDocument()
    expect(useOfferStore.getState().askedInputs).toBeNull()
    expect(screen.getByLabelText(/Anything the numbers miss/)).toHaveValue(
      'Keep me'
    )
  })
})

describe('the checklist, chips and deadline', () => {
  it('leaves an unticked line out of what is sent', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    expect(screen.getByText(/8 of 8 lines included/)).toBeInTheDocument()
    const salary = screen.getByRole('button', { name: /^Salary:\s*\$/ })
    expect(salary).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(salary)
    expect(salary).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/7 of 8 lines included/)).toBeInTheDocument()
    expect(preview().textContent.split('--- Full brief ---')[0]).not.toContain(
      'Salary vs market:'
    )
    /* The attached brief repeats it, and the card says so. */
    expect(screen.getByRole('note')).toHaveTextContent(/Detach it/)
    fireEvent.click(screen.getByRole('button', { name: 'Detach full brief' }))
    expect(screen.queryByRole('note')).toBeNull()
    expect(preview().textContent).not.toContain('--- Full brief ---')
  })

  it('folds the deadline and help into the message, and urgency into the subject', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    expect(preview().textContent).toContain(
      'Answering by: within two weeks\nWhat I want help with: What to counter with'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Equity size' }))
    fireEvent.click(screen.getByRole('radio', { name: 'This week' }))
    expect(screen.getByText(/goes to the top of the pile/)).toBeInTheDocument()
    expect(preview().textContent).toContain(
      'Answering by: this week\nWhat I want help with: What to counter with, Equity size'
    )
    expect(
      screen.getByText(
        'Subject · Offer review (answering this week): CTO at pre-seed'
      )
    ).toBeInTheDocument()
  })

  it('moves the deadline with the arrow keys', () => {
    render(<OfferReviewForm />)
    const two = screen.getByRole('radio', { name: 'Within two weeks' })
    expect(two).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(two, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'No deadline' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('flags a broken email after blur, and only then', () => {
    render(<OfferReviewForm />)
    const email = screen.getByLabelText('Email')
    fireEvent.change(email, { target: { value: 'ada@example' } })
    expect(screen.queryByText(/missing something/)).toBeNull()
    fireEvent.blur(email)
    expect(screen.getByText(/missing something/)).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-describedby', 'rv-email-err')
  })
})

describe('sending (ports contact-lead)', () => {
  it.each(['expired-callback', 'error-callback', 'timeout-callback'])(
    'blocks stale verification after %s',
    (callback) => {
      vi.stubGlobal('fetch', vi.fn())
      seedFromEquity()
      render(<OfferReviewForm />)
      fillContact()
      act(() => challenge[callback]())
      submit()
      expect(fetch).not.toHaveBeenCalled()
      expect(sendButton()).toBeDisabled()
      expect(sendButton()).toHaveTextContent('Complete the security check')
      expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    }
  )

  it('blocks a submission until verification finishes', () => {
    window.turnstile.render = () => 'widget'
    vi.stubGlobal('fetch', vi.fn())
    seedFromEquity()
    render(<OfferReviewForm />)
    fillContact()
    submit()
    expect(fetch).not.toHaveBeenCalled()
    expect(sendButton()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please complete the security check before sending your message.'
    )
  })

  it('stays disabled until the name and email are valid', () => {
    seedFromEquity()
    render(<OfferReviewForm />)
    expect(sendButton()).toHaveTextContent('Add your name and email')
    expect(sendButton()).toBeDisabled()
    fillContact()
    expect(sendButton()).toHaveTextContent('Send for review')
    expect(sendButton()).toBeEnabled()
  })

  it('posts the composed message, reports one lead, and shows the sent state in place', async () => {
    vi.stubGlobal('fetch', okFetch(42))
    seedFromEquity()
    render(<OfferReviewForm />)
    fillContact()
    fireEvent.click(screen.getByRole('radio', { name: 'This week' }))
    const expected = preview().textContent
    submit()

    await screen.findByRole('heading', { name: 'Sent. It is with me now.' })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/contact-submissions')
    expect(init.headers['x-turnstile-token']).toBe('verified-token-1')
    const body = JSON.parse(init.body)
    expect(Object.keys(body).sort()).toEqual([
      'email',
      'message',
      'name',
      'subject',
    ])
    expect(body).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Offer review (answering this week): CTO at pre-seed',
      message: expected,
    })
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('lead', {
      event_id: 'contact_42',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(
      screen.getByText(/Marked as answering this week/)
    ).toBeInTheDocument()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Sent. It is with me now.' })
    )
    expect(
      screen.getByRole('link', { name: /Back to the desk/ })
    ).toHaveAttribute('href', '/founders')
    const rail = screen.getByRole('complementary', { name: 'About the review' })
    expect(
      within(rail).getByText('I read it against the band').closest('li')
    ).toHaveAttribute('aria-current', 'step')
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
    seedFromEquity()
    render(<OfferReviewForm />)
    fillContact()
    submit()
    await waitFor(() => expect(track).toHaveBeenCalledTimes(1))
    const [, data] = track.mock.calls[0]
    expect(data).not.toHaveProperty('event_id')
    expect(data).toMatchObject({ email: 'ada@example.com' })
  })

  it('reports nothing when the send fails, and keeps everything typed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    seedFromEquity()
    render(<OfferReviewForm />)
    fillContact()
    fireEvent.change(screen.getByLabelText(/Anything the numbers miss/), {
      target: { value: 'A competing offer.' },
    })
    submit()

    await screen.findByText(/did not send/i)
    expect(track).not.toHaveBeenCalled()
    await waitFor(() => expect(window.turnstile.remove).toHaveBeenCalled())
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText(/Anything the numbers miss/)).toHaveValue(
      'A competing offer.'
    )
    expect(screen.queryByRole('heading', { name: /Sent\./ })).toBeNull()
    /* A fresh widget, so the send comes back once it verifies again. */
    await waitFor(() => expect(sendButton()).toBeEnabled())
  })

  it('"Send another" brings back the form with a fresh check, keeping the contact details', async () => {
    vi.stubGlobal('fetch', okFetch(7))
    seedFromEquity()
    render(<OfferReviewForm />)
    fillContact()
    fireEvent.click(screen.getByRole('button', { name: /^Salary:\s*\$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Equity size' }))
    fireEvent.change(screen.getByLabelText(/Anything the numbers miss/), {
      target: { value: 'First note' },
    })
    submit()
    await screen.findByRole('heading', { name: 'Sent. It is with me now.' })
    expect(renders).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Send another' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText(/Anything the numbers miss/)).toHaveValue('')
    expect(
      screen.getByRole('button', { name: /^Salary:\s*\$/ })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Equity size' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    await waitFor(() => expect(renders).toBe(2))
    submit()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(fetch.mock.calls[1][1].headers['x-turnstile-token']).toBe(
      'verified-token-2'
    )
  })

  it('sends the manual text on a direct visit', async () => {
    vi.stubGlobal('fetch', okFetch(9))
    render(<OfferReviewForm />)
    fillContact()
    expect(sendButton()).toHaveTextContent('Describe the offer first')
    fireEvent.change(screen.getByLabelText(/The offer, in your words/), {
      target: { value: 'Role and seat: Head of data\nSalary vs market: 150k' },
    })
    submit()
    await screen.findByRole('heading', { name: 'Sent. It is with me now.' })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.subject).toBe('Offer review')
    expect(body.message).toBe(
      'Role and seat: Head of data\nSalary vs market: 150k\n\nAnswering by: within two weeks\nWhat I want help with: —'
    )
  })
})

describe('the split leaves /contact unchanged', () => {
  it('keeps the general form’s fields, its redirect and no desk furniture', async () => {
    vi.stubGlobal('fetch', okFetch(3))
    seedFromEquity()
    render(<ContactForm />)
    expect(screen.getByLabelText(/subject/i)).toHaveValue('')
    expect(screen.getByLabelText(/message/i)).toHaveValue('')
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.queryByText(/Founders’ Desk/)).toBeNull()

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Ada Lovelace' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'A question.' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/thank-you'))
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: '',
      message: 'A question.',
    })
    expect(track).toHaveBeenCalledTimes(1)
  })
})

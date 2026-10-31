import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
const motionPrefs = vi.hoisted(() => ({ reduced: false }))

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => motionPrefs.reduced,
}))
vi.mock('@/components/react-bits/dither', () => ({
  default: () => <div data-testid="dither" />,
}))
/* The real one pulls in the server action; only its props matter here. */
vi.mock('@/components/commerce/DigitalBuyButton', () => ({
  DigitalBuyButton: ({ slug, name, price, children }) => (
    <button
      type="submit"
      data-testid="buy"
      data-slug={slug}
      data-name={name}
      data-price={price}
    >
      {children}
    </button>
  ),
}))
vi.mock('@/components/commerce/EmailCapture', () => ({
  EmailCapture: ({ subject, note, cta, successMessage }) => (
    <div data-testid="capture">
      <span>{subject}</span>
      <span>{note}</span>
      <span>{cta}</span>
      <span>{successMessage('me@x.co')}</span>
    </div>
  ),
}))

import DigitalProductsPage from '@/app/(site)/digital-products/page'
import { RED_FLAGS_SUBJECT } from '@/lib/contact-intents'
import { SecureTheStack } from '@/components/courses/secure-the-stack'
import { DigitalProducts } from '../digital-products'

const SLUG = 'switch-clone-quick-key-rotation-guide'
const onSale = { price: 12, pageCount: 16, route: 'creem', slug: SLUG }
const noFile = { price: 12, pageCount: 16, route: null, slug: SLUG }

const buyBlock = () => document.querySelector('.gd-buy')
const card = (name) => screen.getByRole('heading', { name }).closest('article')
const clause = (name) => screen.getByRole('group', { name })
const verdict = () => document.querySelector('.gd-verdict')
const filter = (name) =>
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Filter by reader' })).getByRole(
      'button',
      { name: new RegExp(name) }
    )
  )
const step = (name) => screen.getByRole('button', { name })
const CLONE = /^01\s*Clone/
const SWITCH = /^02\s*Switch/
const RETIRE = /^03\s*Retire/

beforeEach(() => {
  motionPrefs.reduced = false
  vi.spyOn(console, 'error').mockImplementation(() => {})
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the /digital-products read', () => {
  const guide = async () =>
    (await DigitalProductsPage()).props.children.props.guide

  it('reads published digital rows', async () => {
    payload.find.mockResolvedValue({ docs: [] })
    await guide()
    expect(payload.find.mock.calls[0][0]).toMatchObject({
      collection: 'products',
      where: {
        line: { equals: 'digital' },
        status: { equals: 'published' },
      },
    })
  })

  it('passes only the reduced shape, for the Switch Clone row', async () => {
    payload.find.mockResolvedValue({
      docs: [
        { slug: 'some-other-guide', type: 'digital', price: 99 },
        {
          slug: SLUG,
          type: 'digital',
          price: 12,
          pageCount: 16,
          creemProductId: 'prod_secret',
          downloadUrl: 'https://files.example/secret.pdf',
          description: 'draft words',
        },
      ],
    })
    expect(await guide()).toEqual(onSale)
  })

  // Review Focus 1
  it('reads a Creem id with nothing to deliver as not on sale', async () => {
    payload.find.mockResolvedValue({
      docs: [
        {
          slug: SLUG,
          type: 'digital',
          price: 12,
          pageCount: 16,
          creemProductId: 'prod_secret',
        },
      ],
    })
    expect(await guide()).toEqual(noFile)
  })

  it('passes null when the row is absent', async () => {
    payload.find.mockResolvedValue({
      docs: [{ slug: 'some-other-guide', type: 'digital', price: 99 }],
    })
    expect(await guide()).toBeNull()
  })

  it('passes null when the query fails', async () => {
    payload.find.mockRejectedValue(new Error('column does not exist'))
    expect(await guide()).toBeNull()
  })

  it('passes null when Payload will not start', async () => {
    payload.client.mockRejectedValue(new Error('no database'))
    expect(await guide()).toBeNull()
  })

  it('still renders the whole page after a failed read', async () => {
    payload.find.mockRejectedValue(new Error('column does not exist'))
    render(await DigitalProductsPage())
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Playbooks from real client work.',
      })
    ).toBeInTheDocument()
    expect(screen.queryByTestId('buy')).toBeNull()
    expect(buyBlock()).toHaveTextContent('Not on sale yet')
    expect(screen.getByTestId('capture')).toBeInTheDocument()
  })
})

describe('buying the playbook', () => {
  it('sells through DigitalBuyButton on the Creem route', () => {
    render(<DigitalProducts guide={onSale} />)
    const buy = screen.getByTestId('buy')
    expect(buy).toHaveTextContent('Buy the guide')
    expect(buy).toHaveAttribute('data-slug', SLUG)
    expect(buy).toHaveAttribute(
      'data-name',
      'The 15-Minute Key Rotation Playbook'
    )
    expect(buy).toHaveAttribute('data-price', '12')
    expect(buyBlock()).toHaveTextContent('$12.00')
    expect(buyBlock()).toHaveTextContent('One-time · PDF')
    expect(buyBlock()).not.toHaveTextContent('Not on sale yet')
  })

  // Review Focus 1
  it('offers no Buy button with no route, and says why', () => {
    render(<DigitalProducts guide={noFile} />)
    expect(screen.queryByTestId('buy')).toBeNull()
    expect(screen.queryByRole('button', { name: /buy/i })).toBeNull()
    expect(buyBlock()).toHaveTextContent('Not on sale yet')
  })

  // Review Focus 5
  it('does not call the guide a one-time purchase while it is not on sale', () => {
    render(<DigitalProducts guide={noFile} />)
    expect(buyBlock()).not.toHaveTextContent('One-time')
    expect(card('The 15-Minute Key Rotation Playbook')).not.toHaveTextContent(
      'One-time'
    )
  })

  it('treats a route other than Creem as not on sale', () => {
    render(<DigitalProducts guide={{ ...onSale, route: 'whop' }} />)
    expect(screen.queryByTestId('buy')).toBeNull()
    expect(buyBlock()).toHaveTextContent('Not on sale yet')
  })

  it('shows no price at all with no row', () => {
    render(<DigitalProducts guide={null} />)
    expect(document.body).not.toHaveTextContent(/\$\d/)
    expect(buyBlock()).toHaveTextContent('Not on sale yet')
  })

  it('shows the Payload price on the card and in the Buy block', () => {
    render(<DigitalProducts guide={{ ...onSale, price: 19.5 }} />)
    expect(card('The 15-Minute Key Rotation Playbook')).toHaveTextContent(
      '$19.50'
    )
    expect(buyBlock()).toHaveTextContent('$19.50')
  })

  it('takes the page count from the row, never a literal', () => {
    const { unmount } = render(
      <DigitalProducts guide={{ ...onSale, pageCount: 20 }} />
    )
    expect(buyBlock()).toHaveTextContent("What's in the PDF · 20 pages")
    expect(card('The 15-Minute Key Rotation Playbook')).toHaveTextContent(
      'PDF guide · 20 pages'
    )
    unmount()

    render(<DigitalProducts guide={null} />)
    expect(buyBlock()).toHaveTextContent("What's in the PDF")
    expect(buyBlock()).not.toHaveTextContent('pages')
    expect(document.body).not.toHaveTextContent('16')
  })
})

describe('the library filter', () => {
  it('counts each reader', () => {
    render(<DigitalProducts guide={null} />)
    const group = screen.getByRole('group', { name: 'Filter by reader' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['All2', 'For founders2', 'For developers1'])
  })

  const dims = () =>
    ['The 15-Minute Key Rotation Playbook', 'Dev Shop Contract Red Flags'].map(
      (name) => card(name).getAttribute('data-dim')
    )

  it('dims nothing for founders, who are in both cards as on the board', () => {
    render(<DigitalProducts guide={null} />)
    filter('For founders')
    expect(dims()).toEqual(['false', 'false'])
  })

  it('dims the founders-only checklist for developers', () => {
    render(<DigitalProducts guide={null} />)
    filter('For developers')
    expect(dims()).toEqual(['false', 'true'])
    filter('All')
    expect(dims()).toEqual(['false', 'false'])
  })

  it('sends each card to its section', () => {
    render(<DigitalProducts guide={null} />)
    expect(
      screen.getByRole('link', { name: 'See the method' })
    ).toHaveAttribute('href', '#gd-switch')
    expect(
      screen.getByRole('link', { name: 'Score my contract' })
    ).toHaveAttribute('href', '#gd-flags')
  })
})

describe('the Switch Clone stepper', () => {
  it('cycles every 2.8 seconds', () => {
    vi.useFakeTimers()
    render(<DigitalProducts guide={null} />)
    expect(step(CLONE)).toHaveAttribute('aria-pressed', 'true')
    act(() => vi.advanceTimersByTime(2800))
    expect(step(SWITCH)).toHaveAttribute('aria-pressed', 'true')
    act(() => vi.advanceTimersByTime(5600))
    expect(step(CLONE)).toHaveAttribute('aria-pressed', 'true')
  })

  it('stops on a manual pick', () => {
    vi.useFakeTimers()
    render(<DigitalProducts guide={null} />)
    fireEvent.click(step(RETIRE))
    expect(step(RETIRE)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/of 3 · Retire/)).toBeInTheDocument()
    /* One tick, then two more: a full cycle would land back on Retire. */
    act(() => vi.advanceTimersByTime(2800))
    expect(step(RETIRE)).toHaveAttribute('aria-pressed', 'true')
    act(() => vi.advanceTimersByTime(5600))
    expect(step(RETIRE)).toHaveAttribute('aria-pressed', 'true')
  })

  it('never runs under reduced motion', () => {
    motionPrefs.reduced = true
    vi.useFakeTimers()
    render(<DigitalProducts guide={null} />)
    act(() => vi.advanceTimersByTime(10000))
    expect(step(CLONE)).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('list', { name: 'The Switch Clone method' })
    ).not.toHaveClass('gd-auto')
  })
})

describe('the Red Flags scorer', () => {
  const press = (title, mark) =>
    fireEvent.click(within(clause(title)).getByRole('button', { name: mark }))

  it('starts unmarked', () => {
    render(<DigitalProducts guide={null} />)
    expect(verdict()).toHaveTextContent('Start with clause 1')
    expect(screen.getByText(/0 of 7 checked/)).toBeInTheDocument()
  })

  it('clears a marked Pass when pressed again', () => {
    render(<DigitalProducts guide={null} />)
    const pass = () =>
      within(clause('Who owns the code?')).getByRole('button', {
        name: 'Pass',
      })
    fireEvent.click(pass())
    expect(pass()).toHaveAttribute('aria-pressed', 'true')
    expect(verdict()).toHaveTextContent('Clean so far')
    fireEvent.click(pass())
    expect(pass()).toHaveAttribute('aria-pressed', 'false')
    expect(verdict()).toHaveTextContent('Start with clause 1')
    expect(screen.getByText(/0 of 7 checked/)).toBeInTheDocument()
  })

  it('moves a clause from Pass to Fail with one press', () => {
    render(<DigitalProducts guide={null} />)
    press('Who owns the code?', 'Pass')
    press('Who owns the code?', 'Fail')
    expect(
      within(clause('Who owns the code?')).getByRole('button', {
        name: 'Pass',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/1 of 7 checked/)).toBeInTheDocument()
    expect(verdict()).toHaveTextContent('One clause to fix')
  })

  it('reaches the renegotiate verdict at two fails', () => {
    render(<DigitalProducts guide={null} />)
    press('Who owns the code?', 'Fail')
    press('No exit plan', 'Fail')
    expect(verdict()).toHaveTextContent('Renegotiate before you sign')
    expect(verdict()).toHaveAttribute('data-tone', 'bad')
  })

  it('keeps the marks out of browser storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(<DigitalProducts guide={null} />)
    press('Who owns the code?', 'Fail')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('hands the capture the Red Flags subject and the promise', () => {
    render(<DigitalProducts guide={null} />)
    const capture = screen.getByTestId('capture')
    expect(capture).toHaveTextContent(RED_FLAGS_SUBJECT)
    expect(capture).toHaveTextContent(
      'One email with the PDF. No newsletter unless you ask.'
    )
    expect(capture).toHaveTextContent('Send it')
    expect(capture).toHaveTextContent('On its way to me@x.co.')
  })
})

describe('the way out', () => {
  it('links to Courses, Products and Services', () => {
    render(<DigitalProducts guide={null} />)
    expect(
      screen.getByRole('link', { name: /Secure the Stack/ })
    ).toHaveAttribute('href', '/courses')
    expect(
      screen.getByRole('link', { name: /WareKit boilerplates/ })
    ).toHaveAttribute('href', '/products')
    expect(
      screen.getByRole('link', { name: /Fractional CTO services/ })
    ).toHaveAttribute('href', '/services')
  })

  it('is linked from Secure the Stack now that the page is live', () => {
    render(<SecureTheStack />)
    expect(
      screen.getByRole('link', { name: /Digital products/ })
    ).toHaveAttribute('href', '/digital-products')
  })
})

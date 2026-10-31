import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('@/components/react-bits/dither', () => ({
  default: () => <div data-testid="dither" />,
}))
/* Only what the page hands the capture matters here; the form has its own
   tests. */
vi.mock('@/components/commerce/EmailCapture', () => ({
  EmailCapture: ({ subject, note, cta, successMessage }) => (
    <div data-testid="capture">
      <input aria-label="Email address" />
      <span>{subject}</span>
      <span>{note}</span>
      <span>{cta}</span>
      <span>{successMessage}</span>
    </div>
  ),
}))

import { NetsuiteEdition } from '../netsuite-edition'

const nextPro = {
  'next-pro': {
    state: 'ready',
    price: 499,
    seats: 1,
    slug: 'warekit-next-netsuite-pro',
  },
}
const nextLite = {
  'next-lite': {
    state: 'free',
    price: 0,
    seats: 1,
    slug: 'warekit-next-netsuite-lite',
  },
}

const mount = (states = {}) => render(<NetsuiteEdition states={states} />)
const answer = (question, name) =>
  fireEvent.click(
    within(screen.getByRole('group', { name: question })).getByRole('button', {
      name,
    })
  )
const WHERE = 'Where does the app need to run?'
const WHO = 'Who is building it?'
const switcher = () =>
  screen.getAllByRole('group', { name: 'Where does your app run?' })[1]
const family = (name) =>
  fireEvent.click(within(switcher()).getByRole('button', { name }))

describe('with nothing on sale', () => {
  const claims = [
    'Free to claim',
    'Available',
    'Lite is free',
    'Free Lite editions to evaluate',
    'One-time purchase',
    'One-time',
    'Start free',
    '04 · After you check out',
    'Claim a Lite edition or check out',
  ]

  // Review Focus 5
  it('asserts no availability in either family', () => {
    const { container } = mount()
    for (const text of claims) expect(container).not.toHaveTextContent(text)
    family('Inside')
    for (const text of claims) expect(container).not.toHaveTextContent(text)
  })

  it('asserts none with an empty object, the failed read', () => {
    const { container } = mount({})
    expect(container).toHaveTextContent(
      'These editions are not on sale yet. Leave your email and you will hear when they are.'
    )
    expect(screen.getAllByText('Not on sale yet').length).toBeGreaterThan(2)
  })

  it('asserts none through every quiz answer', () => {
    const { container } = mount()
    answer(WHERE, 'Hosted separately')
    answer('Where should sessions live?', 'Postgres is fine')
    expect(container).toHaveTextContent('Next / Lite')
    expect(container).not.toHaveTextContent('Lite is free')
    answer(WHERE, 'Inside NetSuite')
    expect(container).not.toHaveTextContent('free to evaluate')
    answer('How many developers need the code?', 'Up to five')
    expect(container).not.toHaveTextContent('free to evaluate')
    expect(container).not.toHaveTextContent('available foundation')
  })

  it('describes the setup path without a sale', () => {
    const { container } = mount()
    expect(container).toHaveTextContent('04 · After you buy')
    expect(container).toHaveTextContent(
      'When an edition ships, confirm the GitHub account that gets the invite.'
    )
  })

  it('hides both hero chips', () => {
    const { container } = mount()
    expect(container.querySelector('.pr-chip')).toBeNull()
  })

  it('points every card at the waitlist, with no link to a checkout', () => {
    mount()
    expect(
      screen.queryByRole('link', { name: /^Buy|Get Lite/ })
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /^Get notified about/ })
    ).toHaveLength(3)
  })

  it('drops the pointer to React Lite and the recommended chips', () => {
    const { container } = mount()
    family('Inside')
    expect(container).not.toHaveTextContent('Start with React Lite')
    expect(container).not.toHaveTextContent('Start here')
  })
})

describe('with Next Pro on sale', () => {
  it('shows the checkout link and price', () => {
    mount(nextPro)
    expect(screen.getByRole('link', { name: /Buy Pro/ })).toHaveAttribute(
      'href',
      '/products/warekit-next-netsuite-pro'
    )
    expect(screen.getAllByText('$499.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('$499.00 one-time')).toBeInTheDocument()
  })

  it('shows only the chip that is true', () => {
    const { container } = mount(nextPro)
    expect(container).toHaveTextContent('One-time purchase')
    expect(container).not.toHaveTextContent('Free Lite editions to evaluate')
  })

  it('still answers planned editions with Get notified', () => {
    mount(nextPro)
    expect(
      screen.getAllByRole('button', { name: /^Get notified about/ })
    ).toHaveLength(2)
  })

  it('takes no waitlist when the whole family is on sale', () => {
    mount({
      ...nextPro,
      ...nextLite,
      'next-team': { state: 'ready', price: 999, seats: 5, slug: 'next-team' },
    })
    expect(screen.queryByTestId('capture')).not.toBeInTheDocument()
  })
})

describe('with React Pro and Team on sale', () => {
  it('leaves no planned wording in those cards', () => {
    mount({
      'react-pro': { state: 'ready', price: 499, seats: 1, slug: 'react-pro' },
      'react-team': {
        state: 'ready',
        price: 999,
        seats: 5,
        slug: 'react-team',
      },
    })
    family('Inside')
    const [, reactPro, reactTeam] = screen.getAllByRole('article')
    for (const card of [reactPro, reactTeam]) {
      expect(card).toHaveTextContent('Available')
      expect(card).not.toHaveTextContent(/planned|in development/i)
    }
    expect(
      screen.queryByRole('list', { name: 'Planned modules' })
    ).not.toBeInTheDocument()
  })
})

describe('with both a free and a paid edition', () => {
  it('keeps the board wording for the setup path', () => {
    const { container } = mount({ ...nextPro, ...nextLite })
    expect(container).toHaveTextContent('04 · After you check out')
    expect(container).toHaveTextContent('Claim a Lite edition or check out')
  })
})

describe('with a free Lite', () => {
  it('links Get Lite to the claim page', () => {
    const { container } = mount(nextLite)
    expect(screen.getByRole('link', { name: /Get Lite/ })).toHaveAttribute(
      'href',
      '/products/warekit-next-netsuite-lite'
    )
    expect(container).toHaveTextContent('Free to claim')
    expect(container).toHaveTextContent('Free Lite editions to evaluate')
    expect(container).not.toHaveTextContent('One-time purchase')
  })
})

describe('the waitlist', () => {
  it('defaults to the first planned edition of the family', () => {
    mount()
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'WareKit waitlist · NetSuite · Next / Lite'
    )
  })

  it('follows the card that was pressed and takes focus', () => {
    mount()
    fireEvent.click(
      screen.getByRole('button', { name: 'Get notified about Next / Pro' })
    )
    const capture = screen.getByTestId('capture')
    expect(capture).toHaveTextContent(
      'WareKit waitlist · NetSuite · Next / Pro'
    )
    expect(capture).toHaveTextContent(
      'One email when the Next / Pro kit ships. Nothing else.'
    )
    expect(screen.getByLabelText('Email address')).toHaveFocus()
  })

  it('brings the grid back when the quiz asks from the build path', () => {
    mount()
    answer(WHERE, 'Inside NetSuite')
    answer(WHO, 'I need it built')
    expect(screen.queryByTestId('capture')).not.toBeInTheDocument()
    answer(WHO, 'I have a developer')
    fireEvent.click(screen.getByRole('button', { name: 'Get notified' }))
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'WareKit waitlist · NetSuite · React / Lite'
    )
  })
})

describe('the sections', () => {
  it('swaps the editions and the compare table with the family', () => {
    mount()
    expect(screen.getByText('Next.js editions.')).toBeInTheDocument()
    expect(screen.getByText('Session reads')).toBeInTheDocument()
    family('Inside')
    expect(screen.getByText('React editions.')).toBeInTheDocument()
    expect(screen.queryByText('Session reads')).not.toBeInTheDocument()
    expect(screen.getByText('Hosting')).toBeInTheDocument()
  })

  it('replaces the grid and table on the build path', () => {
    mount()
    family('Built for you')
    expect(screen.getByText('Have it built.')).toBeInTheDocument()
    expect(screen.queryByText('Only the differences that matter.')).toBeNull()
    expect(
      screen.getByRole('link', { name: /Book a strategy call/ })
    ).toHaveAttribute('href', '/services')
  })

  it('keeps the path picker and switch in step', () => {
    mount()
    fireEvent.click(
      screen.getByRole('button', { name: /^Inside NetSuite\s*For/ })
    )
    expect(
      within(switcher()).getByRole('button', { name: 'Inside' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('takes "See all editions" back to a grid from the build path', () => {
    mount()
    family('Built for you')
    fireEvent.click(screen.getByRole('button', { name: 'See all editions' }))
    expect(screen.getByText('Next.js editions.')).toBeInTheDocument()
  })

  it('links out to services and the Standard edition', () => {
    mount()
    expect(
      screen.getByRole('link', { name: /Need it built instead/ })
    ).toHaveAttribute('href', '/services')
    expect(
      screen.getByRole('link', { name: /Not on NetSuite/ })
    ).toHaveAttribute('href', '/products/standard')
  })

  it('takes the quiz out of the tab order while closed', () => {
    const { container } = mount()
    const drawer = container.querySelector('#pr-quiz')
    expect(drawer).toHaveAttribute('inert')
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }))
    expect(drawer).not.toHaveAttribute('inert')
  })
})

import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('@/components/react-bits/dither', () => ({
  default: () => <div data-testid="dither" />,
}))
vi.mock('@/lib/commerce/creemCheckout', () => ({
  startCreemCheckout: vi.fn(async () => ({ error: null })),
}))
vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))
/* Only what the page hands the capture matters here; the form has its own
   tests. The mount id lets a test see whether a pick remounted it. */
vi.mock('@/components/commerce/EmailCapture', () => {
  let mounts = 0
  return {
    EmailCapture: ({ subject, message, note, cta, successMessage }) => {
      const [id] = useState(() => ++mounts)
      return (
        <div data-testid="capture" data-mount={id}>
          <input aria-label="Email address" />
          <span>{subject}</span>
          <span>{message}</span>
          <span>{note}</span>
          <span>{cta}</span>
          <span>
            {typeof successMessage === 'function'
              ? successMessage('me@x.co')
              : successMessage}
          </span>
        </div>
      )
    },
  }
})

import { StandardEdition } from '../standard-edition'
import { wavesFor } from '../standard/presale-sections'
import { PRESALE } from '@/content/site/standard-presale'

/* Shaped like `standardPresale`'s result. */
const open = {
  open: true,
  pro: { state: 'ready', price: 149, slug: 'warekit-standard-pro' },
  team: { state: 'ready', price: 299, slug: 'warekit-standard-team' },
}
const closed = {
  open: false,
  pro: { state: 'planned', price: null, slug: null },
  team: { state: 'planned', price: null, slug: null },
}
const proOnly = { ...open, team: closed.team }

const mount = ({
  presale = closed,
  anyOnSale = false,
  liteFree = false,
} = {}) =>
  render(
    <StandardEdition
      presale={presale}
      anyOnSale={anyOnSale}
      liteFree={liteFree}
    />
  )
const group = (name) => screen.getByRole('group', { name })
/* The hero and the closing band share their labels, so a link is looked up
   inside its own section. */
const hero = () => screen.getByRole('region', { name: PRESALE.hero.title })
const band = () => screen.getByRole('region', { name: PRESALE.band.title })
const nsCard = () =>
  screen.getByRole('region', {
    name: /Building on NetSuite\? WareKit NetSuite edition/,
  })
const section = (id) => document.getElementById(id)
const pick = (groupName, name) =>
  fireEvent.click(within(group(groupName)).getByRole('button', { name }))
const pressed = (groupName) =>
  within(group(groupName))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent)
const tree = () =>
  screen.getByText(PRESALE.picker.treeTitle).closest('[aria-live]')
const added = () =>
  within(tree())
    .getAllByRole('listitem')
    .filter((li) => li.dataset.new === 'true')
    .map((li) => li.textContent.replace(/^\+?(Added: )?/, ''))

describe('the stack picker', () => {
  it('starts on Supabase and Creem, and says so in the command and the tree', () => {
    mount()
    expect(pressed('Data layer')).toEqual(['Supabase'])
    expect(pressed('Payments')).toEqual(['Creem'])
    expect(
      screen.getByText('warekit create my-app --data supabase --pay creem')
    ).toBeInTheDocument()
    expect(added()).toEqual([
      'packages/data/supabase/',
      'packages/billing/creem/',
    ])
    expect(tree()).toHaveAttribute('aria-live', 'polite')
    for (const li of within(tree()).getAllByRole('listitem')) {
      const isNew = li.dataset.new === 'true'
      expect(li.textContent.startsWith('+Added: ')).toBe(isNew)
    }
  })

  it('moves the command and the tree with each pick', () => {
    mount()
    pick('Data layer', 'Appwrite')
    expect(
      screen.getByText('warekit create my-app --data appwrite --pay creem')
    ).toBeInTheDocument()
    expect(added()).toEqual([
      'packages/data/appwrite/',
      'packages/billing/creem/',
    ])

    pick('Payments', 'Polar')
    expect(
      screen.getByText('warekit create my-app --data appwrite --pay polar')
    ).toBeInTheDocument()
    expect(added()).toEqual([
      'packages/data/appwrite/',
      'packages/billing/polar/',
    ])
    expect(pressed('Data layer')).toEqual(['Appwrite'])
    expect(pressed('Payments')).toEqual(['Polar'])
    expect(tree()).not.toHaveTextContent('packages/data/supabase/')
    expect(tree()).not.toHaveTextContent('packages/billing/creem/')
  })

  it('offers all five of each', () => {
    mount()
    const names = (groupName) =>
      within(group(groupName))
        .getAllByRole('button')
        .map((button) => button.textContent)
    expect(names('Data layer')).toEqual([
      'Supabase',
      'Drizzle',
      'Prisma',
      'Manifest',
      'Appwrite',
    ])
    expect(names('Payments')).toEqual([
      'Creem',
      'Stripe',
      'Dodo Payments',
      'Polar',
      'Whop',
    ])
    for (const button of [
      ...within(group('Data layer')).getAllByRole('button'),
      ...within(group('Payments')).getAllByRole('button'),
    ]) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('names Lemon Squeezy once, as not supported', () => {
    const { container } = mount()
    expect(screen.getAllByText(PRESALE.picker.lemon)).toHaveLength(1)
    expect(container.textContent.match(/Lemon Squeezy/g)).toHaveLength(1)
  })
})

describe('the hero', () => {
  it('sends the hero to the founding section while the presale is open', () => {
    mount({ presale: open })
    expect(
      within(hero()).getByRole('link', { name: PRESALE.hero.cta })
    ).toHaveAttribute('href', '#founding')
    expect(screen.getByText('founding presale')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: PRESALE.hero.secondary.label })
    ).toHaveAttribute('href', '#ships')
    expect(screen.getByText(PRESALE.hero.note)).toBeInTheDocument()
  })

  it('sends the hero to the waitlist while it is closed, and claims no presale', () => {
    const { container } = mount({ presale: closed })
    expect(
      within(hero()).getByRole('link', { name: PRESALE.hero.ctaClosed })
    ).toHaveAttribute('href', '#st-join')
    expect(container).not.toHaveTextContent(/founding presale/i)
    expect(
      screen.queryByRole('link', { name: PRESALE.hero.cta })
    ).not.toBeInTheDocument()
    expect(screen.getByText(PRESALE.hero.noteClosed)).toBeInTheDocument()
  })

  it('treats a missing presale as closed', () => {
    const { container } = render(<StandardEdition anyOnSale={false} />)
    expect(
      within(hero()).getByRole('link', { name: PRESALE.hero.ctaClosed })
    ).toHaveAttribute('href', '#st-join')
    expect(document.querySelectorAll('form')).toHaveLength(0)
    expect(container).not.toHaveTextContent(/founding presale/i)
  })
})

describe('the sections', () => {
  it('lists the six problems, the six parts and the six guards', () => {
    mount()

    const pains = section('st-pains')
    expect(pains).toHaveAttribute('aria-labelledby')
    expect(
      within(pains).getByRole('heading', {
        level: 2,
        name: PRESALE.pains.title,
      })
    ).toBeInTheDocument()
    const painCards = within(pains).getAllByRole('listitem')
    expect(painCards).toHaveLength(6)
    painCards.forEach((card, i) =>
      expect(card).toHaveTextContent(PRESALE.pains.items[i])
    )

    const ships = section('ships')
    expect(
      within(ships).getByRole('heading', {
        level: 2,
        name: PRESALE.ships.title,
      })
    ).toBeInTheDocument()
    const parts = within(ships).getAllByRole('heading', { level: 3 })
    expect(parts.map((h) => h.textContent)).toEqual(
      PRESALE.ships.items.map((item) => item.title)
    )
    expect(ships).toHaveTextContent(PRESALE.ships.caption)

    const guards = section('st-guards')
    expect(
      within(guards).getByRole('heading', {
        level: 2,
        name: PRESALE.guards.title,
      })
    ).toBeInTheDocument()
    const rules = within(guards).getAllByRole('heading', { level: 3 })
    expect(rules.map((h) => h.textContent)).toEqual(
      PRESALE.guards.items.map((item) => item.title)
    )

    /* The sections run in order after the hero. */
    const order = [...document.querySelectorAll('section[id]')].map((s) => s.id)
    expect(order).toEqual([
      'st-pains',
      'ships',
      'st-guards',
      'st-waves',
      'founding',
      'st-questions',
      'st-join',
    ])
  })
})

describe('the way back to NetSuite', () => {
  it('still offers the way back to the NetSuite edition, with the same two claims as before', () => {
    /* Nothing on sale: no availability is asserted. */
    let view = mount({ anyOnSale: false })
    for (const text of ['Available now', 'Lite is free']) {
      expect(nsCard()).not.toHaveTextContent(text)
    }
    expect(nsCard()).toHaveTextContent('NetSuite edition')
    expect(nsCard()).toHaveTextContent(
      'React apps inside NetSuite or Next.js apps connected to it.'
    )
    const card = screen.getByRole('link', {
      name: /Building on NetSuite\? WareKit NetSuite edition/,
    })
    expect(card).toHaveAttribute('href', '/products')
    expect(card).toHaveTextContent('See the NetSuite edition')
    view.unmount()

    /* A free edition on sale: both claims. */
    view = mount({ anyOnSale: true, liteFree: true })
    expect(nsCard()).toHaveTextContent('Available now')
    expect(nsCard()).toHaveTextContent('Lite is free.')
    view.unmount()

    /* Only a paid edition on sale: available, but nothing is free. */
    view = mount({ anyOnSale: true, liteFree: false })
    expect(nsCard()).toHaveTextContent('Available now')
    expect(nsCard()).not.toHaveTextContent('Lite is free')
    expect(nsCard()).not.toHaveTextContent('free')
  })
})

describe('the waves', () => {
  it('works out the columns for each state without changing the copy', () => {
    const before = JSON.stringify(PRESALE.waves)
    expect(wavesFor(true)).toBe(PRESALE.waves.columns)

    const [first, ...rest] = wavesFor(false)
    expect(first).toMatchObject({ label: 'Wave 1', fill: 0, today: true })
    expect(first.items.map((item) => item.title)).toEqual(
      PRESALE.waves.columns[0].items.map((item) => item.title)
    )
    for (const item of first.items) {
      expect(item).toMatchObject({
        status: PRESALE.waves.closedStatus,
        state: 'active',
      })
    }
    expect(rest.map((column) => column.today)).toEqual([false, false, false])
    rest.forEach((column, i) =>
      expect(column.items).toEqual(PRESALE.waves.columns[i + 1].items)
    )
    expect(JSON.stringify(PRESALE.waves)).toBe(before)
  })

  const waves = () => section('st-waves')
  const columns = () => within(waves()).getAllByRole('heading', { level: 3 })

  it('draws four waves and five questions', () => {
    mount()
    expect(
      within(waves()).getByRole('heading', {
        level: 2,
        name: PRESALE.waves.title,
      })
    ).toBeInTheDocument()
    expect(columns()).toHaveLength(4)
    columns().forEach((heading, i) =>
      expect(heading).toHaveTextContent(PRESALE.waves.columns[i].label)
    )

    const questions = section('st-questions')
    expect(
      within(questions).getByRole('heading', {
        level: 2,
        name: PRESALE.faqs.title,
      })
    ).toBeInTheDocument()
    const asked = within(questions)
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-expanded'))
    expect(asked.map((button) => button.textContent)).toEqual(
      PRESALE.faqs.items.map((item) => item.question)
    )
  })

  it('shows wave 1 in the repository and pins Today on wave 2 while open', () => {
    mount({ presale: open })
    const [first, second] = columns()
    expect(second).toHaveTextContent(`, ${PRESALE.waves.pin}`)
    expect(first).not.toHaveTextContent(PRESALE.waves.pin)
    expect(waves()).toHaveTextContent('In the repository')
    expect(waves()).not.toHaveTextContent(PRESALE.waves.closedStatus)
    expect(waves().querySelectorAll('[data-roadmap-today]')).toHaveLength(1)
  })

  it('claims nothing is built while closed: wave 1 is being built and carries the pin', () => {
    mount({ presale: closed })
    const [first, second] = columns()
    expect(first).toHaveTextContent(`, ${PRESALE.waves.pin}`)
    expect(second).not.toHaveTextContent(PRESALE.waves.pin)
    expect(waves()).not.toHaveTextContent('In the repository')
    expect(
      waves().querySelectorAll('[data-item-state="shipped"]')
    ).toHaveLength(0)
    expect(
      within(waves()).getAllByText(PRESALE.waves.closedStatus)
    ).toHaveLength(PRESALE.waves.columns[0].items.length)
    expect(waves().querySelectorAll('[data-roadmap-today]')).toHaveLength(1)
  })
})

describe('the founding section, the band and the waitlist', () => {
  it('shows the waitlist while either tier is not on sale and hides it when both are', () => {
    for (const presale of [closed, proOnly]) {
      const view = mount({ presale })
      expect(section('st-join')).not.toBeNull()
      expect(screen.getByTestId('capture')).toBeInTheDocument()
      expect(section('founding')).not.toBeNull()
      view.unmount()
    }

    mount({ presale: open })
    expect(section('st-join')).toBeNull()
    expect(screen.queryByTestId('capture')).not.toBeInTheDocument()
    expect(section('founding')).not.toBeNull()
  })

  it('keeps the founding section on a closed page, with no checkout in it', () => {
    mount({ presale: closed })
    expect(section('founding')).not.toBeNull()
    expect(section('founding').querySelectorAll('form')).toHaveLength(0)
    expect(
      within(section('founding')).getAllByRole('link', {
        name: PRESALE.founding.cta.waitlist,
      })[0]
    ).toHaveAttribute('href', '#st-join')
  })

  it('sends the band to the founding section while open and to the waitlist while closed', () => {
    let view = mount({ presale: open })
    expect(
      within(band()).getByRole('link', { name: PRESALE.band.cta })
    ).toHaveAttribute('href', '#founding')
    view.unmount()

    view = mount({ presale: closed })
    expect(
      within(band()).getByRole('link', { name: PRESALE.band.ctaClosed })
    ).toHaveAttribute('href', '#st-join')
  })

  it('files the waitlist under both picks', () => {
    mount()
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'WareKit waitlist · Standard · Supabase + Creem'
    )
    pick('Data layer', 'Drizzle')
    pick('Payments', 'Polar')
    const capture = screen.getByTestId('capture')
    expect(capture).toHaveTextContent(
      'WareKit waitlist · Standard · Drizzle + Polar'
    )
    expect(capture).toHaveTextContent(
      'Notify me when the WareKit Standard presale opens. My stack: Drizzle and Polar.'
    )
    expect(capture).toHaveTextContent(PRESALE.waitlist.note)
    expect(capture).toHaveTextContent(PRESALE.waitlist.cta)
    expect(capture).toHaveTextContent('me@x.co')
  })

  it('remounts the capture when a pick changes', () => {
    mount()
    const first = screen.getByTestId('capture').dataset.mount
    pick('Data layer', 'Prisma')
    const second = screen.getByTestId('capture').dataset.mount
    expect(second).not.toBe(first)
    pick('Payments', 'Stripe')
    expect(screen.getByTestId('capture').dataset.mount).not.toBe(second)
  })
})

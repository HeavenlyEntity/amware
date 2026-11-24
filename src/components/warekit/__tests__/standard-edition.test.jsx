import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('@/components/react-bits/dither', () => ({
  default: () => <div data-testid="dither" />,
}))
/* Only what the page hands the capture matters here; the form has its own
   tests. The mount id lets a test see whether a pick remounted it. */
vi.mock('@/components/commerce/EmailCapture', () => {
  let mounts = 0
  return {
    EmailCapture: ({ subject, note, cta, successMessage }) => {
      const [id] = useState(() => ++mounts)
      return (
        <div data-testid="capture" data-mount={id}>
          <input aria-label="Email address" />
          <span>{subject}</span>
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
import { PRESALE } from '@/content/site/standard-presale'

/* Shaped like `standardPresale`'s result. */
const open = {
  open: true,
  pro: { state: 'ready', price: 149, slug: 'warekit-standard-pro' },
  team: { state: 'ready', price: 349, slug: 'warekit-standard-team' },
}
const closed = {
  open: false,
  pro: { state: 'planned', price: null, slug: null },
  team: { state: 'planned', price: null, slug: null },
}

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
      screen.getByRole('link', { name: PRESALE.hero.cta })
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
      screen.getByRole('link', { name: PRESALE.hero.ctaClosed })
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
      screen.getByRole('link', { name: PRESALE.hero.ctaClosed })
    ).toHaveAttribute('href', '#st-join')
    expect(container).not.toHaveTextContent(/founding presale/i)
  })
})

describe('the sections', () => {
  it('lists the six problems, the six parts and the six guards', () => {
    mount()
    const section = (id) => document.getElementById(id)

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

    /* The three sections run in order after the hero. */
    const order = [...document.querySelectorAll('section[id]')].map((s) => s.id)
    expect(order).toEqual(['st-pains', 'ships', 'st-guards'])
  })
})

describe('the way back to NetSuite', () => {
  it('still offers the way back to the NetSuite edition, with the same two claims as before', () => {
    /* Nothing on sale: no availability is asserted. */
    let view = mount({ anyOnSale: false })
    for (const text of ['Available now', 'Lite is free']) {
      expect(view.container).not.toHaveTextContent(text)
    }
    expect(view.container).toHaveTextContent('NetSuite edition')
    expect(view.container).toHaveTextContent(
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
    expect(view.container).toHaveTextContent('Available now')
    expect(view.container).toHaveTextContent('Lite is free.')
    view.unmount()

    /* Only a paid edition on sale: available, but nothing is free. */
    view = mount({ anyOnSale: true, liteFree: false })
    expect(view.container).toHaveTextContent('Available now')
    expect(view.container).not.toHaveTextContent('Lite is free')
    expect(view.container).not.toHaveTextContent('free')
  })
})

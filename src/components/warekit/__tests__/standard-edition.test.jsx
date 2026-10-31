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

const mount = (anyOnSale = false, liteFree = false) =>
  render(<StandardEdition anyOnSale={anyOnSale} liteFree={liteFree} />)
const layer = (name) =>
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Data layer' })).getByRole(
      'button',
      { name: new RegExp(name) }
    )
  )
const tree = () => screen.getByText(/planned structure/).closest('.ed-tree')

describe('picking a data layer', () => {
  it('starts on Supabase', () => {
    mount()
    expect(
      screen.getByRole('heading', { name: 'Get the Supabase kit first.' })
    ).toBeInTheDocument()
    expect(tree()).toHaveTextContent('supabase/config.toml')
    expect(screen.getByRole('button', { name: /Supabase/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('moves the tree, the join heading and the subject to Drizzle', () => {
    mount()
    layer('Drizzle')

    expect(
      screen.getByRole('heading', { name: 'Get the Drizzle kit first.' })
    ).toBeInTheDocument()
    expect(tree()).toHaveTextContent('drizzle.config.ts')
    expect(tree()).toHaveTextContent('db/schema.ts')
    expect(tree()).not.toHaveTextContent('supabase/config.toml')
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'WareKit waitlist · Standard · Drizzle'
    )
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'One email when the Drizzle kit ships. Nothing else.'
    )
    expect(screen.getByRole('button', { name: /Drizzle/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: /Supabase/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('wraps the layer files in the shared ones and marks them new', () => {
    mount()
    layer('Prisma')
    const lines = within(tree())
      .getAllByRole('listitem')
      .map((li) => li.textContent.replace(/^\+?(Added: )?/, ''))
    expect(lines).toEqual([
      'app/',
      'components/',
      'prisma/schema.prisma',
      'prisma/migrations/',
      'lib/prisma.ts',
      '.env.example',
      'package.json',
    ])
    const fresh = within(tree())
      .getAllByRole('listitem')
      .filter((li) => li.dataset.new === 'true')
    expect(fresh).toHaveLength(3)
  })

  it('remounts the capture, so one layer’s success does not carry over', () => {
    mount()
    const before = screen.getByTestId('capture').dataset.mount
    layer('Manifest')
    expect(screen.getByTestId('capture').dataset.mount).not.toBe(before)
    expect(tree()).toHaveTextContent('manifest/backend.yml')
  })

  it('keeps the success message tied to the pick', () => {
    mount()
    layer('Prisma')
    expect(screen.getByTestId('capture')).toHaveTextContent(
      'when the Prisma kit ships'
    )
  })
})

describe('with nothing on sale', () => {
  // Review Focus 5
  it('asserts no availability', () => {
    const { container } = mount(false)
    for (const text of ['Available now', 'Lite is free']) {
      expect(container).not.toHaveTextContent(text)
    }
    expect(
      screen.getByRole('link', { name: /On NetSuite\? See that edition/ })
    ).toHaveAttribute('href', '/products')
    expect(container).toHaveTextContent('NetSuite edition')
    expect(container).toHaveTextContent(
      'React apps inside NetSuite or Next.js apps connected to it.'
    )
  })

  it('still asserts none after a pick', () => {
    const { container } = mount(false)
    layer('Prisma')
    expect(container).not.toHaveTextContent('Available now')
    expect(container).not.toHaveTextContent('Lite is free')
  })
})

describe('with an edition on sale', () => {
  it('says so in the hero link and the NetSuite card', () => {
    const { container } = mount(true, true)
    expect(
      screen.getByRole('link', { name: /On NetSuite\? Available now/ })
    ).toHaveAttribute('href', '/products')
    expect(container).toHaveTextContent('Available now')
    expect(container).toHaveTextContent('Lite is free.')
  })

  it('does not call Lite free when only a paid edition is on sale', () => {
    const { container } = mount(true, false)
    expect(container).toHaveTextContent('Available now')
    expect(container).not.toHaveTextContent('Lite is free')
    expect(container).not.toHaveTextContent('free')
  })
})

describe('the page', () => {
  it('links the NetSuite edition card to /products', () => {
    mount()
    const card = screen.getByRole('link', {
      name: /Building on NetSuite\? WareKit NetSuite edition/,
    })
    expect(card).toHaveAttribute('href', '/products')
    expect(card).toHaveTextContent('See the NetSuite edition')
  })

  it('walks the three steps and offers the jump to the join', () => {
    mount()
    expect(screen.getByText('01 · How it works')).toBeInTheDocument()
    expect(screen.getByText('02 · Join the waitlist')).toBeInTheDocument()
    const steps = screen
      .getByRole('heading', { name: 'Your signup decides the build order.' })
      .closest('section')
      .querySelectorAll('ol > li')
    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveTextContent('Pick a data layer')
    expect(
      screen.getByRole('link', { name: /Join the waitlist/ })
    ).toHaveAttribute('href', '#st-join')
    expect(document.getElementById('st-join')).not.toBeNull()
  })
})

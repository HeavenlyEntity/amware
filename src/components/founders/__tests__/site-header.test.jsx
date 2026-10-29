import { existsSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { MenuCard, SiteHeader } from '@/components/SiteHeader'
import {
  CONTACT_EMAIL,
  DIGITAL_PRODUCTS_HREF,
  DIGITAL_PRODUCTS_LIVE,
  menuCards,
  menuHrefs,
} from '@/lib/site-nav'

const APP = path.resolve(process.cwd(), 'src/app/(site)')

describe('SiteHeader', () => {
  it('opens the card menu from the Menu button and exposes every nav link', () => {
    render(<SiteHeader />)
    const button = screen.getByRole('button', { name: /menu/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    for (const href of menuHrefs()) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull()
    }
    expect(screen.getByRole('link', { name: /work with me/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('closes on Escape and returns focus to the button', () => {
    render(<SiteHeader />)
    const button = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(button)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button)
  })

  it('marks the current route as the current page', () => {
    render(<SiteHeader />)
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    /* vitest.setup mocks usePathname as /founders/equity */
    const current = document.querySelector('a[aria-current="page"]')
    expect(current).not.toBeNull()
    expect(current).toHaveAttribute('href', '/founders/equity')
  })
})

describe('Digital Products row', () => {
  const catalog = (live) =>
    menuCards({ digitalProductsLive: live }).find((c) => c.id === 'catalog')

  it('keeps the catalog order', () => {
    expect(catalog(false).links.map((l) => l.label)).toEqual([
      'Boilerplates & Products',
      'Digital Products',
      'Services',
      'Courses',
    ])
  })

  it('is a non-focusable "Soon" row, left out of menuHrefs, while not live', () => {
    expect(menuHrefs({ digitalProductsLive: false })).not.toContain(
      DIGITAL_PRODUCTS_HREF
    )
    render(
      <MenuCard card={catalog(false)} pathname="/" onNavigate={() => {}} />
    )
    expect(
      document.querySelector(`a[href="${DIGITAL_PRODUCTS_HREF}"]`)
    ).toBeNull()
    const row = screen.getByText('Digital Products').parentElement
    expect(row.tagName).toBe('SPAN')
    expect(row).toHaveTextContent('Soon')
    expect(row.querySelector('svg')).toBeNull()
    expect(row).not.toHaveAttribute('tabindex')
  })

  it('becomes a normal link and joins menuHrefs once live', () => {
    expect(menuHrefs({ digitalProductsLive: true })).toContain(
      DIGITAL_PRODUCTS_HREF
    )
    render(<MenuCard card={catalog(true)} pathname="/" onNavigate={() => {}} />)
    const link = screen.getByRole('link', { name: /digital products/i })
    expect(link).toHaveAttribute('href', DIGITAL_PRODUCTS_HREF)
    expect(link).not.toHaveTextContent('Soon')
  })

  it('is only live when its page exists', () => {
    const dir = path.join(APP, DIGITAL_PRODUCTS_HREF.replace(/^\//, ''))
    const exists = ['page.jsx', 'page.tsx', 'page.js'].some((f) =>
      existsSync(path.join(dir, f))
    )
    expect(DIGITAL_PRODUCTS_LIVE).toBe(exists)
  })
})

describe('menu cards', () => {
  /* jsdom's navigator properties are prototype getters, so clipboard is
     defined on the instance and removed after each test. */
  const setClipboard = (value) =>
    Object.defineProperty(navigator, 'clipboard', {
      value,
      configurable: true,
    })
  const contact = () => menuCards().find((c) => c.id === 'contact')
  const renderContact = () =>
    render(<MenuCard card={contact()} pathname="/" onNavigate={() => {}} />)
  const clickCopy = () =>
    act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /copy email address/i })
      )
    })

  afterEach(() => {
    vi.useRealTimers()
    delete navigator.clipboard
  })

  it("lists the desk's coming-soon tools as plain chips, not links", () => {
    const desk = menuCards().find((c) => c.id === 'founders')
    render(<MenuCard card={desk} pathname="/" onNavigate={() => {}} />)
    const list = screen.getByRole('list', { name: /coming soon/i })
    const chips = list.querySelectorAll('li')
    expect(chips).toHaveLength(desk.soon.length)
    expect(list.querySelector('a')).toBeNull()
  })

  it('offers Email me and a copy button instead of the raw address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    renderContact()
    const mail = screen.getByRole('link', { name: /email me/i })
    expect(mail).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    expect(mail).toHaveAttribute('title', CONTACT_EMAIL)
    expect(screen.queryByText('Email address copied')).toBeNull()
    vi.useFakeTimers()
    await clickCopy()
    expect(writeText).toHaveBeenCalledWith(CONTACT_EMAIL)
    expect(
      screen.getByRole('button', { name: /copied to clipboard/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Email address copied')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(
      screen.getByRole('button', { name: /copy email address/i })
    ).toBeInTheDocument()
    expect(screen.queryByText('Email address copied')).toBeNull()
  })

  it('says so when the clipboard write fails, then resets', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    renderContact()
    vi.useFakeTimers()
    await clickCopy()
    expect(
      screen.getByRole('button', { name: /copy failed, use email me/i })
    ).toBeInTheDocument()
    expect(screen.queryByText(/copied to clipboard/i)).toBeNull()
    expect(screen.queryByText('Email address copied')).toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(
      screen.getByRole('button', { name: /copy email address/i })
    ).toBeInTheDocument()
  })

  it('treats a missing clipboard API (insecure context) as a failure', async () => {
    setClipboard(undefined)
    renderContact()
    await clickCopy()
    expect(
      screen.getByRole('button', { name: /copy failed, use email me/i })
    ).toBeInTheDocument()
  })

  it('keeps the copy button inside the open menu focus trap', () => {
    render(<SiteHeader />)
    const menu = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menu)
    const copyButton = screen.getByRole('button', {
      name: /copy email address/i,
    })
    copyButton.focus()
    expect(document.activeElement).toBe(copyButton)
    /* Shift+Tab from the first control wraps to the last, which stays in
       the header; the copy button is a tabbable control in that set. */
    const header = menu.closest('header')
    const tabbables = header.querySelectorAll(
      'a[href], button:not(:disabled), [tabindex="0"]'
    )
    expect([...tabbables]).toContain(copyButton)
  })
})

describe('site nav registry', () => {
  it('every internal menu route has a page under src/app/(site)', () => {
    for (const href of menuHrefs()) {
      const dir = path.join(APP, href.replace(/^\//, ''))
      const exists = ['page.jsx', 'page.tsx', 'page.js'].some((f) =>
        existsSync(path.join(dir, f))
      )
      expect(exists, `${href} has no page`).toBe(true)
    }
  })
})

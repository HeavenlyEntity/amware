import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

/* Reduced motion makes menu rows fire on click instead of after the 150ms
   highlight blink, so the tests do not need fake timers. */
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => true,
}))

const { FoundersDeskDock } = await import('../desk-dock')
const { announceDesk } = await import('../desk-toast')
const { INITIAL, STORAGE_KEY, useOfferStore } = await import(
  '@/lib/founders/offer-store'
)
const { siteOrigin } = await import('@/lib/site-origin')
const { CONTACT_EMAIL } = await import('@/lib/site-nav')
const { liveTools, soonTools } = await import('@/lib/founders/tools')

const toolbar = () =>
  screen.getByRole('toolbar', { name: 'Founders’ Desk tools' })
const tile = (name) =>
  within(toolbar()).queryByRole('link', { name }) ??
  within(toolbar()).getByRole('button', { name })
const openMenu = (name) => {
  fireEvent.contextMenu(tile(name))
  return screen.getByRole('menu')
}

let phone = false
const writeText = vi.fn()

beforeEach(() => {
  phone = false
  window.matchMedia = (query) => ({
    matches: query === '(max-width: 639px)' ? phone : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  useOfferStore.setState({ ...INITIAL })
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('tiles come from the tool registry', () => {
  it('links the desk, every live tool and the review, in that order', () => {
    render(<FoundersDeskDock current="desk" />)
    const links = within(toolbar()).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/founders',
      ...liveTools().map((tool) => tool.href),
      '/contact/offer-review',
    ])
  })

  it('renders every soon tool as a button, never a link', () => {
    render(<FoundersDeskDock current="desk" />)
    for (const tool of soonTools()) {
      const button = tile(`${tool.label}, coming soon`)
      expect(button.tagName).toBe('BUTTON')
    }
  })

  it('marks only the current page', () => {
    render(<FoundersDeskDock current="equity" />)
    expect(tile('Equity calculator')).toHaveAttribute('aria-current', 'page')
    expect(tile('Founders’ Desk')).not.toHaveAttribute('aria-current')
    expect(tile('Job offer calculator')).not.toHaveAttribute('aria-current')
  })

  it('leaves the soon tools out on phones, where ten tiles would shrink under 44px', () => {
    phone = true
    render(<FoundersDeskDock current="desk" />)
    for (const tool of soonTools()) {
      expect(
        within(toolbar()).queryByRole('button', {
          name: `${tool.label}, coming soon`,
        })
      ).toBeNull()
    }
    expect(tile('Clear my answers')).toBeInTheDocument()
  })
})

describe('context menus', () => {
  it('says "You are here" on the current page and offers the worked example', () => {
    render(<FoundersDeskDock current="equity" onExample={() => {}} />)
    const menu = openMenu('Equity calculator')
    expect(
      within(menu).getByRole('menuitem', { name: 'You are here' })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(menu).getByRole('menuitem', {
        name: 'Open with the worked example',
      })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: /Copy link/ })
    ).toBeInTheDocument()
  })

  it('opens another tool with "Open"', () => {
    render(<FoundersDeskDock current="equity" />)
    const menu = openMenu('Job offer calculator')
    expect(
      within(menu).getByRole('menuitem', { name: 'Open' })
    ).not.toHaveAttribute('aria-disabled')
  })

  it('offers the email address on the review tile only', () => {
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Review my offer')
    expect(
      within(menu).getByRole('menuitem', { name: 'Copy email address' })
    ).toBeInTheDocument()
    expect(
      within(menu).queryByRole('menuitem', {
        name: 'Open with the worked example',
      })
    ).toBeNull()
  })

  it('gives a soon tool a disabled "Coming soon" and what it will do', () => {
    const [tool] = soonTools()
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu(`${tool.label}, coming soon`)
    expect(
      within(menu).getByRole('menuitem', { name: 'Coming soon' })
    ).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'What it will do' })
    )
    expect(screen.getByRole('status')).toHaveTextContent(tool.blurb)
  })

  it('starts "Remember answers in this browser" unchecked', () => {
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Clear my answers')
    expect(
      within(menu).getByRole('menuitemcheckbox', {
        name: 'Remember answers in this browser',
      })
    ).toHaveAttribute('aria-checked', 'false')
  })
})

describe('copying', () => {
  it('copies the canonical link, not the current origin', async () => {
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Equity calculator')
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Copy link/ }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${siteOrigin}/founders/equity`)
    )
    expect(siteOrigin).not.toBe(window.location.origin)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Link copied · /founders/equity'
      )
    )
  })

  it('copies the contact address', async () => {
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Review my offer')
    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'Copy email address' })
    )
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(CONTACT_EMAIL))
  })

  it('says so and shows the text when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Equity calculator')
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Copy link/ }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        `Couldn't copy. Here it is: ${siteOrigin}/founders/equity`
      )
    )
  })
})

describe('the bin', () => {
  it('clears the store and its storage, then says there is nothing left', () => {
    useOfferStore.getState().set({ role: 'engineer', offeredSalary: 180000 })
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()
    render(<FoundersDeskDock current="desk" />)

    fireEvent.click(tile('Clear my answers'))
    expect(useOfferStore.getState().isPristine()).toBe(true)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Answers cleared')

    fireEvent.click(tile('Clear my answers'))
    expect(screen.getByRole('status')).toHaveTextContent('Nothing saved yet')
  })

  it("uses the page's own reset when it has one", () => {
    const onClear = vi.fn()
    render(<FoundersDeskDock current="equity" onClear={onClear} />)
    fireEvent.click(tile('Clear my answers'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('moves the answers to localStorage when asked to remember them', () => {
    useOfferStore.getState().set({ role: 'engineer' })
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Clear my answers')
    fireEvent.click(
      within(menu).getByRole('menuitemcheckbox', {
        name: 'Remember answers in this browser',
      })
    )
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Answers kept in this browser'
    )
    act(() => {
      useOfferStore.getState().clear()
    })
  })
})

describe('the review badge', () => {
  it('appears on a calculator once there is a result to send', () => {
    render(<FoundersDeskDock current="equity" readReady />)
    expect(tile('Review my offer, ready to send')).toBeInTheDocument()
  })

  it('never appears off the calculators', () => {
    render(<FoundersDeskDock current="desk" readReady />)
    expect(tile('Review my offer')).toBeInTheDocument()
    expect(
      within(toolbar()).queryByRole('link', {
        name: 'Review my offer, ready to send',
      })
    ).toBeNull()
  })
})

describe('the worked example', () => {
  it('loads once from ?example and strips the param', () => {
    window.history.replaceState(null, '', '/founders/equity?example')
    const onExample = vi.fn()
    const { rerender } = render(
      <FoundersDeskDock current="equity" onExample={onExample} />
    )
    expect(onExample).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Worked example loaded'
    )
    rerender(<FoundersDeskDock current="equity" onExample={onExample} />)
    expect(onExample).toHaveBeenCalledTimes(1)
  })

  it('loads in place from the current calculator’s menu', () => {
    const onExample = vi.fn()
    render(<FoundersDeskDock current="equity" onExample={onExample} />)
    const menu = openMenu('Equity calculator')
    fireEvent.click(
      within(menu).getByRole('menuitem', {
        name: 'Open with the worked example',
      })
    )
    expect(onExample).toHaveBeenCalledTimes(1)
  })

  it('warns when the example replaces answers already given', () => {
    useOfferStore.getState().set({ role: 'engineer' })
    window.history.replaceState(null, '', '/founders/equity?example')
    render(<FoundersDeskDock current="equity" onExample={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Replaced your answers with the worked example'
    )
  })
})

describe('room at the bottom', () => {
  it('reserves footer space while mounted and releases it after', () => {
    const { unmount } = render(<FoundersDeskDock current="desk" />)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--desk-dock-space')).not.toBe('')
    unmount()
    expect(root.style.getPropertyValue('--desk-dock-space')).toBe('')
  })
})

describe('review fixes', () => {
  it('keeps a failed copy on screen, selectable, until dismissed', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    render(<FoundersDeskDock current="desk" />)
    const menu = openMenu('Review my offer')
    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'Copy email address' })
    )
    const dismiss = await screen.findByRole('button', { name: 'Dismiss' })
    expect(screen.getByText(CONTACT_EMAIL)).toHaveClass('select-all')
    fireEvent.click(dismiss)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('is one Tab stop: only the first tile is tabbable until another is focused', () => {
    render(<FoundersDeskDock current="desk" />)
    const tabbable = [...toolbar().querySelectorAll('[tabindex="0"]')]
    expect(tabbable).toEqual([tile('Founders’ Desk')])
    act(() => tile('Equity calculator').focus())
    expect(tile('Equity calculator')).toHaveAttribute('tabindex', '0')
    expect(tile('Founders’ Desk')).toHaveAttribute('tabindex', '-1')
  })

  it('announces how to open a tile menu', () => {
    render(<FoundersDeskDock current="desk" />)
    expect(tile('Clear my answers')).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowUp Shift+F10 ContextMenu'
    )
  })
})

describe('page toasts', () => {
  it('shows what a page announces in the dock status', () => {
    render(<FoundersDeskDock current="equity" />)
    act(() => announceDesk('x'))
    expect(screen.getByRole('status')).toHaveTextContent('x')
  })
})

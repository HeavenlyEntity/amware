import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

/* SeatManager imports addSeat, which imports these through the `@/` alias. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))

/* The upgrade action is stubbed so the button's states can be driven without
   Creem or the CMS. Its own behaviour is tested in licenseUpgrade.test.js. */
const startUpgrade = vi.fn()
vi.mock('@/lib/commerce/licenseUpgrade', () => ({
  startUpgrade: (...args) => startUpgrade(...args),
}))

/* The router is recorded so the page's own re-check URL can be read back. */
let replace
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/access/seats/signed-tok',
  useSearchParams: () => new URLSearchParams(),
}))

import { LicensePanel } from '../LicensePanel'
import { MAX_ATTEMPTS } from '@/lib/commerce/pendingRefresh'

beforeEach(() => {
  replace = vi.fn()
  startUpgrade.mockReset()
  startUpgrade.mockResolvedValue({ error: null })
})

const KEY = 'WAREKIT-ABCD-EFGH-IJKL-1234'

const pro = {
  token: 'signed-tok',
  license: {
    id: 9,
    tier: 'pro',
    seatMembers: [{ githubUsername: 'owner' }],
    accounts: [{ accountId: '7654321', status: 'active' }],
  },
  product: {
    name: 'WareKit Next NetSuite (Pro)',
    githubRepo: 'amwaredotdev/x',
  },
  limits: { seats: 1, accounts: 1 },
  keyValue: KEY,
  action: { kind: 'upgrade-team', urgent: true },
  // Team $999 less Pro $499, and what Team's row says it allows.
  upgrade: { cost: 500, seats: 5, accounts: 3 },
}

const MOVE = 'Move to Team · $500.00'
const CONFIRMING = "Confirming your upgrade. You don't need to pay again."

const panel = (over = {}) => render(<LicensePanel {...pro} {...over} />)
const cleanupAll = () => (document.body.innerHTML = '')

describe('LicensePanel', () => {
  it('leads with kit and tier, then usage, then one action', () => {
    panel()
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'WareKit Next NetSuite (Pro)',
    })
    const usage = screen.getByText('1 / 1 developers')
    const upgrade = screen.getByRole('button', { name: MOVE })
    const add = screen.getByRole('button', { name: /add to the license/i })

    const before = (a, b) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText('Pro license')).toBeInTheDocument()
    expect(before(heading, usage)).toBe(true)
    // Between the usage card and the add form, and after the account usage.
    expect(before(usage, upgrade)).toBe(true)
    expect(before(screen.getByText('1 / 1 NetSuite accounts'), upgrade)).toBe(
      true
    )
    expect(before(upgrade, add)).toBe(true)
  })

  it('shows 1 / 1 developers and 1 / 1 NetSuite accounts', () => {
    panel()
    expect(screen.getByText('1 / 1 developers')).toBeInTheDocument()
    expect(screen.getByText('1 / 1 NetSuite accounts')).toBeInTheDocument()
    expect(screen.getByText('7654321')).toBeInTheDocument()
  })

  it('says "Add your first developer" with no seats', () => {
    panel({ license: { ...pro.license, seatMembers: [] } })
    expect(screen.getByText('Add your first developer')).toBeInTheDocument()
    expect(screen.getByText('0 / 1 developers')).toBeInTheDocument()
    // Nobody is claimed on the buyer's behalf.
    expect(screen.queryByText(/already assigned/i)).toBeNull()
  })

  it('says accounts show up after the first ns:deploy', () => {
    panel({ license: { ...pro.license, accounts: [] } })
    expect(
      screen.getByText((_, el) =>
        el?.tagName === 'P'
          ? el.textContent === 'Shows up after your first pnpm ns:deploy.'
          : false
      )
    ).toBeInTheDocument()
    expect(screen.getByText('0 / 1 NetSuite accounts')).toBeInTheDocument()
  })

  it('does not track NetSuite accounts on Lite', () => {
    panel({
      license: { ...pro.license, tier: 'lite' },
      limits: { seats: 1, accounts: null },
    })
    expect(screen.queryByText(/NetSuite accounts/)).toBeNull()
    // Lite is free and issues no key.
    expect(screen.queryByText(/license key/i)).toBeNull()
  })

  it('masks the key until Reveal, and Copy copies the env line', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    panel()

    expect(screen.queryByText(KEY)).toBeNull()
    expect(screen.getByText('••••1234')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByText(KEY)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(`WAREKIT_LICENSE_KEY=${KEY}`)
    expect(await screen.findByText(/^Copied\./)).toBeInTheDocument()
    expect(screen.getByText(/^Copied\./)).toHaveAttribute('role', 'status')
  })

  it('says so when the browser refuses to copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    panel()
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await screen.findByText(/would not copy/i)
    expect(
      screen
        .getAllByRole('status')
        .some((el) => /would not copy/i.test(el.textContent))
    ).toBe(true)
  })

  it('tells an older license with no key to get in touch', () => {
    panel({ keyValue: null })
    expect(screen.getByText(/get in touch for your key/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal' })).toBeNull()
    expect(screen.getByRole('link', { name: /contact me/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('says the license was refunded when tier is null', () => {
    panel({
      license: { ...pro.license, tier: null },
      product: null,
      limits: { seats: 1, accounts: null },
    })
    expect(screen.getByText(/this license was refunded/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    // Nothing to manage on a refunded license.
    expect(
      screen.queryByRole('button', { name: /add to the license/i })
    ).toBeNull()
    expect(screen.queryByText(/license key/i)).toBeNull()
  })

  it('marks an over-limit account', () => {
    panel({
      license: {
        ...pro.license,
        accounts: [
          { accountId: '7654321', status: 'active' },
          { accountId: '1111111', status: 'over_limit' },
        ],
      },
    })
    const row = screen.getByText('1111111').closest('li')
    expect(within(row).getByText('Over your limit')).toBeInTheDocument()
    const ok = screen.getByText('7654321').closest('li')
    expect(within(ok).queryByText('Over your limit')).toBeNull()
    // The over-limit account is listed, but does not use the allowance.
    expect(screen.getByText('1 / 1 NetSuite accounts')).toBeInTheDocument()
  })

  it('uses "license" and "developers" and never "licence"', () => {
    const { container } = panel()
    expect(container.textContent).not.toMatch(/licence/i)
    expect(container.textContent).not.toMatch(/GitHub accounts/i)
  })
})

describe('LicensePanel upgrade', () => {
  it('shows Move to Team with the live price difference', () => {
    // Team $999, Pro $499.
    panel({ upgrade: { cost: 999 - 499, seats: 5, accounts: 3 } })
    expect(screen.getByRole('button', { name: MOVE })).toBeInTheDocument()
    // Computed from the data: another price gives another number.
    panel({ upgrade: { cost: 250.5, seats: 5, accounts: 3 } })
    expect(
      screen.getByRole('button', { name: 'Move to Team · $250.50' })
    ).toBeInTheDocument()
  })

  it('makes the button teal only when urgent', () => {
    panel({ action: { kind: 'upgrade-team', urgent: true } })
    expect(screen.getByRole('button', { name: MOVE })).toHaveClass('amw-cta')
    cleanupAll()

    panel({ action: { kind: 'upgrade-team', urgent: false } })
    const quiet = screen.getByRole('button', { name: MOVE })
    expect(quiet).not.toHaveClass('amw-cta')
    // Quieter, not hidden, and still a full-size target.
    expect(quiet).toHaveClass('min-h-11')
  })

  it('says the code, repo and key stay the same, with limits from the data', () => {
    panel()
    expect(
      screen.getByText(
        'Your code, repo and key stay the same. You get 5 developers and 3 NetSuite accounts.'
      )
    ).toBeInTheDocument()
    cleanupAll()

    panel({ upgrade: { cost: 500, seats: 8, accounts: 1 } })
    expect(
      screen.getByText(
        'Your code, repo and key stay the same. You get 8 developers and 1 NetSuite account.'
      )
    ).toBeInTheDocument()
  })

  it('posts the signed link and the target, and nothing else', () => {
    const { container } = panel()
    const form = screen.getByRole('button', { name: MOVE }).closest('form')
    expect([...new FormData(form).entries()]).toEqual([
      ['token', 'signed-tok'],
      ['target', 'team'],
    ])
    expect(container.querySelector('input[name="price"]')).toBeNull()
  })

  it('labels the button while opening checkout, and shows an error in place', async () => {
    let resolve
    startUpgrade.mockReturnValue(new Promise((r) => (resolve = r)))
    panel()
    fireEvent.submit(screen.getByRole('button', { name: MOVE }).closest('form'))

    const pending = await screen.findByRole('button', {
      name: 'Opening checkout',
    })
    expect(pending).toBeDisabled()

    await act(async () => {
      resolve({
        error: {
          message: 'Nothing was charged. Try again or get in touch.',
        },
      })
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was charged. Try again or get in touch.'
    )
    // The button is back, so it can be tried again.
    expect(screen.getByRole('button', { name: MOVE })).toBeEnabled()
  })

  it('offers nothing to upgrade on Team, Lite or Enterprise', () => {
    for (const tier of ['team', 'lite', 'enterprise']) {
      panel({
        license: { ...pro.license, tier },
        action: { kind: null, urgent: false },
        upgrade: null,
      })
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      cleanupAll()
    }
  })

  it('shows no button when there is no price to name', () => {
    panel({ upgrade: null })
    expect(screen.queryByRole('button', { name: /move to team/i })).toBeNull()
    // The page still works: developers can be added.
    expect(
      screen.getByRole('button', { name: /add to the license/i })
    ).toBeInTheDocument()
  })

  it('does not offer the move to Team for a quote or a Team limit', () => {
    for (const kind of ['enterprise-quote', 'enterprise-contact']) {
      panel({ action: { kind, urgent: true } })
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      cleanupAll()
    }
  })

  describe('returning from Creem', () => {
    it('shows no upgrade button while confirming', () => {
      panel({ upgraded: 'team', attempt: 0 })
      expect(screen.getByText(CONFIRMING)).toBeInTheDocument()
      expect(screen.getByText(CONFIRMING)).toHaveAttribute('role', 'status')
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /opening/i })).toBeNull()
    })

    it('checks again with the upgrade kept and the attempt moved on', () => {
      vi.useFakeTimers()
      try {
        panel({ upgraded: 'team', attempt: 2 })
        act(() => {
          vi.advanceTimersByTime(5000)
        })
        expect(replace).toHaveBeenCalledTimes(1)
        const url = new URL(replace.mock.calls[0][0], 'https://amware.dev')
        expect(url.pathname).toBe('/access/seats/signed-tok')
        expect([...url.searchParams]).toEqual([
          ['upgraded', 'team'],
          ['attempt', '3'],
        ])
      } finally {
        vi.useRealTimers()
      }
    })

    it('confirms the upgrade once the tier changes', async () => {
      panel({
        license: { ...pro.license, tier: 'team' },
        upgraded: 'team',
        action: { kind: null, urgent: false },
        upgrade: null,
        limits: { seats: 5, accounts: 3 },
      })
      expect(screen.getByText("You're on Team.")).toHaveAttribute(
        'role',
        'status'
      )
      expect(screen.queryByText(CONFIRMING)).toBeNull()
      expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByPlaceholderText('your-github-username')
        )
      )
    })

    it('moves focus to the add-developer field when the refresh brings the tier', async () => {
      // The page is refreshed in place: the same panel gets new props, so
      // focus cannot depend on the first render.
      const teamed = {
        ...pro,
        license: { ...pro.license, tier: 'team' },
        action: { kind: null, urgent: false },
        upgrade: null,
        limits: { seats: 5, accounts: 3 },
        upgraded: 'team',
      }
      const { rerender } = render(
        <LicensePanel {...pro} upgraded="team" attempt={1} />
      )
      const field = screen.getByPlaceholderText('your-github-username')
      expect(document.activeElement).not.toBe(field)

      rerender(<LicensePanel {...teamed} />)
      await waitFor(() => expect(document.activeElement).toBe(field))
      expect(screen.getByText("You're on Team.")).toBeInTheDocument()
    })

    it('does not steal focus on an ordinary visit', () => {
      panel({ license: { ...pro.license, tier: 'team' } })
      expect(document.activeElement).toBe(document.body)
    })

    it('gives a refresh link and contact when the checks run out', () => {
      vi.useFakeTimers()
      try {
        panel({ upgraded: 'team', attempt: MAX_ATTEMPTS })
        expect(screen.getByText(CONFIRMING)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
        expect(
          screen.getByRole('link', { name: 'Refresh the page' })
        ).toHaveAttribute('href', '/access/seats/signed-tok?upgraded=team')
        expect(
          screen.getByRole('link', { name: 'get in touch' })
        ).toHaveAttribute('href', '/contact')
        // The automatic re-check has stopped.
        act(() => {
          vi.advanceTimersByTime(60000)
        })
        expect(replace).not.toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })

    it('keeps the automatic re-check while checks remain', () => {
      panel({ upgraded: 'team', attempt: MAX_ATTEMPTS - 1 })
      expect(
        screen.getByText(/checks again automatically/i)
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Refresh the page' })
      ).toBeNull()
    })

    it('ignores an upgraded value that is not an upgrade target', () => {
      for (const upgraded of ['gold', '', 'pro', '__proto__', undefined]) {
        panel({ upgraded })
        expect(screen.queryByText(CONFIRMING)).toBeNull()
        expect(screen.queryByText(/you're on/i)).toBeNull()
        expect(screen.getByRole('button', { name: MOVE })).toBeInTheDocument()
        cleanupAll()
      }
    })

    it('does not unlock or confirm anything for a license that has not moved', () => {
      // upgraded=team on a Pro license only says the page is waiting.
      panel({ upgraded: 'team' })
      expect(screen.queryByText("You're on Team.")).toBeNull()
      expect(screen.getByText('Pro license')).toBeInTheDocument()
    })

    it('says "You\'re on" only for the tier the license holds', () => {
      // A Team license opened with upgraded=enterprise is still confirming.
      panel({
        license: { ...pro.license, tier: 'team' },
        upgraded: 'enterprise',
        action: { kind: null, urgent: false },
        upgrade: null,
      })
      expect(screen.getByText(CONFIRMING)).toBeInTheDocument()
      expect(screen.queryByText(/you're on/i)).toBeNull()
      cleanupAll()

      // A license already past the tier named shows the normal page.
      panel({
        license: { ...pro.license, tier: 'enterprise' },
        upgraded: 'team',
        action: { kind: null, urgent: false },
        upgrade: null,
      })
      expect(screen.queryByText(/you're on/i)).toBeNull()
      expect(screen.queryByText(CONFIRMING)).toBeNull()
    })

    it('is confirming, not refunded, for a new license waiting on its first payment', () => {
      panel({
        license: { ...pro.license, tier: null },
        product: null,
        limits: { seats: 1, accounts: null },
        upgraded: 'enterprise',
      })
      expect(screen.getByText(CONFIRMING)).toBeInTheDocument()
      expect(screen.queryByText(/was refunded/i)).toBeNull()
    })

    it('still says refunded for a null tier with nothing pending', () => {
      panel({
        license: { ...pro.license, tier: null },
        product: null,
        limits: { seats: 1, accounts: null },
        upgraded: 'bogus',
      })
      expect(screen.getByText(/this license was refunded/i)).toBeInTheDocument()
    })
  })
})

describe('LicensePanel refunds below Pro', () => {
  const lite = {
    license: { ...pro.license, tier: 'lite', accounts: [] },
    product: { name: 'WareKit Next NetSuite (Lite)' },
    limits: { seats: 1, accounts: null },
    action: { kind: null, urgent: false },
    upgrade: null,
  }

  it('says refunded on a Lite license whose purchase was refunded', () => {
    panel({ ...lite, refunded: true })
    expect(screen.getByText(/this license was refunded/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add to the license/i })
    ).toBeNull()
  })

  it('shows a Lite license as usual otherwise', () => {
    panel(lite)
    expect(screen.queryByText(/was refunded/i)).toBeNull()
  })

  it('does not call a paid license refunded because one row was', () => {
    panel({ refunded: true })
    expect(screen.queryByText(/was refunded/i)).toBeNull()
    expect(screen.getByRole('button', { name: MOVE })).toBeInTheDocument()
  })
})

describe('LicensePanel kit name', () => {
  const heading = () => screen.getByRole('heading', { level: 1 })
  const enterprise = {
    license: { ...pro.license, tier: 'enterprise', stack: 'next-netsuite' },
    product: null,
    action: { kind: null, urgent: false },
    upgrade: null,
    limits: { seats: 12, accounts: 4 },
  }

  it('names the kit on an Enterprise page, which has no product', () => {
    panel(enterprise)
    expect(heading()).toHaveTextContent('WareKit Next NetSuite')
  })

  it('names the kit on a quote and a refund too', () => {
    panel({
      ...enterprise,
      license: { ...enterprise.license, tier: null, stack: 'react-netsuite' },
      action: { kind: 'enterprise-quote', urgent: false },
    })
    expect(heading()).toHaveTextContent('WareKit React NetSuite')
    cleanupAll()
    panel({
      ...enterprise,
      license: { ...enterprise.license, tier: null },
    })
    expect(heading()).toHaveTextContent('WareKit Next NetSuite')
  })

  it('keeps the product name where there is one', () => {
    panel()
    expect(heading()).toHaveTextContent('WareKit Next NetSuite (Pro)')
  })
})

describe('LicensePanel funnel events', () => {
  let track

  beforeEach(() => {
    track = vi.fn()
    window.whop = { track }
  })
  afterEach(() => {
    delete window.whop
  })

  const press = (name) =>
    fireEvent.submit(screen.getByRole('button', { name }).closest('form'))

  it('fires begin_checkout for Team with the price the button names', () => {
    panel({
      upgrade: {
        ...pro.upgrade,
        slug: 'warekit-next-netsuite-team',
        name: 'WareKit Next NetSuite (Team)',
      },
    })
    press(MOVE)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('begin_checkout', {
      value: 500,
      currency: 'USD',
      content_type: 'product',
      content_id: 'warekit-next-netsuite-team',
      content_name: 'WareKit Next NetSuite (Team)',
    })
  })

  it('fires begin_checkout for a quote, with no value to give', () => {
    panel({
      license: { ...pro.license, stack: 'next-netsuite' },
      product: null,
      action: { kind: 'enterprise-quote', urgent: false },
      upgrade: null,
    })
    press('Complete your Enterprise upgrade')
    expect(track).toHaveBeenCalledWith('begin_checkout', {
      currency: 'USD',
      content_type: 'product',
      content_id: 'next-netsuite-enterprise',
      content_name: 'WareKit Next NetSuite (Enterprise)',
    })
  })

  const done = {
    license: { ...pro.license, tier: 'team' },
    limits: { seats: 5, accounts: 3 },
    upgraded: 'team',
    sale: {
      eventId: 'req_upgrade',
      value: 500,
      currency: 'USD',
      contentName: 'WareKit Next NetSuite (Team)',
    },
  }

  it('reports the sale once, on the done phase only', () => {
    const { rerender } = render(<LicensePanel {...pro} {...done} />)
    rerender(<LicensePanel {...pro} {...done} attempt={1} />)

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('purchase', {
      value: 500,
      currency: 'USD',
      event_id: 'req_upgrade',
      content_name: 'WareKit Next NetSuite (Team)',
    })
  })

  it('reports nothing while confirming, or with no sale to report', () => {
    panel({ upgraded: 'team', sale: done.sale })
    cleanupAll()
    panel({ ...done, sale: null })
    expect(track).not.toHaveBeenCalled()
  })

  it('does not break the page where the pixel is not loaded', () => {
    delete window.whop
    panel(done)
    expect(screen.getByText("You're on Team.")).toBeInTheDocument()
    expect(() => panel()).not.toThrow()
  })
})

describe('LicensePanel Enterprise', () => {
  const COMPLETE = 'Complete your Enterprise upgrade'
  const quoted = {
    action: { kind: 'enterprise-quote', urgent: false },
    upgrade: null,
  }
  const teal = () =>
    [...document.querySelectorAll('.amw-cta')].map((el) => el.textContent)

  it('shows Complete your Enterprise upgrade when a quote exists', () => {
    panel({
      ...quoted,
      license: { ...pro.license, seatOverride: 12, accountOverride: 4 },
    })
    expect(screen.getByRole('button', { name: COMPLETE })).toBeInTheDocument()
    // The numbers are the license's own, not copy.
    expect(
      screen.getByText(
        'Your quote covers 12 developers and 4 NetSuite accounts.'
      )
    ).toBeInTheDocument()
    // The Team move is not offered beside it.
    expect(screen.queryByRole('button', { name: /move to/i })).toBeNull()
  })

  it('posts the signed link and Enterprise as the target, and nothing else', () => {
    panel(quoted)
    const form = screen.getByRole('button', { name: COMPLETE }).closest('form')
    expect([...new FormData(form).entries()]).toEqual([
      ['token', 'signed-tok'],
      ['target', 'enterprise'],
    ])
  })

  it('offers the quote on a license with no tier yet, and never calls it refunded', () => {
    panel({
      ...quoted,
      license: {
        ...pro.license,
        tier: null,
        seatMembers: [],
        accounts: [],
        seatOverride: 12,
        accountOverride: 4,
      },
      product: null,
      limits: { seats: 12, accounts: null },
    })
    expect(screen.getByRole('button', { name: COMPLETE })).toBeInTheDocument()
    expect(screen.queryByText(/was refunded/i)).toBeNull()
    expect(
      screen.getByText(
        'Your quote covers 12 developers and 4 NetSuite accounts.'
      )
    ).toBeInTheDocument()
    // Nothing to manage until it is paid for.
    expect(
      screen.queryByRole('button', { name: /add to the license/i })
    ).toBeNull()
    expect(screen.queryByText(/license key/i)).toBeNull()
  })

  it('still says refunded for a license with no tier and no quote', () => {
    panel({
      license: { ...pro.license, tier: null },
      product: null,
      limits: { seats: 1, accounts: null },
      action: { kind: null, urgent: false },
    })
    expect(screen.getByText(/this license was refunded/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COMPLETE })).toBeNull()
  })

  it('names the terms only when the license has both numbers', () => {
    panel({ ...quoted, license: { ...pro.license, seatOverride: 12 } })
    expect(screen.getByRole('button', { name: COMPLETE })).toBeInTheDocument()
    expect(screen.queryByText(/your quote covers/i)).toBeNull()
  })

  it('makes the Enterprise action the page’s one teal button', () => {
    panel(quoted)
    expect(teal()).toEqual([COMPLETE])
    expect(
      screen.getByRole('button', { name: /add to the license/i })
    ).not.toHaveClass('amw-cta')
  })

  it('keeps the add-developer button quiet when the upgrade is teal', () => {
    panel({ action: { kind: 'upgrade-team', urgent: true } })
    expect(teal()).toEqual([MOVE])
    expect(
      screen.getByRole('button', { name: /add to the license/i })
    ).toBeEnabled()
  })

  it('links a full Team license to a prefilled contact form', () => {
    panel({
      license: { ...pro.license, tier: 'team', stack: 'next-netsuite' },
      action: { kind: 'enterprise-contact', urgent: true },
      upgrade: null,
      limits: { seats: 5, accounts: 3 },
    })
    const link = screen.getByRole('link', {
      name: 'Talk to me about Enterprise',
    })
    expect(link).toHaveAttribute(
      'href',
      '/contact/enterprise?kit=next-netsuite&tier=team'
    )
    // It is the page's one teal action, and not a payment button.
    expect(link).toHaveClass('amw-cta')
    expect(teal()).toEqual(['Talk to me about Enterprise'])
    expect(screen.queryByRole('button', { name: COMPLETE })).toBeNull()
  })

  it('leaves Enterprise contact off a license that is not Team', () => {
    for (const tier of ['pro', 'enterprise']) {
      panel({
        license: { ...pro.license, tier, stack: 'next-netsuite' },
        action: { kind: 'enterprise-contact', urgent: true },
        upgrade: null,
      })
      expect(screen.queryByRole('link', { name: /talk to me/i })).toBeNull()
      cleanupAll()
    }
  })

  it('offers nothing to a license that is already Enterprise, even if told to', () => {
    panel({
      license: { ...pro.license, tier: 'enterprise' },
      action: { kind: 'enterprise-quote', urgent: false },
      upgrade: null,
      limits: { seats: 12, accounts: 4 },
    })
    expect(screen.queryByRole('button', { name: COMPLETE })).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

/* SeatManager imports addSeat, which imports these through the `@/` alias. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))

import { LicensePanel } from '../LicensePanel'

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
}

const panel = (over = {}) => render(<LicensePanel {...pro} {...over} />)

describe('LicensePanel', () => {
  it('leads with kit and tier, then usage, then one action', () => {
    panel()
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'WareKit Next NetSuite (Pro)',
    })
    const usage = screen.getByText('1 / 1 developers')
    // The one action today is adding a developer; the upgrade button joins it.
    const action = screen.getByRole('button', { name: /add to the license/i })

    const before = (a, b) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText('Pro license')).toBeInTheDocument()
    expect(before(heading, usage)).toBe(true)
    expect(before(usage, action)).toBe(true)
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

  it('renders no upgrade button yet', () => {
    panel()
    expect(screen.queryByRole('button', { name: /move to team/i })).toBeNull()
  })
})

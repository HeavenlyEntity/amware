import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/* Tested from the components project on purpose: the action lives in src/lib
   but imports through the `@/` alias, which the engine project does not
   define. Same reason buy-button.test.jsx lives here. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
vi.mock('@/lib/commerce/licenseRecord', () => ({ attachPurchase: vi.fn() }))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendBoilerplateConfirmationEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
import { attachPurchase } from '@/lib/commerce/licenseRecord'
import { claimFreeKit } from '@/lib/commerce/claim'
import { ClaimFreeKit } from '@/components/commerce/ClaimFreeKit'

const liteKit = {
  id: 3,
  name: 'WareKit React NetSuite (Lite)',
  slug: 'warekit-react-netsuite-lite',
  type: 'boilerplate',
  stack: 'react-netsuite',
  price: 0,
  currency: 'USD',
  githubRepo: 'amwaredotdev/warekit-react-netsuite-lite',
}

const form = (fields) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const create = vi.fn()
const update = vi.fn()

const withItem = (item, existingClaims = []) => {
  const find = vi.fn(({ collection }) =>
    Promise.resolve({
      docs: collection === 'products' ? (item ? [item] : []) : existingClaims,
    })
  )
  create.mockResolvedValue({ id: 99 })
  update.mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  return find
}

const claim = (over = {}) =>
  claimFreeKit(
    { error: null, ok: null },
    form({
      slug: 'warekit-react-netsuite-lite',
      email: 'buyer@example.com',
      githubUsername: 'octocat',
      ...over,
    })
  )

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true })
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'invited',
    url: 'https://github.com/amwaredotdev/warekit-react-netsuite-lite/invitations',
    id: 1,
  })
})

describe('claimFreeKit — what must never be given away', () => {
  it('refuses a kit that is not free, however the slug was posted', async () => {
    withItem({ ...liteKit, price: 499 })
    const state = await claim()
    expect(state.error?.message).toMatch(/not available for free/i)
    // The guard that matters: no row, and above all no invitation.
    expect(inviteToRepo).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses a product with no price set, which means unfinished not free', async () => {
    withItem({ ...liteKit, price: undefined })
    const state = await claim()
    expect(state.error?.message).toMatch(/not available for free/i)
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a non-boilerplate priced at zero', async () => {
    withItem({ ...liteKit, type: 'digital' })
    const state = await claim()
    expect(state.error).toBeTruthy()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('refuses a free kit with no repository, rather than recording a claim it cannot fill', async () => {
    withItem({ ...liteKit, githubRepo: null })
    const state = await claim()
    expect(state.error?.message).toMatch(/no repository/i)
    expect(create).not.toHaveBeenCalled()
    expect(inviteToRepo).not.toHaveBeenCalled()
  })
})

describe('claimFreeKit — input', () => {
  it('rejects a malformed email before touching GitHub', async () => {
    withItem(liteKit)
    const state = await claim({ email: 'not-an-email' })
    expect(state.error?.field).toBe('email')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects a malformed username before touching GitHub', async () => {
    withItem(liteKit)
    const state = await claim({ githubUsername: 'not a username' })
    expect(state.error?.field).toBe('githubUsername')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects an account GitHub says does not exist', async () => {
    withItem(liteKit)
    global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false })
    const state = await claim()
    expect(state.error?.field).toBe('githubUsername')
    expect(inviteToRepo).not.toHaveBeenCalled()
  })

  it('proceeds when GitHub cannot be reached, rather than blocking on our dependency', async () => {
    withItem(liteKit)
    global.fetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))
    const state = await claim()
    expect(state.error).toBeNull()
    expect(inviteToRepo).toHaveBeenCalled()
  })
})

describe('claimFreeKit — delivery', () => {
  it('keys the claim on the kit and the GitHub account, so the database caps repeats', async () => {
    withItem(liteKit)
    await claim()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creemOrderId: 'free:warekit-react-netsuite-lite:octocat',
          amount: 0,
          githubRepo: liteKit.githubRepo,
        }),
      })
    )
  })

  it('lowercases the account in the key, so Octocat cannot claim twice as octocat', async () => {
    withItem(liteKit)
    await claim({ githubUsername: 'OctoCat' })
    expect(create.mock.calls[0][0].data.creemOrderId).toBe(
      'free:warekit-react-netsuite-lite:octocat'
    )
  })

  it('re-sends rather than duplicating when the same account claims again', async () => {
    withItem(liteKit, [{ id: 42 }])
    const state = await claim()
    expect(create).not.toHaveBeenCalled()
    // Re-sending is the point: this is what someone who lost the email does.
    expect(inviteToRepo).toHaveBeenCalled()
    expect(state.ok).toBeTruthy()
  })

  it('reports the manual fallback instead of claiming an invite was sent', async () => {
    withItem(liteKit)
    inviteToRepo.mockResolvedValue({ ok: false, reason: 'not-configured' })
    const state = await claim()
    expect(state.ok?.manual).toBe(true)
    expect(state.ok?.inviteUrl).toBeNull()
    // Still recorded, and still in the queue a human works.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'pending_invite' }),
      })
    )
  })

  it('marks it sent and emails the buyer when the invitation goes out', async () => {
    withItem(liteKit)
    const state = await claim()
    expect(state.ok?.manual).toBe(false)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfillmentStatus: 'sent' }),
      })
    )
    expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        repo: liteKit.githubRepo,
        githubUsername: 'octocat',
      })
    )
  })

  it('still succeeds when the confirmation email fails, because access is already granted', async () => {
    withItem(liteKit)
    sendBoilerplateConfirmationEmail.mockRejectedValue(new Error('resend down'))
    const state = await claim()
    expect(state.ok).toBeTruthy()
  })
})

describe('claimFreeKit — the license', () => {
  it('attaches the claim to a Lite license', async () => {
    withItem(liteKit)
    await claim({ email: 'Buyer@Example.com' })

    expect(attachPurchase).toHaveBeenCalledTimes(1)
    const [, args] = attachPurchase.mock.calls[0]
    expect(args).toMatchObject({
      purchase: { id: 99 },
      email: 'buyer@example.com',
      stack: 'react-netsuite',
      grantsTier: 'lite',
      environment: 'production',
    })
    // The Lite username is not carried into the license's seats.
    expect(JSON.stringify(args)).not.toContain('octocat')
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'licenses' })
    )
  })

  it('does not fail the claim when the license cannot be attached', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    withItem(liteKit)
    attachPurchase.mockRejectedValue(new Error('db down'))

    const state = await claim()

    expect(state.error).toBeNull()
    expect(state.ok).toBeTruthy()
    expect(inviteToRepo).toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(
      'Free claim license attach failed',
      'free:warekit-react-netsuite-lite:octocat',
      expect.any(Error)
    )
    error.mockRestore()
  })

  it('does not attach a repeat claim that already has a license', async () => {
    withItem(liteKit, [{ id: 42, license: 7 }])
    await claim()
    expect(attachPurchase).not.toHaveBeenCalled()
  })

  it('attaches a repeat claim whose first attempt never got a license', async () => {
    withItem(liteKit, [{ id: 42, email: 'first@example.com', license: null }])
    await claim()
    expect(attachPurchase.mock.calls[0][1]).toMatchObject({
      purchase: { id: 42 },
      email: 'first@example.com',
    })
  })

  it('still delivers a kit that has no stack, and says so in the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    withItem({ ...liteKit, stack: undefined })

    const state = await claim()

    expect(state.ok).toBeTruthy()
    expect(attachPurchase).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('ClaimFreeKit form', () => {
  it('renders no error before submission', () => {
    render(<ClaimFreeKit slug="warekit-react-netsuite-lite" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText(/^email$/i)).not.toHaveAttribute(
      'aria-invalid'
    )
  })

  it('says free, no card and no account, where someone decides', () => {
    render(<ClaimFreeKit slug="warekit-react-netsuite-lite" />)
    expect(screen.getByText(/no card, no account/i)).toBeInTheDocument()
  })

  it('attaches an email error to the email field and focuses it', async () => {
    withItem(liteKit)
    render(<ClaimFreeKit slug="warekit-react-netsuite-lite" />)
    const email = screen.getByLabelText(/^email$/i)
    email.removeAttribute('required')
    email.removeAttribute('type') // bypass the browser's own email check
    fireEvent.submit(email.closest('form'))

    const alert = await screen.findByRole('alert')
    expect(email).toHaveAttribute('aria-describedby', alert.id)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(document.activeElement).toBe(email))
  })

  it('shows the outcome on the page, not only in an email', async () => {
    withItem(liteKit)
    render(<ClaimFreeKit slug="warekit-react-netsuite-lite" />)
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'buyer@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(screen.getByLabelText(/^email$/i).closest('form'))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/invitation for/i)
    expect(
      screen.getByRole('link', { name: /accept invitation/i })
    ).toHaveAttribute('href', expect.stringContaining('/invitations'))
  })
})

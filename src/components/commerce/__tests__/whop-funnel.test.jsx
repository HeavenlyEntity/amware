import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* The one funnel moment that lives inside commerce components on this page.
   It is exercised the way a person triggers it -- a submitted form -- and
   the only thing checked is what reached window.whop. The server action
   behind it is mocked: what it does is its own tests' business.

   BuyButton's begin_checkout coverage used to live here too, fired from a
   submitted form into createCheckout. Both are gone now that checkout is
   the site's one Whop Elements checkout, WhopCheckout: there is no form and
   no server action to submit into, so that coverage moved to
   buy-button.test.jsx, which checks the Elements checkout mounts for the
   plan, that begin_checkout reports the price, and that a missing plan id
   renders the "not on sale" status instead of a dead checkout. */

vi.mock('@/lib/commerce/claim', () => ({ claimFreeKit: vi.fn() }))
vi.mock('@/components/commerce/GithubAccountField', () => ({
  GithubAccountField: ({ inputRef }) => (
    <input ref={inputRef} name="githubUsername" aria-label="GitHub username" />
  ),
}))

import { claimFreeKit } from '@/lib/commerce/claim'
import { ClaimFreeKit } from '@/components/commerce/ClaimFreeKit'

let track

beforeEach(() => {
  track = vi.fn()
  window.whop = { track }
  claimFreeKit.mockReset()
})

afterEach(() => {
  delete window.whop
})

describe('ClaimFreeKit', () => {
  const claimed = {
    itemName: 'Lite kit',
    repo: 'amwaredotdev/warekit-lite',
    username: 'ada',
    inviteUrl: 'https://github.com/x/invitations',
    alreadyHadAccess: false,
    manual: false,
    eventId: 'free:lite-kit:ada',
    email: 'ada@example.com',
  }

  it('reports kit_claimed once the claim lands, keyed on the server claim id', async () => {
    claimFreeKit.mockResolvedValue({ error: null, ok: claimed })
    render(<ClaimFreeKit slug="lite-kit" />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.change(screen.getByLabelText('GitHub username'), {
      target: { value: 'ada' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Get free access' }).closest('form')
    )

    await screen.findByRole('status')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('kit_claimed', {
      event_id: 'free:lite-kit:ada',
      email: 'ada@example.com',
      content_type: 'boilerplate',
      content_id: 'lite-kit',
      content_name: 'Lite kit',
    })
  })

  it('reports nothing when the claim fails', async () => {
    claimFreeKit.mockResolvedValue({
      error: { field: 'email', message: 'Enter an email address.' },
      ok: null,
    })
    render(<ClaimFreeKit slug="lite-kit" />)
    fireEvent.submit(
      screen.getByRole('button', { name: 'Get free access' }).closest('form')
    )
    await screen.findByRole('alert')
    expect(track).not.toHaveBeenCalled()
  })
})

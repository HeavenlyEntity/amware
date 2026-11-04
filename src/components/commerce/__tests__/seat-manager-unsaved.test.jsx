import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

/* The state addSeat returns when the invitation went out but the seat could
   not be stored, driven through the real form. */
vi.mock('@/lib/commerce/addSeat', () => ({
  addSeat: vi.fn(async () => ({
    error: null,
    ok: { username: 'octocat', inviteUrl: null, manual: false, unsaved: true },
    seats: { used: ['owner'], limit: 5 },
  })),
}))

import { SeatManager } from '../SeatManager'

describe('SeatManager when the seat could not be stored', () => {
  it('says the invitation went out, asks for a refresh, and does not count the account', async () => {
    render(
      <SeatManager
        token="t"
        repo="amwaredotdev/x"
        initialSeats={{ used: ['owner'], limit: 5 }}
      />
    )
    await act(async () => {
      // The first form is now a developer's Remove; this is the add form.
      fireEvent.submit(
        screen
          .getByRole('button', { name: /add to the license/i })
          .closest('form')
      )
    })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/@octocat was invited/i)
    expect(status).toHaveTextContent(/could not save the seat/i)
    expect(status).toHaveTextContent(/refresh the page/i)
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    expect(screen.getByText('1 / 5 developers')).toBeInTheDocument()
  })
})

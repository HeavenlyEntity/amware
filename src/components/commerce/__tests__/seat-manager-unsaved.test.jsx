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

/* The usage card is two labelled groups, "Developers" and "NetSuite accounts",
   each a label, a count ("2 / 5") and a meter. The count is asserted through
   its group so a test reads the same way a screen reader does. */
const usageOf = (name) => screen.getByRole('group', { name })
/* The count alone, exactly: the paragraph beside the group's label. Matching
   "1 / 5" anywhere in the group would also pass for "1 / 54", because the
   limit runs straight into the "4 developers left" line that follows it. */
const usageCount = (name) => usageOf(name).querySelector('h2 + p')?.textContent

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
    expect(usageCount('Developers')).toBe('1 / 5')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The deposit receipt, word for word. Relative imports and a mocked Resend,
   as in fulfillment.test.js: this module reaches no `@/` alias, so it runs
   in the engine project without one. */
const send = vi.fn().mockResolvedValue({})
// A class, not vi.fn: the module calls `new Resend(...)`.
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { sendDepositReceivedEmail } from '../fulfillment'

const CAL = 'https://cal.com/amware/on-demand-outcome'
const mail = () => send.mock.calls.at(-1)[0]

beforeEach(() => {
  send.mockClear()
})

describe('deposit receipt for a retainer', () => {
  /* Captured from the code before the Diagnostic wording moved into
     depositTerms, so that move provably changed nothing a retainer client
     receives. */
  it('reads exactly as it always has, with a booking link', async () => {
    await sendDepositReceivedEmail({
      to: 'client@example.com',
      name: 'Sam Client',
      serviceName: 'Fractional CTO',
      amount: 150000,
      currency: 'usd',
      bookingUrl: CAL,
      serviceSlug: 'fractional-cto',
    })

    expect(mail().to).toBe('client@example.com')
    expect(mail().subject).toBe('Your $1,500 deposit for Fractional CTO is in')
    expect(mail().text).toBe(`Hi Sam,

Your $1,500 deposit for the Fractional CTO engagement is received. It is credited in full against your first month, so it is a start date, not an extra cost.

If we have not spoken yet, book the intro call here and we will start from there:
https://cal.com/amware/on-demand-outcome

I will be in touch within one business day to set the engagement up. Reply to this email any time.

— Alec`)
  })

  it('reads exactly as it always has, with no name, booking link or slug', async () => {
    await sendDepositReceivedEmail({
      to: 'client@example.com',
      serviceName: 'Advisor',
      amount: 150000,
      currency: 'usd',
    })

    expect(mail().subject).toBe('Your $1,500 deposit for Advisor is in')
    expect(mail().text).toBe(`Hi,

Your $1,500 deposit for the Advisor engagement is received. It is credited in full against your first month, so it is a start date, not an extra cost.

I will be in touch within one business day to set the engagement up. Reply to this email any time.

— Alec`)
  })
})

describe('deposit receipt for the Codebase Diagnostic', () => {
  it('says the deposit is received and what happens next, with no retainer wording', async () => {
    await sendDepositReceivedEmail({
      to: 'client@example.com',
      name: 'Sam Client',
      serviceName: 'Codebase Diagnostic',
      amount: 150000,
      currency: 'usd',
      bookingUrl: CAL,
      serviceSlug: 'codebase-diagnostic',
    })

    const { text } = mail()
    expect(text).toContain('for the Codebase Diagnostic is received.')
    expect(text).toContain('agree the scope')
    expect(text).not.toMatch(/first month/)
    expect(text).not.toMatch(/engagement/)
  })
})

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/* Relative imports and a mocked Resend: this module reaches no `@/` alias, so
   it runs in the engine project without one. */
const send = vi.fn().mockResolvedValue({})
// A class, not vi.fn: the module calls `new Resend(...)`, and an arrow
// function is not a constructor.
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import {
  sendBoilerplateConfirmationEmail,
  notifyManualFulfilment,
} from '../fulfillment'

const body = () => send.mock.calls.at(-1)[0].text

beforeEach(() => {
  send.mockClear()
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
})

describe('manual fulfilment alert', () => {
  const sale = {
    email: 'buyer@example.com',
    itemName: 'Quick key rotation guide',
    amount: 1200,
    currency: 'usd',
    paymentId: 'pay_guide',
  }

  afterEach(() => {
    delete process.env.CONTACT_NOTIFY_TO
  })

  it('tells the owner what was bought, by whom, and that it is theirs to deliver', async () => {
    process.env.CONTACT_NOTIFY_TO = 'owner@example.com'
    await notifyManualFulfilment(sale)

    expect(send).toHaveBeenCalledTimes(1)
    const mail = send.mock.calls[0][0]
    expect(mail.to).toBe('owner@example.com')
    expect(mail.replyTo).toBe('buyer@example.com')
    expect(mail.subject).toContain('Quick key rotation guide')
    // It is a sale to deliver, not a client arriving.
    expect(mail.subject).not.toMatch(/deposit/i)
    expect(mail.text).toContain('$12')
    expect(mail.text).toContain('buyer@example.com')
    expect(mail.text).toContain('pay_guide')
    expect(mail.text).not.toMatch(/deposit/i)
  })

  it('is silent when no owner address is configured', async () => {
    await notifyManualFulfilment(sale)
    expect(send).not.toHaveBeenCalled()
  })
})

describe('boilerplate confirmation email', () => {
  it('repeats the username back, which is the only chance to catch a typo', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'SaaS Kit',
      githubUsername: 'octocat',
    })
    expect(body()).toContain('@octocat')
  })

  it('offers a correction route naming that account', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'SaaS Kit',
      githubUsername: 'octocat',
    })
    // Not just "contact us": the buyer must know what to say and why.
    expect(body()).toMatch(/reply to this email/i)
    expect(body()).toMatch(/not the right account/i)
  })

  it('says access is manual rather than implying it is automatic', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'SaaS Kit',
      githubUsername: 'octocat',
    })
    const text = body()
    expect(text).toMatch(/by hand/i)
    expect(text).toMatch(/not instant/i)
    // The regression this guards: a bare "shortly" with nothing behind it.
    expect(text).not.toMatch(/shortly/i)
  })

  it('commits to a window, so silence is measurable rather than ambiguous', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'SaaS Kit',
      githubUsername: 'octocat',
    })
    expect(body()).toMatch(/within one business day/i)
  })

  it('carries the accept link when an invitation really was sent', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit React NetSuite (Lite)',
      githubUsername: 'octocat',
      repo: 'amwaredotdev/warekit-react-netsuite-lite',
      inviteUrl:
        'https://github.com/amwaredotdev/warekit-react-netsuite-lite/invitations',
    })
    const text = body()
    expect(text).toContain(
      'https://github.com/amwaredotdev/warekit-react-netsuite-lite/invitations'
    )
    expect(text).toContain('amwaredotdev/warekit-react-netsuite-lite')
    // The buyer has access now. Telling them it takes a day would be a lie
    // in the other direction.
    expect(text).not.toMatch(/one business day/i)
    expect(text).not.toMatch(/by hand/i)
  })

  it('warns the invitation can lapse, without inventing a deadline', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit',
      githubUsername: 'octocat',
      inviteUrl: 'https://github.com/o/r/invitations',
    })
    const text = body()
    expect(text).toMatch(/lapse/i)
    expect(text).toMatch(/send another/i)
    /* GitHub's REST docs expose an `expired` flag on invitations but never
       publish the window. A number we cannot cite is a promise to a paying
       customer that we cannot keep, so the copy says invitations lapse and
       offers a replacement instead of naming days. */
    expect(text).not.toMatch(/seven days|7 days/i)
  })

  it('does not tell someone to accept an invitation they do not need', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit',
      githubUsername: 'octocat',
      repo: 'amwaredotdev/warekit-next-netsuite',
      alreadyHadAccess: true,
    })
    const text = body()
    expect(text).toMatch(/already has access/i)
    expect(text).toMatch(/nothing to accept/i)
    expect(text).not.toMatch(/one business day/i)
  })

  it('falls back to the manual promise when the invitation did not send', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit',
      githubUsername: 'octocat',
      inviteUrl: null,
    })
    const text = body()
    // It says the automatic attempt failed rather than implying it never
    // tried -- the buyer is owed the real reason they are waiting.
    expect(text).toMatch(/could not send/i)
    expect(text).toMatch(/by hand/i)
    expect(text).toMatch(/within one business day/i)
    expect(text).not.toMatch(/invitations$/m)
  })

  it('still reads correctly when no username reached the webhook', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'SaaS Kit',
    })
    const text = body()
    expect(text).not.toContain('@undefined')
    expect(text).toMatch(/gave at checkout/i)
    expect(text).toMatch(/reply to this email/i)
  })
})

/* The onboarding page tells the buyer the full key and the way back are in
   this email. These make that true. */
describe('the setup link and the licence key', () => {
  const SETUP = 'https://www.amware.dev/checkout/onboarding?payment_id=pay_1'
  const KEY = 'WHOPKEY-4F2A-99C1-WXYZ'

  const branches = {
    'the invitation was sent': {
      inviteUrl: 'https://github.com/amwaredotdev/warekit/invitations',
    },
    'the buyer already had access': { alreadyHadAccess: true },
    'the invitation has to be sent by hand': { inviteUrl: null },
  }

  for (const [when, extra] of Object.entries(branches)) {
    it(`puts the setup link on its own line when ${when}`, async () => {
      await sendBoilerplateConfirmationEmail({
        to: 'buyer@example.com',
        itemName: 'WareKit Next NetSuite (Pro)',
        githubUsername: 'octocat',
        repo: 'amwaredotdev/warekit-next-netsuite',
        setupUrl: SETUP,
        ...extra,
      })
      const text = body()
      expect(text.split('\n')).toContain(SETUP)
      /* Not the onboardingUrl branch, which rewrites the email to ask for a
         GitHub account -- Whop already collected it at checkout. */
      expect(text).not.toMatch(/which GitHub account should receive/i)
    })
  }

  it('gives the full licence key, since it goes to the buyer’s own address', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit Next NetSuite (Pro)',
      githubUsername: 'octocat',
      inviteUrl: 'https://github.com/o/r/invitations',
      licenseKey: KEY,
      setupUrl: SETUP,
    })
    expect(body().split('\n')).toContain(KEY)
  })

  it('mentions neither when neither exists', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit',
      githubUsername: 'octocat',
      inviteUrl: 'https://github.com/o/r/invitations',
    })
    const text = body()
    expect(text).not.toMatch(/licence key/i)
    expect(text).not.toMatch(/setup page/i)
  })
})

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
  sendAccessLinkEmail,
  sendBoilerplateConfirmationEmail,
  sendLicenseLinkEmail,
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
describe('the setup link and the license key', () => {
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

  it('gives the full license key, since it goes to the buyer’s own address', async () => {
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
    expect(text).not.toMatch(/license key/i)
    expect(text).not.toMatch(/setup page/i)
  })
})

describe('the license page link', () => {
  const LINK = 'https://example.com/access/seats/tok'

  it('goes to a single-developer buyer too', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit Next NetSuite (Pro)',
      githubUsername: 'octocat',
      inviteUrl: 'https://github.com/o/r/invitations',
      seats: 1,
      seatsUrl: LINK,
    })
    const text = body()
    expect(text).toContain(
      'Your license page, for your key, your team and upgrades:'
    )
    expect(text.split('\n')).toContain(LINK)
    expect(text).not.toMatch(/licence/i)
  })

  it('goes out with no seat count at all', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit Next NetSuite (Team)',
      githubUsername: 'octocat',
      seatsUrl: LINK,
    })
    expect(body().split('\n')).toContain(LINK)
  })

  it('is left out when there is no link to give', async () => {
    await sendBoilerplateConfirmationEmail({
      to: 'buyer@example.com',
      itemName: 'WareKit',
      githubUsername: 'octocat',
      seats: 5,
    })
    expect(body()).not.toMatch(/license page/i)
  })
})

describe('license link email', () => {
  const url = 'https://example.com/access/seats/signed-token'

  it('sends the link to the address it is given, and nowhere else', async () => {
    await sendLicenseLinkEmail({
      to: 'owner@acme.com',
      itemName: 'WareKit Next NetSuite (Pro)',
      url,
      reason: 'link',
    })
    expect(send).toHaveBeenCalledTimes(1)
    const mail = send.mock.calls[0][0]
    expect(mail.to).toBe('owner@acme.com')
    expect(mail.subject).toContain('WareKit Next NetSuite (Pro)')
    expect(mail.text).toContain(url)
    expect(mail.text).toMatch(/30 days/)
  })

  it('talks about upgrading when the reason is upgrade', async () => {
    await sendLicenseLinkEmail({
      to: 'owner@acme.com',
      itemName: 'WareKit',
      url,
      reason: 'upgrade',
    })
    const mail = send.mock.calls[0][0]
    expect(mail.subject).toMatch(/upgrade/i)
    expect(mail.text).toMatch(/upgrade/i)
    expect(mail.text).toMatch(/pay only the difference/i)
    expect(mail.text).toContain(url)
  })

  it('does not talk about upgrading for a plain link', async () => {
    await sendLicenseLinkEmail({
      to: 'owner@acme.com',
      itemName: 'WareKit',
      url,
      reason: 'link',
    })
    const mail = send.mock.calls[0][0]
    expect(mail.subject).not.toMatch(/upgrade/i)
    expect(mail.text).not.toMatch(/pay only the difference/i)
  })

  it('says license, never licence', async () => {
    for (const reason of ['link', 'upgrade']) {
      await sendLicenseLinkEmail({
        to: 'owner@acme.com',
        itemName: 'WareKit',
        url,
        reason,
      })
      const mail = send.mock.calls.at(-1)[0]
      expect(`${mail.subject} ${mail.text}`).not.toMatch(/licence/i)
    }
  })

  it('lets a send failure through, for the caller to report', async () => {
    send.mockRejectedValueOnce(new Error('resend is down'))
    await expect(
      sendLicenseLinkEmail({
        to: 'owner@acme.com',
        itemName: 'WareKit',
        url,
        reason: 'link',
      })
    ).rejects.toThrow('resend is down')
  })
})

/* Resend's SDK does not throw on a refused send: a rate limit or a bad from
   address resolves as `{ data: null, error }`. Each helper must turn that
   into a throw, or a caller reports a mail that never left as sent. */
describe('a send Resend refuses', () => {
  const refused = {
    data: null,
    error: {
      name: 'rate_limit_exceeded',
      message: 'Too many requests',
      statusCode: 429,
    },
  }
  const url = 'https://example.com/access/seats/signed-token'

  const calls = {
    sendLicenseLinkEmail: () =>
      sendLicenseLinkEmail({
        to: 'owner@acme.com',
        itemName: 'WareKit',
        url,
        reason: 'link',
      }),
    sendAccessLinkEmail: () =>
      sendAccessLinkEmail({
        to: 'buyer@example.com',
        itemName: 'A guide',
        token: 'tok',
      }),
    sendBoilerplateConfirmationEmail: () =>
      sendBoilerplateConfirmationEmail({
        to: 'buyer@example.com',
        itemName: 'SaaS Kit',
        githubUsername: 'octocat',
      }),
    notifyManualFulfilment: () => {
      process.env.CONTACT_NOTIFY_TO = 'owner@example.com'
      return notifyManualFulfilment({
        email: 'buyer@example.com',
        itemName: 'A guide',
        amount: 1200,
        currency: 'usd',
        paymentId: 'pay_1',
      })
    },
  }

  afterEach(() => {
    delete process.env.CONTACT_NOTIFY_TO
  })

  it.each(Object.keys(calls))(
    '%s throws when Resend answers with an error',
    async (name) => {
      send.mockResolvedValueOnce(refused)
      await expect(calls[name]()).rejects.toThrow(/rate_limit_exceeded/)
    }
  )

  it.each(Object.keys(calls))(
    '%s resolves when Resend accepts the email',
    async (name) => {
      send.mockResolvedValueOnce({ data: { id: 'em_1' }, error: null })
      await expect(calls[name]()).resolves.toBeUndefined()
    }
  )

  it('does not put the recipient in the error it throws', async () => {
    send.mockResolvedValueOnce(refused)
    const err = await calls.sendLicenseLinkEmail().catch((e) => e)
    expect(err.message).not.toContain('owner@acme.com')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The server action is called directly with a FormData, as the form does.
   The database and the mail send are mocked; the token is signed and read for
   real, because "a tampered link is refused before any read" and "the new
   link carries the same claims" are properties of the signature. */
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/commerce/githubInvite', () => ({
  inviteToRepo: vi.fn(),
  removeFromRepo: vi.fn(),
}))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendLicenseLinkEmail: vi.fn(),
}))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { sendLicenseLinkEmail } from '@/lib/commerce/fulfillment'
import { createAccessToken, readAccessToken } from '@/lib/commerce/accessToken'
import { emailFreshLicenseLink } from '@/lib/commerce/addSeat'

const OWNER = 'jane@acme.com'
const MASKED = 'j•••@acme.com'
const MINUTE = 60 * 1000

const proKit = { id: 6, name: 'WareKit Next NetSuite (Pro)', seats: 1 }
const update = vi.fn()

const world = ({ license = {}, purchase = {}, product = proKit } = {}) => {
  const rows = {
    licenses: {
      id: 9,
      tier: 'pro',
      stack: 'next-netsuite',
      ownerEmail: OWNER,
      ...license,
    },
    purchases: { id: 42, status: 'paid', license: 9, ...purchase },
  }
  update.mockResolvedValue({})
  getPayloadClient.mockResolvedValue({
    findByID: vi.fn(async ({ collection, id }) => {
      const row = rows[collection]
      if (!row || row.id !== id) {
        throw Object.assign(new Error('Not Found'), { status: 404 })
      }
      return row
    }),
    find: vi.fn(async () => ({ docs: product ? [product] : [] })),
    update,
  })
  return rows
}

const expired = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 7,
    ttlMs: -1,
    ...claims,
  }).token

const live = (claims = {}) =>
  createAccessToken({
    purchaseId: 42,
    itemType: 'product',
    itemId: 7,
    ...claims,
  }).token

const ask = (tok, extra = {}) => {
  const fd = new FormData()
  fd.set('token', tok)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return emailFreshLicenseLink({ status: 'idle', message: null }, fd)
}

const sentUrl = () => sendLicenseLinkEmail.mock.calls.at(-1)[0].url
const sentToken = () => sentUrl().split('/access/seats/')[1].split('?')[0]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACCESS_LINK_SECRET = 'fresh-link-secret'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  sendLicenseLinkEmail.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('emailFreshLicenseLink', () => {
  it('emails a fresh link for an expired one, and says where, masked', async () => {
    world()
    const state = await ask(expired())

    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(sendLicenseLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: OWNER,
        itemName: 'WareKit Next NetSuite (Pro)',
        reason: 'link',
      })
    )
    expect(sentUrl()).toMatch(/^https:\/\/example\.com\/access\/seats\/[^/]+$/)
    expect(state.status).toBe('sent')
    expect(state.message).toContain(MASKED)
    expect(state.message).not.toContain(OWNER)
  })

  it('mints a live token with the same claims as the expired one', async () => {
    world()
    const old = readAccessToken(expired({ licenseId: 9 }))
    await ask(expired({ licenseId: 9 }))

    const fresh = readAccessToken(sentToken())
    expect(fresh.state).toBe('valid')
    expect(fresh.claims).toMatchObject({
      purchaseId: old.claims.purchaseId,
      licenseId: 9,
      itemType: 'product',
      itemId: 7,
    })
    expect(fresh.claims.exp).toBeGreaterThan(Date.now())
    expect(fresh.claims.jti).not.toBe(old.claims.jti)
  })

  it('works from a token that names only a license', async () => {
    world()
    const state = await ask(expired({ purchaseId: null, licenseId: 9 }))
    expect(state.status).toBe('sent')
    expect(readAccessToken(sentToken()).claims).toMatchObject({
      purchaseId: null,
      licenseId: 9,
    })
  })

  it('also accepts a link that has not expired', async () => {
    world()
    expect((await ask(live())).status).toBe('sent')
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
  })

  it('sends a refunded license its link too, which then shows the refund', async () => {
    world({ license: { tier: null }, product: null })
    const state = await ask(expired())
    expect(state.status).toBe('sent')
    expect(sendLicenseLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: 'WareKit' })
    )
  })

  it('refuses a tampered link with the invalid state and no database read', async () => {
    world()
    const [, sig] = expired().split('.')
    const forged = Buffer.from(
      JSON.stringify({
        purchaseId: 42,
        itemType: 'product',
        itemId: 7,
        jti: 'x',
        exp: Date.now() + 10_000,
      })
    ).toString('base64url')

    for (const tok of [`${forged}.${sig}`, 'not.a.token', '', `${live()}x`]) {
      const state = await ask(tok)
      expect(state.status).toBe('invalid')
    }
    expect(getPayloadClient).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  it('refuses a link signed with another secret, expired or not', async () => {
    world()
    const tok = expired()
    process.env.ACCESS_LINK_SECRET = 'a-different-secret'
    expect((await ask(tok)).status).toBe('invalid')
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('answers a link that reaches no license with the invalid state', async () => {
    world()
    const state = await ask(expired({ purchaseId: 999 }))
    expect(state.status).toBe('invalid')
    expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
  })

  describe('the ten-minute limit', () => {
    it('sends one fresh link in ten minutes', async () => {
      world()
      const first = await ask(expired())
      expect(first.status).toBe('sent')

      /* The first send wrote lastLinkSentAt; the second request reads it
         back, as the next request would. */
      const written = update.mock.calls[0][0].data.lastLinkSentAt
      world({ license: { lastLinkSentAt: written } })
      const second = await ask(expired())

      expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
      expect(second.status).toBe('limited')
      expect(second.message).toContain(MASKED)
      expect(second.message).toMatch(/10 minutes/)
    })

    it('records the send before it happens', async () => {
      world()
      await ask(expired())
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'licenses',
          id: 9,
          data: { lastLinkSentAt: expect.any(String) },
        })
      )
      expect(update.mock.invocationCallOrder[0]).toBeLessThan(
        sendLicenseLinkEmail.mock.invocationCallOrder[0]
      )
    })

    it('sends again once ten minutes have passed', async () => {
      world({
        license: {
          lastLinkSentAt: new Date(Date.now() - 11 * MINUTE).toISOString(),
        },
      })
      expect((await ask(expired())).status).toBe('sent')
    })

    it('holds the line at nine minutes', async () => {
      world({
        license: {
          lastLinkSentAt: new Date(Date.now() - 9 * MINUTE).toISOString(),
        },
      })
      expect((await ask(expired())).status).toBe('limited')
      expect(update).not.toHaveBeenCalled()
    })

    it('is per license, not per link: a different token for the same license is limited too', async () => {
      world({
        license: {
          lastLinkSentAt: new Date(Date.now() - 1 * MINUTE).toISOString(),
        },
      })
      const state = await ask(expired({ purchaseId: null, licenseId: 9 }))
      expect(state.status).toBe('limited')
    })

    it('does not stay blocked on a timestamp from the future', async () => {
      world({
        license: {
          lastLinkSentAt: new Date(
            Date.now() + 365 * 24 * 60 * MINUTE
          ).toISOString(),
        },
      })
      expect((await ask(expired())).status).toBe('sent')
    })
  })

  it('sends only to the license owner, whatever the form says', async () => {
    world()
    await ask(expired(), {
      to: 'attacker@evil.test',
      email: 'attacker@evil.test',
      ownerEmail: 'attacker@evil.test',
      recipient: 'attacker@evil.test',
    })
    expect(sendLicenseLinkEmail).toHaveBeenCalledTimes(1)
    expect(sendLicenseLinkEmail.mock.calls[0][0].to).toBe(OWNER)
    expect(JSON.stringify(sendLicenseLinkEmail.mock.calls)).not.toContain(
      'evil.test'
    )
  })

  it('never puts the full address in any answer', async () => {
    const answers = []
    world()
    answers.push(await ask(expired()))
    world({
      license: { lastLinkSentAt: new Date().toISOString() },
    })
    answers.push(await ask(expired()))
    world()
    sendLicenseLinkEmail.mockRejectedValueOnce(new Error(`bounced ${OWNER}`))
    answers.push(await ask(expired()))
    getPayloadClient.mockRejectedValue(new Error(`db ${OWNER}`))
    answers.push(await ask(expired()))
    answers.push(await ask('not.a.token'))

    for (const state of answers) {
      expect(JSON.stringify(state)).not.toContain(OWNER)
    }
  })

  describe('when something fails', () => {
    it('asks for a retry, and sends nothing, when the database cannot be read', async () => {
      getPayloadClient.mockRejectedValue(new Error('connection refused'))
      const state = await ask(expired())
      expect(state.status).toBe('retry')
      expect(state.message).toMatch(/try again/i)
      expect(state.message).toMatch(/nothing was sent/i)
      expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    })

    it('does not call a database failure an invalid link', async () => {
      world()
      const payload = await getPayloadClient()
      payload.findByID.mockRejectedValue(
        Object.assign(new Error('connection terminated'), { status: 500 })
      )
      const state = await ask(expired())
      expect(state.status).toBe('retry')
    })

    it('sends nothing when it cannot record the send', async () => {
      world()
      update.mockRejectedValue(new Error('write failed'))
      const state = await ask(expired())
      expect(state.status).toBe('retry')
      expect(state.message).toMatch(/nothing was sent/i)
      expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    })

    it('says so honestly when the mail fails, and gives the window back', async () => {
      world({
        license: { lastLinkSentAt: '2026-01-01T00:00:00.000Z' },
      })
      sendLicenseLinkEmail.mockRejectedValue(new Error('resend is down'))
      const state = await ask(expired())

      expect(state.status).toBe('failed')
      expect(state.message).toMatch(/could not send/i)
      expect(state.message).toMatch(/nothing was sent/i)
      expect(state.message).not.toMatch(/emailed|sent a new link/i)
      // Written before, put back after: a failed send must not cost ten minutes.
      expect(update).toHaveBeenCalledTimes(2)
      expect(update.mock.calls[1][0].data).toEqual({
        lastLinkSentAt: '2026-01-01T00:00:00.000Z',
      })
    })

    it('does not throw when putting the window back fails too', async () => {
      world()
      sendLicenseLinkEmail.mockRejectedValue(new Error('resend is down'))
      update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('nope'))
      await expect(ask(expired())).resolves.toMatchObject({ status: 'failed' })
    })

    it('says so, and sends nothing, when the site address is not configured', async () => {
      world()
      delete process.env.NEXT_PUBLIC_SITE_URL
      const state = await ask(expired())
      expect(state.status).toBe('failed')
      expect(update).not.toHaveBeenCalled()
      expect(sendLicenseLinkEmail).not.toHaveBeenCalled()
    })
  })

  describe('a payment that outlived its link', () => {
    it('carries the upgrade into the fresh link, so the new page still says not to pay again', async () => {
      world()
      await ask(expired(), { upgraded: 'team' })
      expect(sentUrl()).toMatch(/\/access\/seats\/[^/?]+\?upgraded=team$/)
      expect(readAccessToken(sentToken()).state).toBe('valid')
    })

    it.each(['gold', 'lite', '', 'team&x=1', '<script>'])(
      'ignores %j as an upgrade target',
      async (value) => {
        world()
        await ask(expired(), { upgraded: value })
        expect(sentUrl()).not.toContain('?')
      }
    )
  })
})

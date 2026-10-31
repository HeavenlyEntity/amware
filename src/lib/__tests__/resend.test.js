import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const send = vi.hoisted(() => vi.fn())
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { ContactSubmissions } from '../../collections/ContactSubmissions'
import {
  RED_FLAGS_SUBJECT,
  isKitWaitlist,
  kitWaitlistSubject,
} from '../contact-intents'
import { sendContactEmails } from '../resend'

const PDF_PATH = '/downloads/amware-dev-shop-contract-red-flags.pdf'

const submission = (subject) => ({
  name: 'ada@example.com',
  email: 'ada@example.com',
  subject,
  message: 'A message',
})

const recipients = () => send.mock.calls.map(([mail]) => mail.to)

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'mail_1' }, error: null })
  vi.stubEnv('CONTACT_NOTIFY_TO', 'owner@amware.dev')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.amware.dev/')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('contact intents', () => {
  it('builds and recognises the kit waitlist subject', () => {
    const subject = kitWaitlistSubject('Standard', 'Supabase')
    expect(subject).toBe('WareKit waitlist · Standard · Supabase')
    expect(isKitWaitlist(subject)).toBe(true)
  })

  it('does not mistake other subjects for a kit waitlist', () => {
    expect(isKitWaitlist(RED_FLAGS_SUBJECT)).toBe(false)
    expect(isKitWaitlist('Courses waitlist · Core · Fast')).toBe(false)
    expect(isKitWaitlist(undefined)).toBe(false)
    expect(isKitWaitlist(null)).toBe(false)
  })

  it('names the Red Flags subject', () => {
    expect(RED_FLAGS_SUBJECT).toBe('Red Flags checklist')
  })
})

describe('sendContactEmails routing', () => {
  it('tells the owner about a kit waitlist sign-up and sends the visitor nothing', async () => {
    await sendContactEmails(
      submission(kitWaitlistSubject('Standard', 'Supabase'))
    )
    expect(recipients()).toEqual(['owner@amware.dev'])
    expect(send.mock.calls[0][0].subject).toContain('WareKit waitlist')
  })

  it('mails the visitor the checklist PDF, not the generic thanks', async () => {
    await sendContactEmails(submission(RED_FLAGS_SUBJECT))
    expect(recipients()).toEqual(['owner@amware.dev', 'ada@example.com'])
    const visitor = send.mock.calls[1][0]
    expect(visitor.text).toContain(`https://www.amware.dev${PDF_PATH}`)
    expect(visitor.text).not.toContain('Thanks for reaching out')
    expect(visitor.subject).not.toBe('Thanks for reaching out')
  })

  it('keeps a trailing slash on the site URL out of the PDF link', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test///')
    await sendContactEmails(submission(RED_FLAGS_SUBJECT))
    expect(send.mock.calls[1][0].text).toContain(
      `https://example.test${PDF_PATH}`
    )
    expect(send.mock.calls[1][0].text).not.toContain('//downloads')
  })

  it('falls back to the production origin when the site URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    await sendContactEmails(submission(RED_FLAGS_SUBJECT))
    expect(send.mock.calls[1][0].text).toContain(
      `https://www.amware.dev${PDF_PATH}`
    )
  })

  it.each([undefined, 'Hello', 'Courses waitlist · Core · Fast'])(
    'behaves as before for subject %j',
    async (subject) => {
      await sendContactEmails({ ...submission(subject), name: 'Ada' })
      expect(recipients()).toEqual(['owner@amware.dev', 'ada@example.com'])
      expect(send.mock.calls[0][0]).toMatchObject({
        replyTo: 'ada@example.com',
        subject: `New contact submission: ${subject || '(no subject)'}`,
        text: 'Name: Ada\nEmail: ada@example.com\n\nA message',
      })
      expect(send.mock.calls[1][0]).toMatchObject({
        subject: 'Thanks for reaching out',
      })
      expect(send.mock.calls[1][0].text).toContain('Hi Ada,')
    }
  )
})

describe('ContactSubmissions afterChange', () => {
  const run = (subject, operation = 'create') =>
    ContactSubmissions.hooks.afterChange[0]({
      doc: submission(subject),
      operation,
    })

  it('fails the request when the Red Flags mail does not leave', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockRejectedValue(new Error('resend down'))
    await expect(run(RED_FLAGS_SUBJECT)).rejects.toMatchObject({
      status: 502,
    })
  })

  it('fails the request when Resend rejects the Red Flags mail without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockResolvedValue({ data: null, error: { message: 'bad domain' } })
    await expect(run(RED_FLAGS_SUBJECT)).rejects.toMatchObject({
      status: 502,
    })
  })

  it('swallows a mail failure for every other subject', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockRejectedValue(new Error('resend down'))
    await expect(run('Hello')).resolves.toMatchObject({ subject: 'Hello' })
    await expect(
      run(kitWaitlistSubject('Standard', 'Supabase'))
    ).resolves.toBeTruthy()
    expect(log).toHaveBeenCalled()
  })

  it('sends nothing on update', async () => {
    await run(RED_FLAGS_SUBJECT, 'update')
    expect(send).not.toHaveBeenCalled()
  })
})

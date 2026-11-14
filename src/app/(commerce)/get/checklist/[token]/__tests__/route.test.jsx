import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))
vi.mock('@/lib/leads/record', () => ({ recordContact: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { recordContact } from '@/lib/leads/record'
import { checklistToken } from '@/lib/checklist-link'
import { GET, POST } from '../route'

const url = (token) => `https://www.amware.dev/get/checklist/${token}`
const open = (token) =>
  GET(new Request(url(token)), { params: Promise.resolve({ token }) })
const press = (token) =>
  POST(new Request(url(token), { method: 'POST' }), {
    params: Promise.resolve({ token }),
  })

let payload
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('PAYLOAD_SECRET', 'test-secret')
  payload = {
    findByID: vi.fn().mockResolvedValue({
      id: 41,
      name: 'ada@example.com',
      email: 'ada@example.com',
      subject: 'AI search checklist',
      message: 'Asked for the checklist.',
    }),
  }
  getPayloadClient.mockResolvedValue(payload)
})
afterEach(() => vi.unstubAllEnvs())

describe('GET /get/checklist/[token]', () => {
  it('shows a button on open, and records nothing for a link scanner', async () => {
    const res = await open(checklistToken(41))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<form method="post">')
    expect(html).toContain('Open the checklist')
    expect(recordContact).not.toHaveBeenCalled()
  })

  it('adds the inbox owner to Leads on the button, then opens the PDF', async () => {
    const res = await press(checklistToken(41))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'https://www.amware.dev/downloads/amware-does-ai-name-your-business.pdf'
    )
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'contact-submissions', id: 41 })
    )
    expect(recordContact).toHaveBeenCalledWith(payload, {
      name: 'ada@example.com',
      email: 'ada@example.com',
      message: 'Asked for the checklist.',
      track: 'build',
    })
  })

  it('is a 404 for a token we did not sign', async () => {
    expect((await open('41.forged')).status).toBe(404)
    const res = await press('41.forged')
    expect(res.status).toBe(404)
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('is a 404 for any other kind of submission', async () => {
    payload.findByID.mockResolvedValue({ id: 41, subject: 'Hello' })
    expect((await press(checklistToken(41))).status).toBe(404)
    expect(recordContact).not.toHaveBeenCalled()
  })

  it('still opens the PDF when the lead write fails', async () => {
    recordContact.mockRejectedValue(new Error('db down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await press(checklistToken(41))).status).toBe(303)
    spy.mockRestore()
  })
})

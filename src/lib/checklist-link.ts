import crypto from 'node:crypto'

/* The AI search checklist's download link (owner decision 2026-11-14). The
   email carries /get/checklist/<submission id>.<signature>; opening it
   proves the person owns the inbox, so that is when they join the Leads
   list, and it then forwards to the PDF. Nothing personal is in the URL:
   only the contact submission's id, signed so ids cannot be guessed. */

const PREFIX = 'amw-checklist-link:'

function secret(): string {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is not set')
  return value
}

function sign(id: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(PREFIX + id)
    .digest('base64url')
    .slice(0, 32)
}

export function checklistToken(id: string | number): string {
  const value = String(id)
  return `${value}.${sign(value)}`
}

/** The submission id a token names, or null when it is not one we signed. */
export function readChecklistToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 128) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const id = token.slice(0, dot)
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(id))
  return given.length === expected.length &&
    crypto.timingSafeEqual(given, expected)
    ? id
    : null
}

export function checklistLink(site: string, id: string | number): string {
  return `${site.replace(/\/+$/, '')}/get/checklist/${checklistToken(id)}`
}

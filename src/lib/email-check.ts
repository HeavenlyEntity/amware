import { promises as dns } from 'node:dns'
import { domainToASCII } from 'node:url'

/* A sign-up address that cannot be real is refused before anything is sent
   or stored (owner decision 2026-11-14): its domain must accept mail and
   must not be a throwaway inbox service. This does not prove the person
   owns the address; the checklist's click-through link does that
   (checklist-link.ts). */

/* The throwaway inbox services seen most often, matched with their
   subdomains. Not exhaustive: the mail check below and the click-through
   catch the rest. */
const DISPOSABLE = [
  '10minutemail.com',
  '20minutemail.com',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'maildrop.cc',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'sharklasers.com',
  'spamgourmet.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.dev',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]

export type EmailVerdict = 'ok' | 'disposable' | 'no-mail'

/** The address's domain, lower-cased and in ASCII (IDN to punycode). */
export function domainOf(email: string): string {
  const at = email.lastIndexOf('@')
  if (at === -1) return ''
  const raw = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
  return raw ? domainToASCII(raw) : ''
}

const isDisposable = (domain: string) =>
  DISPOSABLE.some((d) => domain === d || domain.endsWith(`.${d}`))

type MxRecord = { exchange: string }
export type Dns = {
  resolveMx: (domain: string) => Promise<MxRecord[]>
  resolve4: (domain: string) => Promise<string[]>
  resolve6: (domain: string) => Promise<string[]>
}

const codeOf = (err: unknown) => (err as { code?: string })?.code ?? ''

/* Within `ms`, or null when the lookup is too slow to wait for. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/* With no MX record, a domain's own address takes the mail (the implicit
   MX of RFC 5321), so an A or AAAA record is enough. */
async function hasAddress(domain: string, resolver: Dns): Promise<boolean> {
  const tries = await Promise.allSettled([
    resolver.resolve4(domain),
    resolver.resolve6(domain),
  ])
  return tries.some((t) => t.status === 'fulfilled' && t.value.length > 0)
}

/* Only "this domain does not exist" or a null MX means no mail. A timeout
   or a resolver outage lets the address through: a broken lookup must
   never turn a real visitor away. */
export async function checkEmail(
  email: string,
  resolver: Dns = dns,
  timeoutMs = 3000
): Promise<EmailVerdict> {
  const domain = domainOf(email)
  if (!domain || !domain.includes('.')) return 'no-mail'
  if (isDisposable(domain)) return 'disposable'
  try {
    const records = await within(resolver.resolveMx(domain), timeoutMs)
    if (records === null) return 'ok'
    if (records.length === 0) {
      return (await within(hasAddress(domain, resolver), timeoutMs)) === false
        ? 'no-mail'
        : 'ok'
    }
    // A null MX ("." exchange, RFC 7505) says the domain takes no mail.
    return records.some((r) => r.exchange && r.exchange !== '.')
      ? 'ok'
      : 'no-mail'
  } catch (err) {
    const code = codeOf(err)
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') return 'no-mail'
    if (code === 'ENODATA' || code === 'ENONAME') {
      return (await within(hasAddress(domain, resolver), timeoutMs)) === false
        ? 'no-mail'
        : 'ok'
    }
    return 'ok'
  }
}

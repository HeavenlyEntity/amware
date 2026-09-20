import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ContactSubmissions } from '../../collections/ContactSubmissions'

async function validate(token, operation = 'create', user = null) {
  let data = { name: 'Ada', email: 'ada@example.com', message: 'Hello' }
  for (const hook of ContactSubmissions.hooks.beforeValidate ?? []) {
    data = await hook({
      data,
      operation,
      req: {
        user,
        headers: new Headers(token ? { 'x-turnstile-token': token } : {}),
      },
    })
  }
  return data
}

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'server-secret')
  vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', 'amware.dev,www.amware.dev')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('rejects a direct anonymous submission without a CAPTCHA token', async () => {
  await expect(validate()).rejects.toMatchObject({ status: 400 })
})

it.each([
  { success: false, 'error-codes': ['timeout-or-duplicate'] },
  { success: true, hostname: 'attacker.example', action: 'contact' },
  { success: true, hostname: 'www.amware.dev', action: 'login' },
])(
  'rejects invalid, replayed, or unrelated verification: %j',
  async (result) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => result })
    )
    await expect(validate('token')).rejects.toMatchObject({ status: 400 })
  }
)

it('accepts a verified contact token and keeps it out of stored data', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      expect(url).toBe(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      )
      expect(JSON.parse(options.body)).toEqual({
        secret: 'server-secret',
        response: 'token',
      })
      return {
        ok: true,
        json: async () => ({
          success: true,
          hostname: 'www.amware.dev',
          action: 'contact',
        }),
      }
    })
  )
  expect(await validate('token')).toEqual({
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hello',
  })
  expect(fetch).toHaveBeenCalledOnce()
})

it('fails closed when the secret is missing', async () => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', '')
  await expect(validate('token')).rejects.toMatchObject({ status: 503 })
})

it.each(['network', 'http', 'json'])(
  'fails closed on a verification service %s failure',
  async (failure) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (failure === 'network') throw new Error('offline')
        return {
          ok: failure !== 'http',
          json: async () => {
            throw new Error('bad JSON')
          },
        }
      })
    )
    await expect(validate('token')).rejects.toMatchObject({ status: 503 })
  }
)

it('allows staff to manage existing submissions without a CAPTCHA', async () => {
  expect(await validate(undefined, 'update', { id: 1 })).toMatchObject({
    name: 'Ada',
  })
})

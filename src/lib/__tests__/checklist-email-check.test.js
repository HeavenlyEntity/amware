import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../turnstile', () => ({ verifyContactToken: vi.fn() }))
const verdict = vi.hoisted(() => ({ value: 'ok' }))
vi.mock('../email-check', () => ({
  checkEmail: vi.fn(async () => verdict.value),
}))

import { ContactSubmissions } from '../../collections/ContactSubmissions'
import { checkEmail } from '../email-check'

const validate = async (subject, email = 'ada@example.com') => {
  let data = { name: email, email, subject, message: 'Hi' }
  for (const hook of ContactSubmissions.hooks.beforeValidate ?? []) {
    data = await hook({
      data,
      operation: 'create',
      req: { headers: new Headers() },
    })
  }
  return data
}

beforeEach(() => {
  verdict.value = 'ok'
  vi.clearAllMocks()
})
afterEach(() => vi.restoreAllMocks())

it('checks the address on a checklist sign-up', async () => {
  await expect(validate('AI search checklist')).resolves.toBeTruthy()
  expect(checkEmail).toHaveBeenCalledWith('ada@example.com')
})

it('refuses a throwaway inbox', async () => {
  verdict.value = 'disposable'
  await expect(validate('AI search checklist')).rejects.toMatchObject({
    status: 400,
    message: 'Use your own email address, not a temporary inbox.',
  })
})

it('refuses an address that cannot receive mail', async () => {
  verdict.value = 'no-mail'
  await expect(validate('Red Flags checklist')).rejects.toMatchObject({
    status: 400,
  })
})

it('leaves ordinary contact messages alone', async () => {
  verdict.value = 'no-mail'
  await expect(validate('Hello')).resolves.toBeTruthy()
  expect(checkEmail).not.toHaveBeenCalled()
})

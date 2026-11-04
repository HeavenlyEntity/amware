import { describe, expect, it, vi } from 'vitest'

/* The collection config itself, from this project because it imports through
   the `@/` alias. The rules behind the fields are in licenseRecord.test.js;
   this holds the wiring: who can read and write a field, and what the list
   shows. */
import { Licenses } from '@/collections/Licenses'

const field = (name) => Licenses.fields.find((f) => f.name === name)

const admin = { collection: 'users' }
const license = {
  id: 9,
  stack: 'next-netsuite',
  tier: 'team',
  seatMembers: [{ githubUsername: 'owner' }],
  accounts: [
    { accountId: '1', status: 'active' },
    { accountId: '2', status: 'over_limit' },
  ],
}
const kit = {
  stack: 'next-netsuite',
  tier: 'team',
  seats: 5,
  netsuiteAccounts: 3,
}

const read = (name, req) =>
  field(name).hooks.afterRead[0]({ data: license, req })
const adminReq = () => ({
  user: admin,
  context: {},
  payload: { find: vi.fn(async () => ({ docs: [kit] })) },
})

describe('Licenses usage columns', () => {
  it('shows both in the list, beside the tier', () => {
    expect(Licenses.admin.defaultColumns).toEqual(
      expect.arrayContaining(['seatsUsage', 'accountsUsage'])
    )
  })

  it.each([
    ['seatsUsage', '1 / 5'],
    ['accountsUsage', '1 / 3'],
  ])('%s reads %s for an admin', async (name, shown) => {
    expect(await read(name, adminReq())).toBe(shown)
  })

  it('shares one product read between the two columns', async () => {
    const req = adminReq()
    await read('seatsUsage', req)
    await read('accountsUsage', req)
    expect(req.payload.find).toHaveBeenCalledTimes(1)
  })

  it.each(['seatsUsage', 'accountsUsage'])(
    '%s has no column, no writer and no reader but an admin',
    async (name) => {
      const f = field(name)
      expect(f.virtual).toBe(true)
      expect(f.admin.readOnly).toBe(true)
      expect(f.access.create()).toBe(false)
      expect(f.access.update()).toBe(false)
      expect(f.access.read({ req: { user: admin } })).toBe(true)
      expect(f.access.read({ req: { user: null } })).toBe(false)
      expect(f.access.read({ req: { user: { collection: 'x' } } })).toBe(false)
    }
  )

  it('hands a server read with no user nothing, and asks nothing', async () => {
    const req = adminReq()
    req.user = null
    expect(await read('seatsUsage', req)).toBeNull()
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('never throws out of an afterRead hook', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const req = adminReq()
    req.payload.find.mockRejectedValue(new Error('db down'))
    await expect(read('seatsUsage', req)).resolves.toBe('1 / ?')
    error.mockRestore()
  })
})

describe('Licenses tier', () => {
  it('cannot be posted back from the admin', () => {
    expect(field('tier').access.update()).toBe(false)
  })
})

describe('Licenses seatMembers', () => {
  it('no longer says rows are never removed', () => {
    const { description } = field('seatMembers').admin
    expect(description).not.toMatch(/appended, never replaced/i)
    expect(description).toMatch(/license page/i)
  })
})

describe('Licenses saves', () => {
  /* Payload writes a license whole from a read taken at the start of the
     save, so every save, the admin's included, must lock the row first. */
  it('locks the row before every update reads the stored license', async () => {
    const { lockLicenseBeforeUpdate } = await import(
      '@/lib/commerce/licenseLock'
    )
    expect(Licenses.hooks.beforeOperation).toContain(lockLicenseBeforeUpdate)
  })
})

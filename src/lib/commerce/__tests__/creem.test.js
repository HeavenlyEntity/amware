import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* creem.ts reads its key and base URL when it loads, so each test sets the
   environment first and imports a fresh copy. */
async function load(key = 'creem_test_secret-key') {
  vi.resetModules()
  vi.stubEnv('CREEM_API_KEY', key)
  vi.stubEnv('CREEM_API_URL', '')
  return import('../creem')
}

const reply = (status, body) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body ?? {}),
  })

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('activateLicense', () => {
  it('posts key and instance_name with x-api-key', async () => {
    const { activateLicense } = await load()
    const fetchMock = reply(200, { instance: { id: 'inst_abc' } })
    vi.stubGlobal('fetch', fetchMock)

    const out = await activateLicense({ key: 'KEY-1', instanceName: '7654321' })

    expect(out).toEqual({ instanceId: 'inst_abc' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://test-api.creem.io/v1/licenses/activate')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('creem_test_secret-key')
    expect(JSON.parse(init.body)).toEqual({
      key: 'KEY-1',
      instance_name: '7654321',
    })
  })

  it('uses the live host for a live key', async () => {
    const { activateLicense } = await load('creem_live_key')
    const fetchMock = reply(200, { instance: { id: 'inst_abc' } })
    vi.stubGlobal('fetch', fetchMock)
    await activateLicense({ key: 'K', instanceName: '1' })
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.creem.io/v1/licenses/activate'
    )
  })

  it('throws a CreemError carrying Creem status when Creem refuses', async () => {
    const { activateLicense, CreemError } = await load()
    vi.stubGlobal('fetch', reply(404, { message: 'not found' }))
    const err = await activateLicense({ key: 'K', instanceName: '1' }).catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(CreemError)
    expect(err.status).toBe(404)
  })

  it('throws a CreemError when Creem answers without an instance id', async () => {
    const { activateLicense, CreemError } = await load()
    vi.stubGlobal('fetch', reply(200, { instance: null }))
    await expect(
      activateLicense({ key: 'K', instanceName: '1' })
    ).rejects.toBeInstanceOf(CreemError)
  })

  it('turns an unreachable Creem into a CreemError with status 0', async () => {
    const { activateLicense, CreemError } = await load()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    const err = await activateLicense({ key: 'K', instanceName: '1' }).catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(CreemError)
    expect(err.status).toBe(0)
  })

  it('does not call Creem without an API key', async () => {
    const { activateLicense, CreemError } = await load('')
    const fetchMock = reply(200, {})
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      activateLicense({ key: 'K', instanceName: '1' })
    ).rejects.toBeInstanceOf(CreemError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never puts the API key in an error message', async () => {
    const { activateLicense } = await load()
    vi.stubGlobal('fetch', reply(401, { message: 'bad key' }))
    const err = await activateLicense({ key: 'K', instanceName: '1' }).catch(
      (e) => e
    )
    expect(err.message).not.toContain('secret-key')
  })
})

describe('deactivateLicense', () => {
  it('posts key and instance_id with x-api-key', async () => {
    const { deactivateLicense } = await load()
    const fetchMock = reply(200, {})
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      deactivateLicense({ key: 'KEY-1', instanceId: 'inst_abc' })
    ).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://test-api.creem.io/v1/licenses/deactivate')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('creem_test_secret-key')
    expect(JSON.parse(init.body)).toEqual({
      key: 'KEY-1',
      instance_id: 'inst_abc',
    })
  })

  it('throws a CreemError when Creem refuses', async () => {
    const { deactivateLicense, CreemError } = await load()
    vi.stubGlobal('fetch', reply(400, { message: 'no such instance' }))
    const err = await deactivateLicense({
      key: 'K',
      instanceId: 'inst_x',
    }).catch((e) => e)
    expect(err).toBeInstanceOf(CreemError)
    expect(err.status).toBe(400)
  })
})

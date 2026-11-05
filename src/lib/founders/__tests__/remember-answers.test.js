import { beforeEach, describe, expect, it } from 'vitest'

/* The node project has no window: stub both storage areas BEFORE importing
   the store, as offer-store.test.js does for sessionStorage. */
const area = () => {
  const backing = new Map()
  return {
    backing,
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => backing.set(key, String(value)),
    removeItem: (key) => backing.delete(key),
  }
}
const session = area()
const local = area()
globalThis.window = { sessionStorage: session, localStorage: local }

const {
  INITIAL,
  REMEMBER_KEY,
  STORAGE_KEY,
  rememberAnswers,
  setRememberAnswers,
  useOfferStore,
} = await import('../offer-store.js')

beforeEach(() => {
  session.backing.clear()
  local.backing.clear()
  useOfferStore.setState({ ...INITIAL })
  session.backing.clear()
})

describe('remember answers', () => {
  it('is off by default, so answers die with the tab', () => {
    expect(rememberAnswers()).toBe(false)
    useOfferStore.getState().set({ role: 'engineer' })
    expect(session.backing.has(STORAGE_KEY)).toBe(true)
    expect(local.backing.has(STORAGE_KEY)).toBe(false)
  })

  it('moves the answers to localStorage when turned on, and writes there after', () => {
    useOfferStore.getState().set({ role: 'engineer' })
    expect(setRememberAnswers(true)).toBe(true)
    expect(local.backing.get(REMEMBER_KEY)).toBe('1')
    expect(local.backing.has(STORAGE_KEY)).toBe(true)
    expect(session.backing.has(STORAGE_KEY)).toBe(false)

    useOfferStore.getState().set({ stage: 'series_a' })
    expect(JSON.parse(local.backing.get(STORAGE_KEY)).state.stage).toBe(
      'series_a'
    )
    expect(session.backing.has(STORAGE_KEY)).toBe(false)
  })

  it('moves them back when turned off', () => {
    useOfferStore.getState().set({ role: 'engineer' })
    setRememberAnswers(true)
    expect(setRememberAnswers(false)).toBe(false)
    expect(local.backing.has(REMEMBER_KEY)).toBe(false)
    expect(session.backing.has(STORAGE_KEY)).toBe(true)
    expect(local.backing.has(STORAGE_KEY)).toBe(false)
  })

  it('clearing empties both areas, so no copy survives in the one not in use', () => {
    useOfferStore.getState().set({ role: 'engineer' })
    local.backing.set(STORAGE_KEY, 'stale')
    useOfferStore.getState().clear()
    expect(session.backing.has(STORAGE_KEY)).toBe(false)
    expect(local.backing.has(STORAGE_KEY)).toBe(false)
  })
})

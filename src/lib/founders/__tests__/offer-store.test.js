import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/* The node project has no window. Stub sessionStorage BEFORE importing the
   store, because zustand resolves its storage getter on first use. This is the
   same pattern the old handoff test used. */
const backing = new Map()
globalThis.window = {
  sessionStorage: {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => backing.set(key, value),
    removeItem: (key) => backing.delete(key),
  },
}

const { ENGINE_KEYS, INITIAL, INITIAL_KEYS, STORAGE_KEY, useOfferStore } =
  await import('../offer-store.js')
const { normalizeInputs } = await import('../equity/normalize.js')
const { computeRead } = await import('../equity/engine.js')
const { EXAMPLE } = await import('../equity/benchmarks.js')
const { exampleStorePatch } = await import('../worked-example.js')

const stored = () => {
  const raw = backing.get(STORAGE_KEY)
  return raw ? JSON.parse(raw).state : null
}

beforeEach(() => {
  useOfferStore.setState({ ...INITIAL })
  backing.clear()
})
afterEach(() => backing.clear())

describe('field names match the engine (plan test 17)', () => {
  /* The plan's first draft called these `seat` and `stageKey`. normalizeInputs
     reads `role` and `stage`, so that store would have defaulted every seat to
     CTO and every stage to pre-seed, silently, with no error. */
  it('feeds normalizeInputs without anything falling back to a default', () => {
    useOfferStore.getState().set({
      role: 'engineer',
      stage: 'series_a',
      joining: 'hired_after',
    })
    const n = normalizeInputs(useOfferStore.getState().inputs())
    expect(n.role).toBe('engineer')
    expect(n.stageKey).toBe('series_a')
    expect(n.joining).toBe('hired_after')
  })

  it('names the engine inputs exactly, never seat or stageKey', () => {
    expect(INITIAL_KEYS).toContain('role')
    expect(INITIAL_KEYS).toContain('stage')
    expect(INITIAL_KEYS).not.toContain('seat')
    expect(INITIAL_KEYS).not.toContain('stageKey')
  })

  it('produces a real read from the untouched defaults', () => {
    /* CTO at pre-seed is the shipped default AND was a missing band row until
       T1 interpolated it. A default that lands in a fallback is a bug. */
    const read = computeRead(useOfferStore.getState().inputs())
    expect(read.inputs.role).toBe('cto')
    expect(read.inputs.stageKey).toBe('preseed')
    expect(Number.isFinite(read.inputs.marketSalary)).toBe(true)
    expect(read.inputs.marketSalary).toBeGreaterThan(0)
  })

  it('keeps bookkeeping out of the engine inputs', () => {
    expect(ENGINE_KEYS).not.toContain('askedAt')
    expect(ENGINE_KEYS).not.toContain('workAnswered')
    expect(Object.keys(useOfferStore.getState().inputs()).sort()).toEqual(
      [...ENGINE_KEYS].sort()
    )
  })
})

describe('shares mode survives the round trip (plan test 15)', () => {
  it('carries the option count, the fully diluted total and the strike', () => {
    useOfferStore.getState().set({
      offerMode: 'shares',
      optionCount: 250_000,
      fullyDilutedShares: 10_000_000,
      strikePrice: 0.42,
    })
    const inputs = useOfferStore.getState().inputs()
    expect(inputs.offerMode).toBe('shares')
    expect(inputs.optionCount).toBe(250_000)
    expect(inputs.fullyDilutedShares).toBe(10_000_000)
    expect(inputs.strikePrice).toBe(0.42)
    /* And the engine can actually resolve a percent from them, which is the
       point of carrying them across the hop at all. */
    const read = computeRead(inputs)
    expect(read.offer.mode).toBe('shares')
    expect(read.offer.pct).toBeCloseTo(2.5, 4)
  })
})

describe('persistence and clearing (plan test 18)', () => {
  it('writes to sessionStorage under one key', () => {
    useOfferStore.getState().set({ offeredSalary: 180_000 })
    expect(stored().offeredSalary).toBe(180_000)
    expect([...backing.keys()]).toEqual([STORAGE_KEY])
  })

  it('removes the key rather than writing the defaults back over it', () => {
    useOfferStore.getState().set({ offeredSalary: 180_000, role: 'engineer' })
    expect(backing.has(STORAGE_KEY)).toBe(true)
    useOfferStore.getState().clear()
    /* Order matters inside clear(): defaults first, clearStorage second. The
       other order leaves a fresh copy of the defaults on disk. */
    expect(backing.has(STORAGE_KEY)).toBe(false)
    expect(useOfferStore.getState().role).toBe('cto')
    expect(useOfferStore.getState().offeredSalary).toBeNull()
  })

  it('clears the asked marker too, so the contact form stops prefilling', () => {
    useOfferStore.getState().markAsked()
    expect(useOfferStore.getState().askedAt).toBeTruthy()
    useOfferStore.getState().clear()
    expect(useOfferStore.getState().askedAt).toBeNull()
  })

  it('persists only data, never the actions', () => {
    useOfferStore.getState().set({ offeredSalary: 1 })
    const keys = Object.keys(stored())
    expect(keys.sort()).toEqual([...INITIAL_KEYS].sort())
    expect(keys).not.toContain('set')
    expect(keys).not.toContain('clear')
  })
})

describe('pristine detection', () => {
  it('is pristine until a real answer changes', () => {
    expect(useOfferStore.getState().isPristine()).toBe(true)
    useOfferStore.getState().set({ role: 'engineer' })
    expect(useOfferStore.getState().isPristine()).toBe(false)
  })

  it('is pristine again after a clear, so a sync cannot re-hydrate it', () => {
    useOfferStore.getState().set({ offeredSalary: 200_000 })
    useOfferStore.getState().clear()
    expect(useOfferStore.getState().isPristine()).toBe(true)
  })

  it('does not count the asked marker as an answer', () => {
    useOfferStore.getState().markAsked()
    expect(useOfferStore.getState().isPristine()).toBe(true)
  })
})

describe('the asked marker', () => {
  it('starts null and records an ISO timestamp', () => {
    expect(INITIAL.askedAt).toBeNull()
    useOfferStore.getState().markAsked()
    expect(useOfferStore.getState().askedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/
    )
  })
})

describe('the ask snapshot', () => {
  /* The equity wizard keeps `founders`, `path`, the fractional fields and the
     leaver terms in its own reducer, so the store alone cannot reproduce its
     read. The snapshot carries its full inputs across to the review. */
  it('keeps markAsked() with no arguments working, with no snapshot', () => {
    useOfferStore.getState().markAsked()
    const s = useOfferStore.getState()
    expect(s.askedAt).toBeTruthy()
    expect(s.askedFrom).toBeNull()
    expect(s.askedInputs).toBeNull()
    expect(s.askedOptions).toBeNull()
  })

  it('records the source and a detached copy of the inputs', () => {
    const inputs = {
      ...EXAMPLE,
      responsibilities: [...EXAMPLE.responsibilities],
    }
    useOfferStore.getState().markAsked({ from: 'equity', inputs })
    inputs.founders = 99
    inputs.responsibilities.push('mutated')
    const s = useOfferStore.getState()
    expect(s.askedFrom).toBe('equity')
    expect(s.askedInputs.founders).toBe(EXAMPLE.founders)
    expect(s.askedInputs.responsibilities).toEqual(EXAMPLE.responsibilities)
    expect(s.askedOptions).toBeNull()
  })

  it('persists the snapshot with the rest of the store', () => {
    useOfferStore.getState().markAsked({
      from: 'job-offer',
      inputs: { role: 'engineer', path: 'acquisition' },
      options: { valuations: { seed: 10 } },
    })
    expect(stored().askedFrom).toBe('job-offer')
    expect(stored().askedInputs).toEqual({
      role: 'engineer',
      path: 'acquisition',
    })
    expect(stored().askedOptions).toEqual({ valuations: { seed: 10 } })
  })

  it('is removed by clear(), in memory and on disk', () => {
    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
    expect(backing.has(STORAGE_KEY)).toBe(true)
    useOfferStore.getState().clear()
    const s = useOfferStore.getState()
    expect(s.askedAt).toBeNull()
    expect(s.askedFrom).toBeNull()
    expect(s.askedInputs).toBeNull()
    expect(s.askedOptions).toBeNull()
    expect(backing.has(STORAGE_KEY)).toBe(false)
  })

  it('is replaced, not kept, by a later ask without one', () => {
    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
    useOfferStore.getState().markAsked()
    expect(useOfferStore.getState().askedInputs).toBeNull()
    expect(useOfferStore.getState().askedFrom).toBeNull()
  })

  it('ignores an unknown source and a click event passed as the argument', () => {
    useOfferStore.getState().markAsked({ from: 'somewhere', inputs: EXAMPLE })
    expect(useOfferStore.getState().askedFrom).toBeNull()
    expect(useOfferStore.getState().askedInputs).toBeNull()
    useOfferStore.getState().markAsked({ type: 'click', target: {} })
    expect(useOfferStore.getState().askedAt).toBeTruthy()
    expect(useOfferStore.getState().askedInputs).toBeNull()
  })

  it('records a source without inputs (the job offer tool reads the store)', () => {
    useOfferStore.getState().markAsked({ from: 'job-offer' })
    expect(useOfferStore.getState().askedFrom).toBe('job-offer')
    expect(useOfferStore.getState().askedRead()).toMatchObject({
      from: 'job-offer',
      snapshot: false,
    })
  })

  it('is bookkeeping: not an engine input, not an answer', () => {
    for (const key of ['askedFrom', 'askedInputs', 'askedOptions']) {
      expect(INITIAL_KEYS).toContain(key)
      expect(ENGINE_KEYS).not.toContain(key)
    }
    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
    expect(useOfferStore.getState().isPristine()).toBe(true)
  })

  it('askedRead() is null until asked, then prefers the snapshot', () => {
    expect(useOfferStore.getState().askedRead()).toBeNull()
    useOfferStore.getState().set({ role: 'engineer' })
    useOfferStore.getState().markAsked()
    expect(useOfferStore.getState().askedRead()).toMatchObject({
      snapshot: false,
      inputs: { role: 'engineer' },
    })
    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
    expect(useOfferStore.getState().askedRead()).toMatchObject({
      from: 'equity',
      snapshot: true,
      inputs: { role: EXAMPLE.role, path: EXAMPLE.path },
    })
  })

  it('gives the review the equity calculator’s numbers, which the store alone cannot', () => {
    /* The worked example as the dock loads it: only the store's own keys. */
    useOfferStore.setState(exampleStorePatch())
    useOfferStore.getState().markAsked()
    const drifted = computeRead(useOfferStore.getState().askedRead().inputs)
    expect(drifted.offer.numberToSay.value).toBe(13)
    expect(drifted.offer.range).toMatchObject({ lo: 9.5, hi: 16.5 })

    useOfferStore.getState().markAsked({ from: 'equity', inputs: EXAMPLE })
    const asked = useOfferStore.getState().askedRead()
    const read = computeRead(asked.inputs, asked.options ?? undefined)
    expect(read.offer.numberToSay.value).toBe(12)
    expect(read.offer.range).toMatchObject({ lo: 8.5, hi: 15.5 })
  })
})

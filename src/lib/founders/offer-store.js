import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/*
 * Founders' Desk — the inputs both tools share.
 *
 * FIELD NAMES ARE NOT DECORATIVE. `normalizeInputs()` reads `src.role` and
 * `src.stage` (normalize.js:133 and :135) and OUTPUTS `stageKey`. A store that
 * called these `seat` and `stageKey` would fail `pickEnum` silently and default
 * every non-CTO seat to CTO and every stage to pre-seed, with no error anywhere.
 * The first draft of the plan did exactly that. `INITIAL_KEYS` and its test
 * exist so it cannot happen again.
 *
 * WHAT LIVES HERE: only what both the equity calculator and the job offer
 * calculator need. Step index, scenario overrides and the fractional sliders
 * stay in the equity wizard's own reducer.
 *
 * PERSISTENCE: sessionStorage by default, so answers survive a reload and die
 * with the tab, or localStorage once the visitor asks the desk to remember
 * them (see REMEMBER ANSWERS below). The desk's privacy line changes from "nothing stored" to "nothing leaves
 * your browser" to match (design review D3). `clear()` genuinely removes the
 * key rather than writing defaults back over it.
 */

export const STORAGE_KEY = 'amw:offer'

export const INITIAL = Object.freeze({
  /* Who and where. `role` and `stage` are the engine's own input names. */
  role: 'cto',
  joining: 'fractional_conversion',
  stage: 'preseed',
  industry: 'saas',
  /* Must exist in the GEO table. `us_national` did not, and no test caught it
     until an outside reviewer read the two declarations side by side. */
  geo: 'remote_national',

  /* What the classifier needs. Without these a cold start comes back pending
     on any non-formation path, which is the tool's headline persona
     (classify.js:58). `responsibilities: []` is ambiguous on its own, so the
     wizard offers an explicit "none of these" and sets `workAnswered`. */
  responsibilities: [],
  workAnswered: false,
  fullTimeOnSigning: null,
  finalTechnicalSay: null,

  /* The offer. Shares mode carries three more fields; dropping them would lose
     an option count crossing between the two tools. */
  offerMode: 'percent',
  offeredEquityPct: null,
  optionCount: null,
  fullyDilutedShares: null,
  strikePrice: null,
  offeredSalary: null,
  vestingYears: 4,

  /* Set when the user asks for a review, so the contact form knows they
     actually came from the tool rather than typing the URL. */
  askedAt: null,

  /* THE ASK SNAPSHOT. Which tool asked ('equity' | 'job-offer'), and that
     tool's FULL engine inputs at the moment it asked. The equity wizard keeps
     `founders`, `path`, the fractional fields and every leaver term in its own
     reducer, so a review computed from this store alone fell back to engine
     defaults for all of them and said "ask for 13" where the calculator had
     just said 12. The review computes from the snapshot when there is one, so
     what the visitor saw is what they send. Both are bookkeeping, never engine
     inputs, and `clear()` drops them with everything else. */
  askedFrom: null,
  askedInputs: null,
  /* `computeRead` options that went with those inputs (the equity wizard's
     valuation overrides), or null. */
  askedOptions: null,
})

/** Every key the store owns. The engine-name test walks this. */
export const INITIAL_KEYS = Object.freeze(Object.keys(INITIAL))

/* Bookkeeping, not answers: never sent to `computeRead` and never counted by
   `isPristine()`. */
const BOOKKEEPING_KEYS = new Set([
  'askedAt',
  'askedFrom',
  'askedInputs',
  'askedOptions',
  'workAnswered',
])

/** The subset that goes to `computeRead`. The ask marker, the ask snapshot
    and `workAnswered` are bookkeeping, not inputs. */
export const ENGINE_KEYS = Object.freeze(
  INITIAL_KEYS.filter((k) => !BOOKKEEPING_KEYS.has(k))
)

/** The tools that can ask for a review. Anything else records no source. */
export const ASK_SOURCES = Object.freeze(['equity', 'job-offer'])

/* A detached, JSON-safe copy of a tool's inputs, or null. The snapshot is
   persisted, so it has to survive JSON; a value that cannot (a function, a
   cycle) is rejected outright rather than half-saved. */
const snapshotInputs = (inputs) => {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs))
    return null
  try {
    const copy = JSON.parse(JSON.stringify(inputs))
    return copy && typeof copy === 'object' ? copy : null
  } catch {
    return null
  }
}

/*
 * REMEMBER ANSWERS. Off by default: answers live in sessionStorage and die with
 * the tab, which is the promise the desk makes. The dock's "Remember answers in
 * this browser" turns it on, and answers move to localStorage. The preference
 * itself is kept in localStorage, so it survives the tab it was set in.
 *
 * The design starts this checked. It ships unchecked, because on by default
 * would quietly change "dies with the tab" into "kept on this device".
 */
export const REMEMBER_KEY = 'amw:offer:remember'

/* Either storage can be missing (server) or throw on access (blocked site
   data, some private windows, a thumbnail render). Every touch goes through
   these, and a failure reads as "not there". */
const sessionArea = () => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage
      ? window.sessionStorage
      : undefined
  } catch {
    return undefined
  }
}

const localArea = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : undefined
  } catch {
    return undefined
  }
}

/** Whether answers are kept past the tab. False when localStorage is out. */
export function rememberAnswers() {
  try {
    return localArea()?.getItem(REMEMBER_KEY) === '1'
  } catch {
    return false
  }
}

const activeArea = () => (rememberAnswers() ? localArea() : sessionArea())

const rememberListeners = new Set()

/**
 * Turn remembering on or off, carrying the current answers across so nothing
 * is lost and nothing is left behind in the storage being given up. Returns
 * the setting that actually took effect: turning it on fails without
 * localStorage.
 */
export function setRememberAnswers(on) {
  const local = localArea()
  if (!local) return false
  const from = activeArea()
  try {
    if (on) local.setItem(REMEMBER_KEY, '1')
    else local.removeItem(REMEMBER_KEY)
  } catch {
    return rememberAnswers()
  }
  const to = activeArea()
  if (from && from !== to) {
    /* Copy if there is somewhere to copy to, but always take the answers out
       of the area being given up: "forgotten when you close the tab" must not
       leave them in localStorage because sessionStorage happens to be
       blocked. Memory still holds them either way. */
    try {
      const raw = from.getItem(STORAGE_KEY)
      if (raw !== null) to?.setItem(STORAGE_KEY, raw)
    } catch {
      /* written on the next change instead */
    }
    try {
      from.removeItem(STORAGE_KEY)
    } catch {
      /* nothing more can be done with an area that throws */
    }
  }
  rememberListeners.forEach((fn) => fn())
  return rememberAnswers()
}

/** Subscribe to the setting, including changes made in another tab. */
export function onRememberChange(fn) {
  rememberListeners.add(fn)
  const onStorage = (event) => {
    if (event.key === REMEMBER_KEY) fn()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener?.('storage', onStorage)
  }
  return () => {
    rememberListeners.delete(fn)
    if (typeof window !== 'undefined') {
      window.removeEventListener?.('storage', onStorage)
    }
  }
}

/* zustand resolves its storage once, at creation, so the choice between the
   two areas is made on every call instead. Clearing removes the key from both,
   so "Clear my answers" cannot leave a copy in the area not in use. Returning
   undefined on the server makes zustand skip persistence rather than blow up. */
const answerStorage = () =>
  typeof window === 'undefined'
    ? undefined
    : {
        getItem: (name) => {
          try {
            return activeArea()?.getItem(name) ?? null
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          try {
            activeArea()?.setItem(name, value)
          } catch {
            /* full or blocked: memory still holds the answers */
          }
        },
        removeItem: (name) => {
          for (const area of [sessionArea(), localArea()]) {
            try {
              area?.removeItem(name)
            } catch {
              /* nothing to remove from an area we cannot reach */
            }
          }
        },
      }

export const useOfferStore = create(
  persist(
    (set, get) => ({
      ...INITIAL,

      /** Merge a patch. The wizard calls this on blur or Enter, never per
          keystroke, so a half-typed salary never reaches the store (D9). */
      set: (patch) => set(patch),

      /**
       * Record that the user asked for a review, which is what lets the review
       * page prefill.
       *
       * `markAsked()` records the ask alone. `markAsked({ from, inputs,
       * options })` also snapshots the asking tool's full engine inputs (and
       * any `computeRead` options, such as the equity wizard's valuation
       * overrides), so the review shows the numbers that tool showed. Either
       * form replaces any earlier snapshot: an ask without one must not be
       * read through a stale snapshot from a previous ask.
       *
       * Safe as a click handler: an event object carries no `from`, so it
       * records the ask and nothing else.
       *
       * @param {{ from?: 'equity' | 'job-offer', inputs?: object, options?: object }} [snapshot]
       */
      markAsked: (snapshot) => {
        const from = ASK_SOURCES.includes(snapshot?.from) ? snapshot.from : null
        const inputs = from ? snapshotInputs(snapshot.inputs) : null
        const options = inputs ? snapshotInputs(snapshot.options) : null
        set({
          askedAt: new Date().toISOString(),
          askedFrom: from,
          askedInputs: inputs,
          askedOptions: options,
        })
      },

      /**
       * What the review should compute from: the ask snapshot when there is
       * one, otherwise the shared answers. `null` when nobody asked.
       * @returns {null | { from: string | null, inputs: object, options: object | null, snapshot: boolean }}
       */
      askedRead: () => {
        const s = get()
        if (!s.askedAt) return null
        if (s.askedInputs && typeof s.askedInputs === 'object') {
          return {
            from: s.askedFrom,
            inputs: s.askedInputs,
            options: s.askedOptions ?? null,
            snapshot: true,
          }
        }
        return {
          from: s.askedFrom,
          inputs: s.inputs(),
          options: null,
          snapshot: false,
        }
      },

      /**
       * Empty the store AND the key. Order matters: writing defaults first and
       * clearing second leaves storage genuinely empty, because any set() after
       * clearStorage() would immediately write the defaults back.
       */
      clear: () => {
        set({ ...INITIAL })
        try {
          useOfferStore.persist.clearStorage()
        } catch {
          /* storage may be unavailable; memory is already reset */
        }
      },

      /** True when nothing has been answered yet. The equity wizard's sync uses
          this so it cannot re-hydrate the store straight after a clear. */
      isPristine: () => {
        const s = get()
        return ENGINE_KEYS.every((k) => {
          const a = s[k]
          const b = INITIAL[k]
          return Array.isArray(a) ? a.length === b.length : a === b
        })
      },

      /** Just the engine inputs, ready for `computeRead`. */
      inputs: () => {
        const s = get()
        const out = {}
        for (const k of ENGINE_KEYS) out[k] = s[k]
        return out
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(answerStorage),
      /* Persist only data. Functions are recreated on load, and a stale one
         written to storage would be dropped anyway. */
      partialize: (state) => {
        const out = {}
        for (const k of INITIAL_KEYS) out[k] = state[k]
        return out
      },
      /* A payload from an older shape is discarded rather than merged, so a
         renamed field can never resurrect as a silent default. */
      migrate: () => ({ ...INITIAL }),
    }
  )
)

/**
 * Whether persisted state has arrived yet.
 *
 * This matters more than it sounds. `persist` hydrates AFTER mount, so the
 * server paints `INITIAL` — CTO at pre-seed. On a page whose design system
 * counts numbers up as they arrive, an engineer at Series A would watch a CTO's
 * pre-seed figures animate and then jump to their own. Gate the render on this,
 * show a fixed-geometry skeleton, and suppress the count-up on the first real
 * paint (design review DD5).
 */
export function hasHydrated() {
  try {
    return useOfferStore.persist.hasHydrated()
  } catch {
    return true
  }
}

/** Subscribe to hydration finishing. Returns an unsubscribe function. */
export function onHydrated(fn) {
  try {
    return useOfferStore.persist.onFinishHydration(fn)
  } catch {
    return () => {}
  }
}

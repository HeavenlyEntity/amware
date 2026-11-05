import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'

/* Same harness as the job offer calculator's tests: hydration resolves after
   mount, so the flags below let a test drive the pre-hydration frame. */
let hydratedFlag = true
let pendingHydration = null

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, AnimatePresence: ({ children }) => children }
})

vi.mock('@/lib/founders/offer-store', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    hasHydrated: () => hydratedFlag,
    onHydrated: (fn) => {
      pendingHydration = fn
      return () => {
        pendingHydration = null
      }
    },
  }
})

const { INITIAL, useOfferStore } = await import('@/lib/founders/offer-store')
const { default: EquityCalculator } = await import('../EquityCalculator')

beforeEach(() => {
  hydratedFlag = true
  pendingHydration = null
  useOfferStore.setState({ ...INITIAL })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the hand-off from the job offer calculator (T7)', () => {
  it('opens on the answers already in the store, not an empty wizard', () => {
    /* "See how the equity band was sized" is a link off the ask ladder. If
       this page ignored the store, that link would drop someone into a blank
       three-step form and ask them to retype what they just answered. */
    useOfferStore.setState({
      role: 'engineer',
      stage: 'series_a',
      joining: 'hired_after',
      offeredSalary: 175_000,
    })
    render(<EquityCalculator />)

    const engineer = screen.getByRole('radio', { name: /software engineer/i })
    expect(engineer).toHaveAttribute('aria-checked', 'true')
    const cto = screen.getByRole('radio', { name: /^CTO$/i })
    expect(cto).toHaveAttribute('aria-checked', 'false')
  })

  it('leaves its own defaults alone when the store is untouched', () => {
    /* A pristine store holds the same shape as INITIAL. Copying it in would be
       a no-op at best and, once the two default sets drift, a silent override
       of this wizard's own defaults by the other tool's. */
    render(<EquityCalculator />)
    expect(screen.getByRole('radio', { name: /^CTO$/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('holds a skeleton rather than painting defaults before hydration', () => {
    hydratedFlag = false
    const { container } = render(<EquityCalculator />)
    expect(screen.queryByRole('radio', { name: /^CTO$/i })).toBeNull()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('seeds when persisted answers arrive after mount', () => {
    hydratedFlag = false
    render(<EquityCalculator />)
    useOfferStore.setState({ role: 'engineer' })
    act(() => {
      hydratedFlag = true
      pendingHydration?.()
    })
    expect(
      screen.getByRole('radio', { name: /software engineer/i })
    ).toHaveAttribute('aria-checked', 'true')
  })
})

describe('the privacy claim and the control that keeps it true (D3)', () => {
  it('says nothing leaves the browser and offers a way to empty it', () => {
    useOfferStore.setState({ role: 'engineer' })
    render(<EquityCalculator />)
    expect(screen.getByText(/nothing leaves your browser/i)).toBeInTheDocument()

    act(() => {
      /* The page's own control, not the desk dock's bin of the same name. */
      screen
        .getAllByRole('button', { name: /clear my answers/i })
        .find((button) => !button.closest('[role="toolbar"]'))
        .click()
    })
    /* Both halves: the shared store and this wizard's own local copy. */
    expect(useOfferStore.getState().isPristine()).toBe(true)
    expect(screen.getByRole('radio', { name: /^CTO$/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })
})

describe('the worked example from the desk dock', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('loads from ?example once hydrated, opens on the results and keeps it', () => {
    window.history.replaceState(null, '', '/founders/equity?example')
    hydratedFlag = false
    render(<EquityCalculator />)
    /* Not before hydration: persisted answers would land on top of it. */
    expect(window.location.search).toBe('?example')

    act(() => {
      hydratedFlag = true
      pendingHydration?.()
    })
    expect(window.location.search).toBe('')
    expect(
      screen.getByRole('button', { name: /change an answer/i })
    ).toBeInTheDocument()
    /* Written through to the shared store, so a reload keeps it. */
    expect(useOfferStore.getState().offeredEquityPct).toBe(3)
    expect(useOfferStore.getState().responsibilities).toHaveLength(5)
  })
})

describe('the board layout', () => {
  it('names the page once, with the question the tool answers', () => {
    render(<EquityCalculator />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent(
      'Are you being sized as a hire while doing founder work?'
    )
    expect(
      screen.getByText(/^Three questions, then your range/)
    ).toBeInTheDocument()
  })

  it('goes back to a done step from the stepper, never forward', () => {
    render(<EquityCalculator />)
    act(() => {
      screen.getByRole('button', { name: /next: what you’ve built/i }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /next: what’s on the table/i }).click()
    })
    expect(
      screen.getByRole('heading', { level: 2, name: /what’s on the table/i })
    ).toBeInTheDocument()

    const progress = screen.getByRole('list', { name: 'Progress' })
    const read = within(progress).getByRole('button', { name: /your read/i })
    expect(read).toHaveAttribute('aria-disabled', 'true')
    act(() => read.click())
    expect(
      screen.getByRole('heading', { level: 2, name: /what’s on the table/i })
    ).toBeInTheDocument()

    act(() => {
      within(progress)
        .getByRole('button', { name: /who you are, done/i })
        .click()
    })
    expect(
      screen.getByRole('heading', { level: 2, name: /which seat/i })
    ).toBeInTheDocument()
  })

  it('moves focus to the verdict on "See my read", as it does to each step', () => {
    render(<EquityCalculator />)
    for (const name of [
      /next: what you’ve built/i,
      /next: what’s on the table/i,
      /see my read/i,
    ]) {
      act(() => screen.getByRole('button', { name }).click())
    }
    const verdict = document.getElementById('eq-verdict')
    expect(verdict).toHaveFocus()
    expect(verdict.tagName).toBe('H2')
  })

  it('fills the worked example in place on step 1 and says so', async () => {
    const { subscribeDesk } = await import('@/components/founders/desk-toast')
    const heard = vi.fn()
    const stop = subscribeDesk(heard)
    render(<EquityCalculator />)
    act(() => {
      screen.getByRole('button', { name: 'Fill in the worked example' }).click()
    })
    expect(heard).toHaveBeenCalledWith('Worked example filled in')
    /* Still on step 1, with the example's answers in the store. */
    expect(
      screen.getByRole('heading', { level: 2, name: /which seat/i })
    ).toBeInTheDocument()
    expect(useOfferStore.getState().offeredEquityPct).toBe(3)
    stop()
  })
})

describe('the review request carries the full read', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('snapshots the wizard inputs so the review shows the same numbers', async () => {
    const { computeRead } = await import('@/lib/founders/equity/engine')
    const { EXAMPLE } = await import('@/lib/founders/equity/benchmarks')
    window.history.replaceState(null, '', '/founders/equity?example')
    render(<EquityCalculator />)

    act(() => {
      screen
        .getByRole('link', { name: /have amware review this offer/i })
        .click()
    })
    const asked = useOfferStore.getState().askedRead()
    expect(asked.from).toBe('equity')
    expect(asked.snapshot).toBe(true)
    /* The worked example: 12 and 8.5–15.5 on this screen, so the review
       must compute the same, not the 13 the shared store alone gives. */
    const fromSnapshot = computeRead(asked.inputs, asked.options)
    const onScreen = computeRead(EXAMPLE)
    expect(fromSnapshot.offer.numberToSay?.value).toBe(
      onScreen.offer.numberToSay?.value
    )
    expect(fromSnapshot.offer.range).toEqual(onScreen.offer.range)
  })
})

describe('arrowing across the seat cards', () => {
  it('does not lose the step 2 picks for a seat it passes through', async () => {
    const { fireEvent } = await import('@testing-library/react')
    useOfferStore.setState({ role: 'cto', responsibilities: ['architecture'] })
    render(<EquityCalculator />)
    const cto = screen.getByRole('radio', { name: /^CTO$/i })
    act(() => cto.focus())
    fireEvent.keyDown(cto, { key: 'ArrowRight' })
    expect(cto).toHaveAttribute('aria-checked', 'false')
    fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: /^CTO$/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(useOfferStore.getState().responsibilities).toEqual(['architecture'])
  })
})

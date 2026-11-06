import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* Hydration is the thing worth controlling here: the store persists, and
   `persist` resolves after mount. These flags let the tests drive the
   pre-hydration frame, which is otherwise impossible to catch. */
let hydratedFlag = true
let pendingHydration = null

/* jsdom never finishes an exit animation, so AnimatePresence in "wait" mode
   holds the next step forever. That is a harness limitation, not product
   behaviour: stepping works in a real browser. Mock only the presence wrapper
   and leave the rest of motion real. */
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
const { default: JobOfferCalculator } = await import('../JobOfferCalculator')

beforeEach(() => {
  hydratedFlag = true
  pendingHydration = null
  useOfferStore.setState({ ...INITIAL })
})
afterEach(() => {
  useOfferStore.setState({ ...INITIAL })
})

const clickText = (label) =>
  fireEvent.click(screen.getByRole('button', { name: label }))

const walkToAsk = () => {
  clickText(/^Next: the company$/)
  clickText(/^Next: the offer$/)
  clickText(/^See my ask$/)
}

describe('cold start (plan tests 21 and 22)', () => {
  it('opens on the seat step with the classification inputs on it', () => {
    render(<JobOfferCalculator />)
    expect(
      screen.getByRole('heading', { name: /what are you being hired to be/i })
    ).toBeInTheDocument()
    /* The gates and the chips are here, not on a later step, because they are
       what decide the founder-versus-market cash band. */
    expect(screen.getByText(/full time on signing/i)).toBeInTheDocument()
    expect(
      screen.getByText(/final say on technical decisions/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/what is yours to own/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'None of these' })).toBeTruthy()
  })

  it('is three steps and a result, not two', () => {
    render(<JobOfferCalculator />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    clickText(/^Next: the company$/)
    expect(
      screen.getByRole('heading', { name: /where is this company/i })
    ).toBeInTheDocument()
    clickText(/^Next: the offer$/)
    expect(
      screen.getByRole('heading', { name: /what did they offer/i })
    ).toBeInTheDocument()
    clickText(/^See my ask$/)
    expect(
      screen.getByRole('heading', { level: 2, name: /^Ask for/ })
    ).toBeTruthy()
  })

  it('asks industry and location as radio chip rows (spec fork F1)', () => {
    render(<JobOfferCalculator />)
    clickText(/^Next: the company$/)
    const industry = screen.getByRole('radiogroup', { name: /^industry$/i })
    const geo = screen.getByRole('radiogroup', {
      name: /where the role is paid/i,
    })
    expect(
      within(industry).getByRole('radio', { name: /SaaS or general/ })
    ).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(
      within(industry).getByRole('radio', { name: /AI or machine learning/ })
    )
    expect(useOfferStore.getState().industry).toBe('ai')
    fireEvent.click(within(geo).getByRole('radio', { name: /Bay Area/ }))
    expect(useOfferStore.getState().geo).toBe('bay_nyc')
  })

  it('has one visible h1, the tool question, in the wizard and the ask', () => {
    const { unmount } = render(<JobOfferCalculator />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: /what to ask for/i })
    ).toBeInTheDocument()
    unmount()
    useOfferStore.setState({ ...INITIAL, role: 'engineer' })
    render(<JobOfferCalculator />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('goes back to a done step from the stepper, never forward', () => {
    render(<JobOfferCalculator />)
    clickText(/^Next: the company$/)
    clickText(/^Next: the offer$/)
    const progress = screen.getByRole('list', { name: 'Progress' })
    /* A step not reached yet is announced as such and does nothing. */
    const ask = within(progress).getByRole('button', { name: /your ask/i })
    expect(ask).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(ask)
    expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument()
    fireEvent.click(
      within(progress).getByRole('button', { name: /your seat, done/i })
    )
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })

  it('moves focus to the verdict on See my ask', () => {
    render(<JobOfferCalculator />)
    walkToAsk()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2, name: /^Ask for/ })
    )
  })

  it('names the industry by its label in the context line, not its key', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer', industry: 'ai' })
    render(<JobOfferCalculator />)
    const section = screen
      .getByRole('heading', { level: 2, name: /^Ask for/ })
      .closest('section')
    expect(within(section).getByText(/· AI ·/)).toBeInTheDocument()
    expect(within(section).queryByText(/· ai ·/)).toBeNull()
  })

  it('keeps each seat’s picks when arrowing across the seat cards', () => {
    render(<JobOfferCalculator />)
    fireEvent.click(
      screen.getByRole('button', { name: /designed the architecture/i })
    )
    expect(useOfferStore.getState().responsibilities).toEqual(['architecture'])
    const cto = screen.getByRole('radio', { name: 'CTO' })
    /* Arrowing is selecting in a radiogroup: right to the engineer seat and
       back again must not lose the CTO's answer on the way. */
    fireEvent.keyDown(cto, { key: 'ArrowRight' })
    expect(useOfferStore.getState().role).toBe('engineer')
    expect(useOfferStore.getState().responsibilities).toEqual([])
    fireEvent.keyDown(
      screen.getByRole('radio', { name: 'Software engineer' }),
      {
        key: 'ArrowLeft',
      }
    )
    expect(useOfferStore.getState().role).toBe('cto')
    expect(useOfferStore.getState().responsibilities).toEqual(['architecture'])
    expect(useOfferStore.getState().workAnswered).toBe(true)
  })

  it('lets a chip replace "None of these" instead of being swallowed by it', () => {
    render(<JobOfferCalculator />)
    clickText('None of these')
    expect(useOfferStore.getState().workAnswered).toBe(true)
    fireEvent.click(
      screen.getByRole('button', { name: /designed the architecture/i })
    )
    expect(useOfferStore.getState().responsibilities).toEqual(['architecture'])
    expect(
      screen.getByRole('button', { name: 'None of these' })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('steps the offered equity by a quarter point, rounded to two places', () => {
    render(<JobOfferCalculator />)
    clickText(/^Next: the company$/)
    clickText(/^Next: the offer$/)
    act(() => useOfferStore.setState({ offeredEquityPct: 3 }))
    clickText('Less equity')
    expect(useOfferStore.getState().offeredEquityPct).toBe(2.75)
    clickText('Less equity')
    expect(useOfferStore.getState().offeredEquityPct).toBe(2.5)
    clickText('More equity')
    expect(useOfferStore.getState().offeredEquityPct).toBe(2.75)
  })

  it('takes a vesting length outside the presets through Other', () => {
    useOfferStore.setState({ ...INITIAL, vestingYears: 6 })
    render(<JobOfferCalculator />)
    /* A stored 6 is an answer, so this lands on the ask; go back to it. */
    clickText(/edit answers/i)
    clickText(/^Next: the company$/)
    clickText(/^Next: the offer$/)
    const vesting = screen.getByRole('radiogroup', { name: /^vesting$/i })
    expect(
      within(vesting).getByRole('radio', { name: 'Other' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      within(vesting).getByRole('radio', { name: '3 years' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('reaches a real classification rather than staying pending', () => {
    /* The whole reason the gates and chips moved onto step one. A cold start
       that classifies as unknown has no cash bucket to look up. */
    render(<JobOfferCalculator />)
    fireEvent.click(
      screen.getByRole('button', { name: /designed the architecture/i })
    )
    walkToAsk()
    const verdict = screen.getByRole('heading', { level: 2, name: /^Ask for/ })
    expect(verdict.textContent).toMatch(/Ask for \$[\d.]+k and [\d.]+%\./)
  })
})

describe('arriving prefilled (plan test 23)', () => {
  it('lands on the ask with no wizard when the store already has answers', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer', stage: 'series_a' })
    render(<JobOfferCalculator />)
    expect(
      screen.getByRole('heading', { level: 2, name: /^Ask for/ })
    ).toBeTruthy()
    expect(screen.queryByText(/step 1 of 4/i)).toBeNull()
  })

  it('stays on step one when nothing has been answered', () => {
    render(<JobOfferCalculator />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })
})

describe('clear my answers (plan test 24)', () => {
  it('empties the store and returns to the first step', () => {
    useOfferStore.setState({
      ...INITIAL,
      role: 'engineer',
      offeredSalary: 200000,
    })
    render(<JobOfferCalculator />)
    /* The ask's own control, not the desk dock's bin of the same name. */
    fireEvent.click(
      screen
        .getAllByRole('button', { name: /clear my answers/i })
        .find((button) => !button.closest('[role="toolbar"]'))
    )
    expect(useOfferStore.getState().role).toBe('cto')
    expect(useOfferStore.getState().offeredSalary).toBeNull()
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })
})

describe('inputs commit on blur, not per keystroke (plan test 25)', () => {
  it('leaves the store alone while typing and writes on blur', () => {
    render(<JobOfferCalculator />)
    clickText(/^Next: the company$/)
    clickText(/^Next: the offer$/)
    const salary = screen.getByLabelText(/salary offered/i)

    fireEvent.change(salary, { target: { value: '18' } })
    fireEvent.change(salary, { target: { value: '180' } })
    fireEvent.change(salary, { target: { value: '180000' } })
    /* Half-typed values must never reach shared state: a reload at the wrong
       moment would otherwise bring back $18. */
    expect(useOfferStore.getState().offeredSalary).toBeNull()

    fireEvent.blur(salary)
    expect(useOfferStore.getState().offeredSalary).toBe(180000)
  })

  it('also commits on Enter', () => {
    render(<JobOfferCalculator />)
    clickText(/^Next: the company$/)
    clickText(/^Next: the offer$/)
    const salary = screen.getByLabelText(/salary offered/i)
    fireEvent.change(salary, { target: { value: '150000' } })
    fireEvent.keyDown(salary, { key: 'Enter' })
    fireEvent.blur(salary)
    expect(useOfferStore.getState().offeredSalary).toBe(150000)
  })
})

describe('the hydration frame (plan tests 30c and 30d)', () => {
  it('shows a skeleton rather than the store defaults before hydration', () => {
    hydratedFlag = false
    useOfferStore.setState({ ...INITIAL, role: 'engineer' })
    render(<JobOfferCalculator />)
    /* Without this gate the server paints CTO at pre-seed and the numbers
       then animate to the real ones. Wrong numbers, moving, about money. */
    expect(
      screen.queryByRole('heading', { level: 2, name: /^Ask for/ })
    ).toBeNull()
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('suppresses the count-up on the first paint after hydration', () => {
    hydratedFlag = false
    useOfferStore.setState({ ...INITIAL, role: 'engineer' })
    render(<JobOfferCalculator />)
    expect(pendingHydration).toBeTypeOf('function')

    hydratedFlag = true
    act(() => pendingHydration())

    const verdict = screen.getByRole('heading', { level: 2, name: /^Ask for/ })
    expect(verdict).toBeTruthy()
    /* The dominant rung's cash renders at its final value rather than counting
       from zero: those numbers arrived, they did not change. */
    const rows = document.querySelectorAll('.amw-price')
    const target = [...rows].find((el) => /^\$[\d.]+k$/.test(el.textContent))
    expect(target).toBeTruthy()
    expect(target.textContent).not.toBe('$0')
  })
})

describe('provenance and motion (plan tests 30f and 30)', () => {
  it('marks derived rungs with est. and leaves sourced ones unmarked', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer', stage: 'series_a' })
    render(<JobOfferCalculator />)
    const marks = screen.getAllByTitle(
      /this figure is (interpolated|estimate)/i
    )
    expect(marks.length).toBeGreaterThan(0)
    for (const m of marks) expect(m.textContent).toBe('est.')
  })

  it('renders the three rungs as rows inside one ladder, never as cards', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer' })
    render(<JobOfferCalculator />)
    const ladder = screen
      .getByRole('heading', { level: 2, name: /^Ask for/ })
      .closest('section')
    expect(within(ladder).getByText('Open with')).toBeInTheDocument()
    expect(within(ladder).getByText('Aim for')).toBeInTheDocument()
    expect(
      within(ladder).getByText('Minimum the market supports')
    ).toBeInTheDocument()
  })

  it('keeps the privacy line honest about what persists', () => {
    render(<JobOfferCalculator />)
    expect(screen.getByText(/nothing leaves your browser/i)).toBeInTheDocument()
  })
})

describe('the ask, in the board’s layout', () => {
  it('keeps the trade warning the board drops, at Series B and later', () => {
    useOfferStore.setState({
      ...INITIAL,
      role: 'engineer',
      stage: 'series_b_plus',
      offeredSalary: 90_000,
    })
    render(<JobOfferCalculator />)
    /* Its own sentence under the floor note, not only a flag. */
    const lines = screen.getAllByText(/rarely worth what you get back/i)
    expect(lines.some((el) => el.tagName === 'P')).toBe(true)
  })

  it('draws the rungs and the offer as one ordered ladder', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer', offeredSalary: 9e4 })
    render(<JobOfferCalculator />)
    const ladder = screen.getByRole('list', { name: 'The ask ladder' })
    const rows = within(ladder).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(within(rows[3]).getByText('On the table now')).toBeInTheDocument()
  })

  it('records the ask from this tool before opening the review', () => {
    useOfferStore.setState({ ...INITIAL, role: 'engineer' })
    render(<JobOfferCalculator />)
    /* The page's own CTA under the ask, not the desk dock's tile. */
    const link = screen
      .getAllByRole('link', { name: /review my offer/i })
      .find((el) => !el.closest('[role="toolbar"]'))
    expect(link).toHaveAttribute('href', '/contact/offer-review')
    fireEvent.click(link)
    const state = useOfferStore.getState()
    expect(state.askedAt).toBeTruthy()
    expect(state.askedFrom).toBe('job-offer')
  })
})

describe('the worked example from the desk dock', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('loads from ?example, opens on the ask and strips the param', () => {
    window.history.replaceState(null, '', '/founders/job-offer?example')
    render(<JobOfferCalculator />)
    expect(window.location.search).toBe('')
    expect(useOfferStore.getState().offeredEquityPct).toBe(3)
    expect(useOfferStore.getState().workAnswered).toBe(true)
    expect(screen.queryByText(/step 1 of 4/i)).toBeNull()
  })

  it('fills it in place from step 1, so the visitor can walk through it', () => {
    render(<JobOfferCalculator />)
    clickText(/fill in the worked example/i)
    expect(useOfferStore.getState().offeredEquityPct).toBe(3)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })
})

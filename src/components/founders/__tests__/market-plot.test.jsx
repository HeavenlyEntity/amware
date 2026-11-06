import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { MarketPlot } from '@/components/founders/market-plot'
import { EXAMPLE } from '@/lib/founders/equity/benchmarks'
import { computeRead } from '@/lib/founders/equity/engine'
import { computeAsk } from '@/lib/founders/equity/negotiation'
import { buildPlot } from '@/lib/founders/equity/plot'

const plotFor = (over = {}, options = {}) => {
  const read = computeRead({
    ...EXAMPLE,
    role: 'engineer',
    offeredSalary: 180_000,
    ...over,
  })
  return buildPlot(read, computeAsk(read), options)
}

const rowButton = (name) =>
  screen.getByRole('button', { name: new RegExp(name, 'i') })

describe('disclosure by tap, never by hover (plan test 26)', () => {
  it('makes every row a button that expands its own breakdown', () => {
    render(<MarketPlot plot={plotFor()} />)
    const google = rowButton('google')
    expect(google).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(google)
    expect(google).toHaveAttribute('aria-expanded', 'true')

    const panel = document.getElementById(google.getAttribute('aria-controls'))
    expect(within(panel).getByText('Base')).toBeInTheDocument()
    expect(within(panel).getByText('Stock per year')).toBeInTheDocument()
  })

  it('closes the open row when another opens, so only one panel shows', () => {
    render(<MarketPlot plot={plotFor()} />)
    fireEvent.click(rowButton('google'))
    fireEvent.click(rowButton('meta'))
    expect(rowButton('google')).toHaveAttribute('aria-expanded', 'false')
    expect(rowButton('meta')).toHaveAttribute('aria-expanded', 'true')
  })

  it('reaches every row by keyboard, because they are real buttons', () => {
    const plot = plotFor()
    render(<MarketPlot plot={plot} />)
    /* One button per company plus the user's own row. */
    const buttons = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-expanded'))
    expect(buttons).toHaveLength(plot.rows.length + 1)
  })
})

describe('the scenario control (plan test 27)', () => {
  it('sits above the chart it drives and reports changes', () => {
    const onScenarioChange = vi.fn()
    const plot = plotFor()
    render(<MarketPlot plot={plot} onScenarioChange={onScenarioChange} />)
    /* The $0 outcome is the most useful thing here; it cannot live below the
       fold of its own chart. */
    const control = screen.getByText(/if the company ends up worth/i)
    const list = document.querySelector('ul')
    expect(control.compareDocumentPosition(list)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    fireEvent.click(screen.getByRole('radio', { name: /\$0/ }))
    expect(onScenarioChange).toHaveBeenCalledWith('zero')
  })

  it('moves only the user bar when the outcome changes', () => {
    const zero = plotFor({}, { scenarioId: 'zero' })
    const base = plotFor({}, { scenarioId: 'base' })
    /* Company rows are identical across outcomes; only the reader's own row
       responds, which is the entire lesson of the chart. */
    expect(base.rows.map((r) => r.total)).toEqual(zero.rows.map((r) => r.total))
    expect(base.user.total).toBeGreaterThan(zero.user.total)
    expect(base.domain).toBe(zero.domain)
  })
})

describe('what the chart says about itself (plan tests 28, 29b, 29c, 29d)', () => {
  it('leads with the thesis, before the bars', () => {
    const plot = plotFor()
    render(<MarketPlot plot={plot} />)
    const thesis = screen.getByText(/vest whatever happens/i)
    const list = document.querySelector('ul')
    expect(thesis.compareDocumentPosition(list)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('warns about its own age only once it is stale', () => {
    const fresh = plotFor({}, { now: new Date('2026-09-05') })
    render(<MarketPlot plot={fresh} />)
    expect(screen.queryByText(/due a refresh/i)).toBeNull()
  })

  it('shows the staleness line when the data has aged out', () => {
    const old = plotFor({}, { now: new Date('2028-01-01') })
    render(<MarketPlot plot={old} />)
    expect(screen.getByText(/due a refresh/i)).toBeInTheDocument()
  })

  it('explains itself instead of rendering a chart for the CEO seat', () => {
    render(<MarketPlot plot={plotFor({ role: 'ceo_builder' })} />)
    expect(screen.getByText(/no published pay ladder/i)).toBeInTheDocument()
    expect(document.querySelector('ul')).toBeNull()
  })

  it('gives Netflix its own explanation rather than a silent zero', () => {
    render(<MarketPlot plot={plotFor()} />)
    fireEvent.click(rowButton('netflix'))
    expect(screen.getByText(/one cash number by design/i)).toBeInTheDocument()
  })

  it('marks the thin-n leadership rows as estimates', () => {
    render(<MarketPlot plot={plotFor({ role: 'cto' })} />)
    const marks = screen.getAllByTitle(/this row is (interpolated|estimate)/i)
    expect(marks.length).toBeGreaterThan(0)
  })

  it('names the liquidity kind on every row, in words not letters', () => {
    render(<MarketPlot plot={plotFor()} />)
    expect(
      screen.getAllByTitle(/sells the morning it vests/i).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByTitle(/tender offer/i).length).toBeGreaterThan(0)
    /* The reader holds the least liquid kind on the board, and the chart says
       so in a word rather than a letter they have to decode. */
    expect(screen.getByTitle(/strike price/i).textContent).toBe('Options')
  })

  it('attributes Levels.fyi, which their licence requires', () => {
    render(<MarketPlot plot={plotFor()} />)
    const link = screen.getByRole('link', { name: /levels\.fyi/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('levels.fyi'))
  })
})

describe('the rows are a list, never a squeezed chart (plan test 30b)', () => {
  it('renders one list item per row rather than a fixed-width canvas', () => {
    const plot = plotFor()
    render(<MarketPlot plot={plot} />)
    /* A list reflows on a phone; an eleven-bar chart squeezed into 200px does
       not, and its segments vanish first. */
    expect(screen.getAllByRole('listitem')).toHaveLength(plot.rows.length + 1)
    /* No canvas and no fixed-size drawing surface: the bars are elements that
       reflow, so nothing has to be squeezed. */
    expect(document.querySelector('canvas')).toBeNull()
    for (const bar of document.querySelectorAll('[style*="width"]')) {
      expect(bar.style.width).toMatch(/%$/)
    }
  })

  it('keeps every collapsed panel printable', () => {
    render(<MarketPlot plot={plotFor()} />)
    const google = rowButton('google')
    const panel = document.getElementById(google.getAttribute('aria-controls'))
    /* Hidden on screen, revealed on paper: hover does not exist in print. */
    expect(panel.className).toMatch(/print:block/)
  })
})

describe('the board layout (Offer board)', () => {
  it('says so in words when a bar runs past the end of the scale', () => {
    const plot = plotFor({ role: 'cto' })
    render(<MarketPlot plot={plot} />)
    const over = [...plot.rows, plot.user].filter((r) => r.total > plot.domain)
    /* The chip is drawn on the (decorative) bar; the row's name carries it
       in words beside the total. */
    expect(screen.queryAllByText(/^Off scale/)).toHaveLength(over.length)
    expect(screen.queryAllByText(', off scale')).toHaveLength(over.length)
  })

  it('never lets a bar’s two segments pass 100%', () => {
    render(<MarketPlot plot={plotFor({ role: 'cto' })} />)
    for (const bar of document.querySelectorAll('.amw-jo-bar')) {
      const total = [...bar.querySelectorAll('i')].reduce(
        (sum, seg) => sum + parseFloat(seg.style.width),
        0
      )
      expect(total).toBeLessThanOrEqual(100.0001)
    }
  })
})

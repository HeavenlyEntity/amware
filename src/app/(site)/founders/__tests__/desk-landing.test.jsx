import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import FoundersDeskPage from '../page'
import { EXAMPLE_READ } from '@/lib/founders/equity/engine'
import { computeAsk } from '@/lib/founders/equity/negotiation'
import {
  ASK_HREF,
  EQUITY_HREF,
  REVIEW_HREF,
  liveTools,
  soonTools,
} from '@/lib/founders/tools'

const ask = computeAsk(EXAMPLE_READ)

const ladderOf = () =>
  screen.getByText(/the same example, priced as an ask/i).closest('figure')

describe('the desk landing has one way in', () => {
  /* The page's first design decision, hard-rejected in its menu form by both
     outside voices. The path cards below the fold are outlined surfaces with
     a text action, so the hero's button stays the only filled CTA. */
  it('offers exactly one filled primary action', () => {
    const { container } = render(<FoundersDeskPage />)
    const primaries = container.querySelectorAll('[data-desk-primary]')
    expect(primaries).toHaveLength(1)
    expect(primaries[0]).toHaveAttribute('href', EQUITY_HREF)
    expect(primaries[0]).toHaveTextContent(/read my offer/i)
    expect(primaries[0].className).toMatch(/amw-dk-cta/)
    expect(container.querySelectorAll('.amw-dk-cta')).toHaveLength(1)
  })

  it('reaches the second tool as a link, not a rival button', () => {
    render(<FoundersDeskPage />)
    const link = screen.getByRole('link', { name: /turn it into an ask/i })
    expect(link).toHaveAttribute('href', ASK_HREF)
    expect(link).not.toHaveAttribute('data-desk-primary')
    expect(link.className).not.toMatch(/amw-dk-cta/)
  })

  it('draws the two live tools as one numbered path from the registry', () => {
    render(<FoundersDeskPage />)
    const path = screen
      .getByRole('heading', { name: /one path\. two stops\./i })
      .closest('section')
    const cards = within(path).getAllByRole('listitem')
    expect(cards).toHaveLength(liveTools().length)
    liveTools().forEach((tool, index) => {
      const link = within(cards[index]).getByRole('link')
      expect(link).toHaveAttribute('href', tool.href)
      expect(link).toHaveTextContent(tool.label)
      expect(link).toHaveTextContent(tool.cta)
      expect(link).toHaveTextContent(String(index + 1).padStart(2, '0'))
      expect(link).not.toHaveAttribute('data-desk-primary')
    })
  })

  it('offers the review as a person to read it', () => {
    render(<FoundersDeskPage />)
    expect(
      screen.getByRole('link', { name: /have alec review your offer/i })
    ).toHaveAttribute('href', REVIEW_HREF)
  })

  it('counts the tools in the works from the registry', () => {
    render(<FoundersDeskPage />)
    const soon = soonTools()
    expect(screen.getByText(`${soon.length} in the works`)).toBeInTheDocument()
    const coming = screen
      .getByRole('heading', { name: /coming to the desk/i })
      .closest('section')
    for (const tool of soon) {
      expect(within(coming).getByText(tool.label)).toBeInTheDocument()
    }
    /* Nowhere to go yet, so not links. */
    expect(within(coming).queryAllByRole('link')).toHaveLength(0)
  })
})

describe('the example shows both of the desk outputs', () => {
  it('prices the same example as an ask, from the engine', () => {
    render(<FoundersDeskPage />)
    const ladder = ladderOf()
    for (const id of ask.order) {
      /* Generated, never typed: if a benchmark refresh moves these, the page
         moves with it and this test follows. */
      expect(within(ladder).getByText(ask[id].label)).toBeInTheDocument()
    }
    /* Server-rendered final values: no count-up from $0k. */
    expect(within(ladder).getByText('$100k')).toBeInTheDocument()
    expect(within(ladder).getByText('13%')).toBeInTheDocument()
  })

  it('names the columns for assistive tech', () => {
    render(<FoundersDeskPage />)
    const table = within(ladderOf()).getByRole('table')
    expect(
      within(table).getByRole('columnheader', { name: 'Cash' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('columnheader', { name: 'Equity' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('rowheader', { name: ask.target.label })
    ).toBeInTheDocument()
  })

  it('makes the middle rung dominant by weight, never by an accent fill', () => {
    render(<FoundersDeskPage />)
    const ladder = ladderOf()
    /* A teal fill reads as "selected" in this design system, which would have
       the landing recommending an ask to someone who has not used the tool.
       The accent on the meters is hover/focus feedback only (CSS). */
    expect(ladder.innerHTML).not.toMatch(/amw-accent/)
    expect(within(ladder).getByText('$100k').className).toMatch(/font-semibold/)
    expect(within(ladder).getByText('$118k').className).not.toMatch(
      /font-semibold/
    )
  })

  it('reads the finding off the example rather than asserting one', () => {
    render(<FoundersDeskPage />)
    const gap = EXAMPLE_READ.offer.gapPts
    expect(
      screen.getByText(new RegExp(`${gap[0]} to ${gap[1]} points short`))
    ).toBeInTheDocument()
  })

  it('cites the cash source too, now that it shows cash figures', () => {
    render(<FoundersDeskPage />)
    expect(
      screen.getByText(new RegExp(ask.bands.cash.asOf))
    ).toBeInTheDocument()
  })

  it('starts the slider at the example, with the band read off the engine', () => {
    render(<FoundersDeskPage />)
    const { lo, mid } = EXAMPLE_READ.offer.range
    const slider = screen.getByRole('slider', {
      name: /drag to try a different offer/i,
    })
    expect(slider).toHaveValue(String(EXAMPLE_READ.offer.pct))
    const picks = within(screen.getByRole('group', { name: /quick picks/i }))
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(picks).toEqual([
      `${EXAMPLE_READ.offer.pct}% · the example`,
      `${lo}% · band floor`,
      `${mid}% · mid-band`,
    ])
  })
})

describe('the copy covers both tools', () => {
  it('promises the range and the number to ask for', () => {
    render(<FoundersDeskPage />)
    expect(
      screen.getByText(/range to say out loud, then the number to ask for/i)
    ).toBeInTheDocument()
  })

  it('keeps the trust claims as a list', () => {
    render(<FoundersDeskPage />)
    for (const claim of [
      'No account',
      'Every number has a source',
      'Nothing leaves your browser',
    ]) {
      expect(screen.getByText(claim).tagName).toBe('LI')
    }
  })
})

describe('the engine stays on the server', () => {
  /* The landing computes everything in its server component; the client
     islands get plain data. Importing the engine into one of them would ship
     the benchmarks, dilution and salary bands to every visitor. */
  it('no client module of the desk imports the engine', () => {
    const dir = path.resolve(process.cwd(), 'src/components/founders/desk')
    for (const file of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, file), 'utf8')
      if (!/^['"]use client['"]/.test(text)) continue
      expect(text, file).not.toMatch(
        /equity\/(engine|negotiation|benchmarks)|desk-landing/
      )
    }
  })
})

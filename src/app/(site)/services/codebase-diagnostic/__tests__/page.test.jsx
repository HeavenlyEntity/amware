import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/* /services/codebase-diagnostic explains the Diagnostic and sells only the
   free intro call: no price, no deposit checkout, out of search and out of
   the sitemap. Its words come from content/site/codebase-diagnostic.js. */

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))
vi.mock('@/components/analytics/TrackView', () => ({ TrackView: () => null }))
vi.mock('@/lib/fx/gradient-ascii', () => ({
  mount: vi.fn(() => ({ failed: true, destroy: vi.fn(), set: vi.fn() })),
}))
/* One ordinary document, not none: sitemap.js reads `docs[0].machine` for
   the catalog entry, so an empty index throws before it lists anything. */
vi.mock('@/lib/ai/documents', () => ({
  documentIndex: vi.fn(async () => [
    {
      source: 'https://www.amware.dev/services',
      machine: 'https://www.amware.dev/ai/services',
    },
  ]),
}))

import Page, { metadata } from '../page'

describe('Codebase Diagnostic page', () => {
  it('is kept out of search', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it('leads with the free intro call, top and bottom', async () => {
    render(await Page())
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /find out what is actually wrong/i,
      })
    ).toBeInTheDocument()
    const calls = screen.getAllByRole('button', {
      name: /book a free intro call/i,
    })
    expect(calls).toHaveLength(2)
    for (const call of calls)
      expect(call).toHaveAttribute('data-cal-link', 'amware/intro-call')
  })

  it('names no price and offers no deposit checkout', async () => {
    const { container } = render(await Page())
    expect(container.textContent).not.toMatch(/\$\s?\d/)
    expect(screen.queryByRole('button', { name: /reserve/i })).toBeNull()
  })

  it('walks the four steps and the eight places', async () => {
    render(await Page())
    for (const name of [
      /intro call\./i,
      /strategy call\./i,
      /the diagnostic\./i,
      /report and walkthrough\./i,
    ])
      expect(
        screen.getByRole('heading', { level: 3, name })
      ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('region', { name: /the parts your users feel/i })
      ).getAllByRole('heading', { level: 3 })
    ).toHaveLength(8)
  })

  it('labels the sample findings as an example', async () => {
    render(await Page())
    expect(screen.getByText(/not from a real client/i)).toBeInTheDocument()
  })

  it('lets the hero link reach the report section', async () => {
    const { container } = render(await Page())
    expect(container.querySelector('#report')).not.toBeNull()
  })

  it('is not in the sitemap', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()
    expect(
      entries.filter((entry) =>
        String(entry.url).includes('codebase-diagnostic')
      )
    ).toEqual([])
  })
})

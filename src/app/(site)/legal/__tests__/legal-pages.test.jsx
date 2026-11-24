import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LegalPage, { generateStaticParams } from '../[set]/[doc]/page'
import LegalIndexPage from '../page'

describe('legal pages', () => {
  it('builds exactly the nine set and document pairs', () => {
    expect(generateStaticParams()).toHaveLength(9)
  })

  it.each(generateStaticParams())(
    'renders $set/$doc with its tabs and visible TODO markers',
    async (params) => {
      render(await LegalPage({ params: Promise.resolve(params) }))

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      const tabs = screen.getByRole('navigation', { name: /policies/ })
      const current = within(tabs).getByRole('link', { current: 'page' })
      expect(current).toHaveAttribute(
        'href',
        `/legal/${params.set}/${params.doc}`
      )
      expect(screen.getAllByText(/^TODO\(alec\):/).length).toBeGreaterThan(0)
    }
  )

  it('links every document from the index', () => {
    render(<LegalIndexPage />)
    for (const { set, doc } of generateStaticParams()) {
      const hrefs = screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
      expect(hrefs).toContain(`/legal/${set}/${doc}`)
    }
  })
})

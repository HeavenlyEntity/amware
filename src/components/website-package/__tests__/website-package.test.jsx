import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('../globe-card', () => ({
  GlobeCard: () => <div data-testid="globe" />,
}))

import { WebsitePackage } from '../index'
import { WEBSITE_PACKAGE } from '@/content/site/website-package'

/* The Build & support tab tells a buyer what a website build includes, in
   the words the owner signed off, and asks for the build. None of the
   template's borrowed social proof comes with it. */

describe('WebsitePackage', () => {
  it('says what a website build includes, in the approved words', () => {
    render(<WebsitePackage />)
    const section = screen.getByRole('region', {
      name: /everything a website build includes/i,
    })
    for (const card of Object.values(WEBSITE_PACKAGE.cards)) {
      expect(
        within(section).getByRole('heading', { name: card.title })
      ).toBeInTheDocument()
      expect(within(section).getByText(card.description)).toBeInTheDocument()
    }
    for (const feature of WEBSITE_PACKAGE.features) {
      expect(
        within(section).getByRole('heading', { name: feature.title })
      ).toBeInTheDocument()
    }
  })

  it('asks for the build and makes no borrowed claims', () => {
    render(<WebsitePackage />)
    expect(
      screen.getByRole('link', { name: /start a website build/i })
    ).toHaveAttribute('href', '/contact')
    expect(document.body.textContent).not.toMatch(
      /trusted by|100\+|companies worldwide/i
    )
  })
})

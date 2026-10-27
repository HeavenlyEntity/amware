import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import {
  EducationRecord,
  ExperienceRecord,
  PRIOR_EMPLOYERS,
} from '../service-records'

const rows = (label) => {
  const heading = screen.getByRole('heading', { name: label })
  return within(heading.parentElement).getAllByRole('listitem')
}

describe('service records', () => {
  it('keeps the hero proof strip to the outside employers', () => {
    expect(PRIOR_EMPLOYERS).toEqual(['NewGen', 'Charles Schwab', 'Honeywell'])
  })

  it('leads the experience list with the two current CTO roles', () => {
    render(<ExperienceRecord />)
    const items = rows('Experience')
    expect(items).toHaveLength(8)
    expect(items[0]).toHaveTextContent('AMWARE Technologies LLC')
    expect(items[0]).toHaveTextContent('Founder & Fractional CTO')
    expect(items[1]).toHaveTextContent('EdenKode')
    expect(items[1]).toHaveTextContent('Chief Technology Officer')
    expect(items[7]).toHaveTextContent('RL Canning (Honeywell)')
  })

  it('lists education in order, with a monogram where no logo exists', () => {
    render(<EducationRecord />)
    const items = rows('Education')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Woolf University'),
      expect.stringContaining('Woz U'),
      expect.stringContaining('Glendale Community College'),
      expect.stringContaining('Anthropic'),
    ])
    expect(within(items[2]).getByText('GCC')).toBeInTheDocument()
  })
})

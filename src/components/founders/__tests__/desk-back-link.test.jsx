import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DeskBackLink, ToolEyebrow, toolNumber } from '../desk-back-link'
import { liveTools } from '@/lib/founders/tools'

describe('DeskBackLink', () => {
  it('links back to the desk', () => {
    render(<DeskBackLink />)
    expect(
      screen.getByRole('link', { name: 'Founders’ Desk' })
    ).toHaveAttribute('href', '/founders')
  })
})

describe('ToolEyebrow', () => {
  it('numbers each tool by its place among the live tools', () => {
    liveTools().forEach((tool, index) => {
      expect(toolNumber(tool.id)).toBe(String(index + 1).padStart(2, '0'))
    })
    expect(toolNumber('equity')).toBe('01')
    expect(toolNumber('job-offer')).toBe('02')
    expect(toolNumber('dilution')).toBeNull()
  })

  it('reads as the boards draw it', () => {
    render(<ToolEyebrow id="job-offer" />)
    expect(
      screen.getByText('// Tool 02 / Job offer calculator')
    ).toBeInTheDocument()
  })

  it('renders nothing for a tool that is not live', () => {
    const { container } = render(<ToolEyebrow id="glossary" />)
    expect(container).toBeEmptyDOMElement()
  })
})

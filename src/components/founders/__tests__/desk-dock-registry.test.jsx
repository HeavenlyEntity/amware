import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/* The registry is the only switch: flip a soon tool to live and its dock tile
   becomes a link, with no change to the dock. */
vi.mock('@/lib/founders/tools', async (importOriginal) => {
  const actual = await importOriginal()
  const TOOLS = actual.TOOLS.map((tool) =>
    tool.id === 'dilution'
      ? { ...tool, status: 'live', href: '/founders/dilution' }
      : tool
  )
  return {
    ...actual,
    TOOLS,
    liveTools: () => TOOLS.filter((tool) => tool.status === 'live'),
    soonTools: () => TOOLS.filter((tool) => tool.status === 'soon'),
  }
})

const { FoundersDeskDock } = await import('../desk-dock')

describe('a tool going live', () => {
  it('turns its dock tile into a link', () => {
    render(<FoundersDeskDock current="desk" />)
    const toolbar = screen.getByRole('toolbar', {
      name: 'Founders’ Desk tools',
    })
    expect(
      within(toolbar).getByRole('link', { name: 'Dilution modeler' })
    ).toHaveAttribute('href', '/founders/dilution')
    expect(
      within(toolbar).queryByRole('button', {
        name: 'Dilution modeler, coming soon',
      })
    ).toBeNull()
  })
})

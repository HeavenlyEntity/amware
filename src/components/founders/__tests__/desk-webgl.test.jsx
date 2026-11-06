import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/* The WebGL modules must never load where the gate says no; if they did,
   these would throw. */
vi.mock('@/components/react-bits/fluid-glass', () => {
  throw new Error('FluidGlass loaded outside its gate')
})
vi.mock('@/components/react-bits/glyph-orb', () => {
  throw new Error('GlyphOrb loaded outside its gate')
})

const { GlassPanel } = await import('../desk/glass-panel')
const { DeskBackdrop } = await import('../desk/desk-backdrop')

/* jsdom has no WebGL and its matchMedia stub matches nothing, so this is the
   phone / touch / no-WebGL path: the static poster only. */
describe('desk WebGL surfaces render their poster first', () => {
  it('GlassPanel shows the lens text statically and keeps its children', () => {
    const { container, getByText } = render(
      <GlassPanel className="h-40" lens={{ text: '3% → 12%' }}>
        <span>The worked example</span>
      </GlassPanel>
    )
    const panel = container.firstChild
    expect(panel).toHaveAttribute('data-lens', 'poster')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(panel).toHaveClass('amw-glass', 'h-40')
    expect(getByText('3% → 12%')).toBeInTheDocument()
    expect(getByText('The worked example')).toBeInTheDocument()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('GlassPanel without a lens is still a panel, named when labelled', () => {
    const { getByRole } = render(
      <GlassPanel label="Second read">
        <p>Body</p>
      </GlassPanel>
    )
    expect(getByRole('group', { name: 'Second read' })).toBeInTheDocument()
  })

  it('DeskBackdrop is decorative, out of print and draws no canvas', () => {
    const { container } = render(<DeskBackdrop />)
    const frame = container.firstChild
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame).toHaveAttribute('data-print', 'hide')
    expect(container.querySelector('.amw-deskbg-poster')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
  })
})

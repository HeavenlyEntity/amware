import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { WizardShell } from '@/components/founders/wizard-shell'
import { SiteHeader } from '@/components/SiteHeader'
import { SliderField } from '@/components/founders/slider-field'
import {
  AccessibilityProvider,
  MotionToggle,
  useReducedMotion,
} from '@/components/AccessibilityProvider'
import { RollingNumber } from '@/components/ui/motion/rolling-number'

function MotionState() {
  return <output>{useReducedMotion() ? 'paused' : 'playing'}</output>
}

describe('public-site accessibility', () => {
  it('contains keyboard focus in open navigation and restores page access on Escape', () => {
    render(
      <>
        <SiteHeader />
        <div id="site-content">
          <a href="/contact">Outside link</a>
        </div>
      </>
    )
    const menu = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(menu)
    const dialog = screen.getByRole('dialog', { name: 'Site navigation' })
    expect(document.getElementById('site-content').inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    const controls = dialog.querySelectorAll('a[href], button:not(:disabled)')
    controls[controls.length - 1].focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(controls[0])
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(controls[controls.length - 1])
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).toBe(menu)
    expect(document.getElementById('site-content').inert).toBeFalsy()
    expect(document.body.style.overflow).toBe('')
  })

  it('names the slider thumb and exposes its formatted value and instructions', async () => {
    const onCommit = vi.fn()
    const { container } = render(
      <SliderField
        id="salary"
        label="Annual salary"
        value={100000}
        onCommit={onCommit}
        track={{ min: 0, max: 200000 }}
        format={(v) => `$${v.toLocaleString('en-US')}`}
        hint="Before tax"
      />
    )
    const slider = screen.getByRole('slider', { name: 'Annual salary' })
    expect(slider).toHaveAttribute('aria-valuetext', '$100,000')
    expect(slider).toHaveAccessibleDescription('Before tax')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenCalledWith(100001)
    const result = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(result.violations).toEqual([])
  })

  it('lets users pause motion independently of their operating system', () => {
    render(
      <AccessibilityProvider>
        <MotionToggle />
        <MotionState />
      </AccessibilityProvider>
    )
    expect(screen.getByRole('status')).toHaveTextContent('playing')
    fireEvent.click(
      screen.getByRole('button', { name: 'Pause continuous animations' })
    )
    expect(screen.getByRole('status')).toHaveTextContent('paused')
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('exposes a rolling number once, hiding the visual digit reels', () => {
    const { container } = render(<RollingNumber targetNumber="99.98" />)
    expect(container.querySelector('.sr-only')).toHaveTextContent('99.98')
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})

it('removes closing navigation links immediately from the tab order', () => {
  render(<SiteHeader />)
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
  expect(
    screen.getByRole('link', { name: /Boilerplates & Products/ })
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(
    screen.queryByRole('link', { name: /Boilerplates & Products/ })
  ).toBeNull()
})

it('focuses incoming wizard headings going forward and back to the first step', async () => {
  const steps = [
    {
      index: 1,
      id: 'one',
      title: 'First question',
      eyebrow: 'First',
      next: 'Next',
    },
    {
      index: 2,
      id: 'two',
      title: 'Second question',
      eyebrow: 'Second',
      next: 'Next',
    },
    { index: 3, id: 'three', title: 'Result', eyebrow: 'Result', next: 'Next' },
  ]
  const { rerender } = render(
    <WizardShell step={1} steps={steps}>
      Answer
    </WizardShell>
  )
  rerender(
    <WizardShell step={2} steps={steps}>
      Answer
    </WizardShell>
  )
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Second question' })
    ).toHaveFocus()
  )
  screen.getByRole('button', { name: 'Back' }).focus()
  rerender(
    <WizardShell step={1} steps={steps}>
      Answer
    </WizardShell>
  )
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'First question' })
    ).toHaveFocus()
  )
})

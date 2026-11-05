import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* The hero's work wall: decorative, still under reduced motion, and only
   on the desktop hero. GridMotion is exercised for real with a sized box;
   the wall's gate with the component stubbed. */

const env = vi.hoisted(() => ({ desktop: true, reduced: false }))
const props = vi.hoisted(() => ({ last: null }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))
vi.mock('@/hooks/use-client-value', () => ({
  useMounted: () => true,
  useMediaQuery: () => env.desktop,
}))

import GridMotion from '@/components/react-bits/grid-motion'

const cover = { src: '/cover.png', width: 1600, height: 1200 }

describe('GridMotion', () => {
  let raf
  const RealResizeObserver = globalThis.ResizeObserver
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1088)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(640)
    raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    globalThis.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback
      }
      observe() {
        this.callback([])
      }
      disconnect() {}
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.ResizeObserver = RealResizeObserver
  })

  it('tiles the covers as decoration: aria-hidden plane, empty alts', () => {
    const { container } = render(<GridMotion items={[cover]} rows={4} />)
    const plane = container.querySelector('.gm-plane')
    expect(plane).toHaveAttribute('aria-hidden', 'true')
    const images = container.querySelectorAll('img')
    expect(images.length).toBeGreaterThan(4)
    images.forEach((img) => expect(img).toHaveAttribute('alt', ''))
  })

  it('holds still under reduced motion: laid out once, no animation frame', () => {
    const onReady = vi.fn()
    const { container } = render(
      <GridMotion items={[cover]} reduced onReady={onReady} />
    )
    expect(raf).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.gm-plane')).toHaveStyle({ opacity: '1' })
    container.querySelectorAll('.gm-row').forEach((row) => {
      expect(row.style.transform).toMatch(/^translate3d\(/)
    })
  })

  it('drifts when motion is allowed', () => {
    render(<GridMotion items={[cover]} />)
    expect(raf).toHaveBeenCalled()
  })
})

describe('WorkWall', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/components/react-bits/grid-motion', () => ({
      default: (p) => {
        props.last = p
        return <div data-testid="grid-motion" />
      },
    }))
    props.last = null
    Object.assign(env, { desktop: true, reduced: false })
  })

  it('loads the wall on desktop, still under reduced motion', async () => {
    env.reduced = true
    const { WorkWall, WALL_COVERS } = await import('../work-wall')
    const { container } = render(<WorkWall />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    await screen.findByTestId('grid-motion')
    expect(props.last.reduced).toBe(true)
    expect(props.last.items).toBe(WALL_COVERS)
    expect(props.last.grayscale).toBe(true)
  })

  it('stays a poster on a phone', async () => {
    env.desktop = false
    const { WorkWall } = await import('../work-wall')
    const { container } = render(<WorkWall />)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByTestId('grid-motion')).toBeNull()
    expect(container.firstChild).toHaveAttribute('data-wall', 'poster')
  })
})

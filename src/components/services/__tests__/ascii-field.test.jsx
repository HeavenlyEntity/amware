import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/* The gate's inputs, each under the test's control: the site's motion
   verdict (the pause toggle as well as the OS), the viewport, WebGL2, and
   the desk gate the accent uses. */
const env = vi.hoisted(() => ({
  reduced: false,
  phone: true,
  webgl: true,
  desk: true,
}))
const fx = vi.hoisted(() => {
  const destroy = vi.fn()
  const set = vi.fn()
  return { destroy, set, mount: vi.fn(() => ({ set, destroy })) }
})

vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))
vi.mock('@/hooks/use-client-value', () => ({
  useMounted: () => true,
  useMediaQuery: () => env.phone,
}))
vi.mock('@/components/founders/desk/use-desk-webgl', () => ({
  hasWebGL2: () => env.webgl,
  useDeskWebGL: () => env.desk && !env.reduced,
  useDarkTheme: () => true,
}))
vi.mock('@/lib/fx/gradient-ascii', () => ({ mount: fx.mount }))

import { AsciiField } from '../ascii-field'

beforeEach(() => {
  Object.assign(env, { reduced: false, phone: true, webgl: true, desk: true })
  fx.mount.mockClear()
  fx.destroy.mockClear()
})
afterEach(() => vi.clearAllTimers())

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('AsciiField', () => {
  it('runs the live field on a phone, capped at 1.5x, and releases it on unmount', async () => {
    const { container, unmount } = render(<AsciiField variant="hero" />)
    await waitFor(() => expect(fx.mount).toHaveBeenCalledTimes(1))
    const [host, canvas, options] = fx.mount.mock.calls[0]
    expect(host).toBe(container.firstChild)
    expect(canvas.tagName).toBe('CANVAS')
    expect(options).toMatchObject({
      shape: 'rise',
      maxDpr: 1.5,
      reduced: false,
      lightMode: false,
    })
    await waitFor(() =>
      expect(container.firstChild).toHaveAttribute('data-field', 'live')
    )
    unmount()
    expect(fx.destroy).toHaveBeenCalledTimes(1)
  })

  it('keeps the poster when the field cannot get a context', async () => {
    fx.mount.mockReturnValueOnce({
      set: fx.set,
      destroy: fx.destroy,
      failed: true,
    })
    const { container } = render(<AsciiField variant="hero" />)
    await waitFor(() => expect(fx.mount).toHaveBeenCalledTimes(1))
    await settle()
    expect(container.firstChild).toHaveAttribute('data-field', 'poster')
  })

  it('shows only the poster under reduced motion, from the site toggle as well as the OS', async () => {
    env.reduced = true
    const { container } = render(<AsciiField variant="hero" />)
    await settle()
    expect(fx.mount).not.toHaveBeenCalled()
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.firstChild).toHaveAttribute('data-field', 'poster')
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('stops a running field when motion is paused', async () => {
    const { container, rerender } = render(<AsciiField variant="hero" />)
    await waitFor(() => expect(fx.mount).toHaveBeenCalledTimes(1))
    env.reduced = true
    rerender(<AsciiField variant="hero" />)
    expect(fx.destroy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('leaves the phone field off on a wide screen and without WebGL2', async () => {
    env.phone = false
    const { unmount } = render(<AsciiField variant="hero" />)
    await settle()
    unmount()
    env.phone = true
    env.webgl = false
    render(<AsciiField variant="hero" />)
    await settle()
    expect(fx.mount).not.toHaveBeenCalled()
  })

  it('mounts the accent behind the desk gate, once it is near the viewport', async () => {
    render(<AsciiField variant="accent" />)
    await waitFor(() => expect(fx.mount).toHaveBeenCalledTimes(1))
    expect(fx.mount.mock.calls[0][2]).toMatchObject({
      shape: 'eclipse',
      cellSize: 13,
    })
  })

  it('keeps the accent a poster where the desk gate says no', async () => {
    env.desk = false
    const { container } = render(<AsciiField variant="accent" />)
    await settle()
    expect(fx.mount).not.toHaveBeenCalled()
    expect(container.querySelector('canvas')).toBeNull()
  })
})

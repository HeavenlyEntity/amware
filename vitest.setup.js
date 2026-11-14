import '@testing-library/jest-dom/vitest'
import React from 'react'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

/* Radix Slider/Dialog measure with ResizeObserver; jsdom has none. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/* motion's useInView needs IntersectionObserver; jsdom has none. The stub
   reports every observed element as in view on the next tick. */
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback
    }
    observe(target) {
      setTimeout(
        () =>
          this.callback(
            [{ isIntersecting: true, target, intersectionRatio: 1 }],
            this
          ),
        0
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

/* Reduced-motion queries default to "no preference". */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement(
      'a',
      { href: typeof href === 'string' ? href : href?.pathname, ...props },
      children
    ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt = '', priority, fill, sizes, ...props }) =>
    React.createElement('img', {
      alt,
      src: typeof src === 'string' ? src : src?.src ?? '',
      ...props,
    }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/founders/equity',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

/* jsdom has no canvas: getContext already returns null, but logs "Not
   implemented" first. Components that draw (PixelCard) bail out on null,
   so return it quietly. */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'

/* The steps rail artifact's entrance. The site's useReducedMotion returns
   true on the server and on the first client render, and only then settles
   on the reader's setting; `firstRender`, when set, plays that first value
   here. A choice made only at mount would never hide the artifact for
   anyone, and the entrance would never play. */
const env = vi.hoisted(() => ({ reduced: false, firstRender: undefined }))
vi.mock('@/components/AccessibilityProvider', async () => {
  const { useEffect, useState } = await import('react')
  return {
    useReducedMotion: () => {
      const [value, setValue] = useState(() =>
        env.firstRender === undefined ? env.reduced : env.firstRender
      )
      useEffect(() => setValue(env.reduced), [])
      return value
    },
  }
})

import { StepsRail } from '@/components/blocks/how-it-works-10'

const steps = [
  {
    day: 'Day 1',
    title: 'Progress step',
    body: 'Progress body.',
    artifact: { kind: 'progress', title: 'Progress card', done: 'Delivered' },
  },
  {
    day: 'Day 2',
    title: 'Rows step',
    body: 'Rows body.',
    artifact: { kind: 'rows', title: 'Rows card', rows: [{ name: 'Row' }] },
  },
]

const artifacts = (container) =>
  Array.from(container.querySelectorAll('[data-rail-artifact]'))

/* Lets motion run a few frames. */
const frames = (ms) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })

/* The setup's IntersectionObserver reports everything in view at once. An
   artifact below the fold is never reported, which this one plays. */
const RealObserver = globalThis.IntersectionObserver
const belowTheFold = () => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

afterEach(() => {
  env.reduced = false
  env.firstRender = undefined
  globalThis.IntersectionObserver = RealObserver
})

describe('StepsRail artifact entrance', () => {
  it('waits hidden for the reader once the hook settles on "not reduced"', async () => {
    belowTheFold()
    env.firstRender = true
    env.reduced = false
    const { container } = render(<StepsRail steps={steps} />)
    await frames(200)
    const wrappers = artifacts(container)
    expect(wrappers).toHaveLength(2)
    wrappers.forEach((wrapper) => expect(wrapper.style.opacity).toBe('0'))
  })

  it('starts hidden when the hook says "not reduced" from the first render', () => {
    env.reduced = false
    const { container } = render(<StepsRail steps={steps} />)
    const wrappers = artifacts(container)
    expect(wrappers).toHaveLength(2)
    wrappers.forEach((wrapper) => expect(wrapper.style.opacity).toBe('0'))
  })

  it('never starts hidden when the hook says "reduced"', async () => {
    env.reduced = true
    const { container } = render(<StepsRail steps={steps} />)
    const wrappers = artifacts(container)
    expect(wrappers).toHaveLength(2)
    wrappers.forEach((wrapper) => expect(wrapper.style.opacity).not.toBe('0'))
    await frames(200)
    wrappers.forEach((wrapper) => expect(wrapper.style.opacity).not.toBe('0'))
  })
})

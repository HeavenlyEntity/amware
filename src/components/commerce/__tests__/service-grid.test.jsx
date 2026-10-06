import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'

import { ServiceGrid } from '@/components/commerce/catalog-cards'

/* Its own file because motion shares one IntersectionObserver per threshold
   across a document: an observer another test created through the setup's
   always-in-view stub would be reused here and hide the bug.

   A phone shows about a quarter of three stacked pricing cards at once. A
   browser only reports an element in view once the visible share reaches
   the observer's threshold, so this stub plays that rule for a grid of
   which 27% can ever be on screen. */
const VISIBLE_SHARE = 0.27

class TallGridObserver {
  constructor(callback, options = {}) {
    this.callback = callback
    const threshold = options.threshold ?? 0
    this.threshold = Array.isArray(threshold) ? threshold[0] : threshold
  }
  observe(target) {
    setTimeout(
      () =>
        this.callback(
          [
            {
              target,
              isIntersecting: this.threshold <= VISIBLE_SHARE,
              intersectionRatio: VISIBLE_SHARE,
            },
          ],
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

beforeAll(() => {
  // Finish the fade at once, so the test reads where it lands.
  MotionGlobalConfig.skipAnimations = true
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ServiceGrid', () => {
  it('fades in even when the grid is taller than the screen', async () => {
    vi.stubGlobal('IntersectionObserver', TallGridObserver)
    render(
      <ServiceGrid className="grid">
        <li>One Pager</li>
        <li>Company Site</li>
        <li>Custom work</li>
      </ServiceGrid>
    )
    const grid = screen.getByRole('list')
    await waitFor(() => expect(grid).toHaveStyle({ opacity: '1' }))
  })
})

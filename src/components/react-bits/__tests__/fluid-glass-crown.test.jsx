import { describe, expect, it } from 'vitest'
import { CROWN } from '../fluid-glass-crown'

/* The crown's distance field is uploaded as an R16F texture of w × h half
   floats; a short or padded string would make texImage2D throw and blank
   the lens. */

describe('CROWN', () => {
  it('holds exactly one half float per texel', () => {
    expect(atob(CROWN.data).length).toBe(CROWN.w * CROWN.h * 2)
  })

  it('covers a positive area with a positive thickness', () => {
    expect(CROWN.x).toBeGreaterThan(0)
    expect(CROWN.y).toBeGreaterThan(0)
    expect(CROWN.halfZ).toBeGreaterThan(0)
  })
})

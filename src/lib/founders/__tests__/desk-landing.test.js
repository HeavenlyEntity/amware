import { describe, expect, it } from 'vitest'

import { EXAMPLE_READ } from '../equity/engine.js'
import { computeAsk } from '../equity/negotiation.js'
import { deskLanding, ladderNoteFor, rungsFor } from '../desk-landing.js'
import { liveTools, soonTools } from '../tools.js'

const ask = computeAsk(EXAMPLE_READ)
const data = deskLanding()

describe('deskLanding is plain data read off the engine', () => {
  it('survives a JSON round trip, so nothing engine-shaped reaches a client island', () => {
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })

  it('starts the example at the worked example and its band', () => {
    expect(data.example.offer).toBe(EXAMPLE_READ.offer.pct)
    expect(data.example.range).toEqual({
      lo: EXAMPLE_READ.offer.range.lo,
      hi: EXAMPLE_READ.offer.range.hi,
      mid: EXAMPLE_READ.offer.range.mid,
    })
    expect(data.example.numberToSay).toBe(EXAMPLE_READ.offer.numberToSay.value)
  })

  it("names the band by the engine's class, not a marketing label", () => {
    expect(data.example.classLabel).toBe(
      EXAMPLE_READ.labels.class.toLowerCase()
    )
  })

  it('lists the live and soon tools from the registry', () => {
    expect(data.live.map((t) => t.id)).toEqual(liveTools().map((t) => t.id))
    expect(data.soon.map((t) => t.id)).toEqual(soonTools().map((t) => t.id))
    for (const tool of data.live) expect(tool.cta, tool.id).toBeTruthy()
  })
})

describe('the ladder rows', () => {
  it('follow the engine order, labels and figures', () => {
    expect(data.rungs.map((r) => r.id)).toEqual(ask.order)
    for (const rung of data.rungs) {
      expect(rung.label).toBe(ask[rung.id].label)
      expect(rung.cash).toBe(ask[rung.id].cash)
      expect(rung.equityPct).toBe(ask[rung.id].equityPct)
    }
  })

  it('compose the copy and toast text from those figures', () => {
    const target = data.rungs.find((r) => r.id === 'target')
    expect(target.copyText).toBe(
      `Aim for ${target.cashText} cash and ${target.equityText} equity`
    )
    expect(target.toastText).toBe(
      `Copied · Aim for ${target.cashText} and ${target.equityText}`
    )
    const floor = data.rungs.find((r) => r.id === 'floor')
    expect(floor.copyText).toMatch(/^Minimum the market supports: /)
    expect(floor.toastText).toMatch(/^Copied · Minimum /)
  })

  it('share each meter against the largest rung on its axis', () => {
    const shares = data.rungs.map((r) => r.share)
    expect(Math.max(...shares.map((s) => s.cash))).toBe(1)
    expect(Math.max(...shares.map((s) => s.equity))).toBe(1)
  })

  it('use the max, not the ceiling, when the equity inverts', () => {
    /* `equity_inverts`: the ceiling rung's equity can sit under the target's. */
    const inverted = {
      order: ['ceiling', 'target', 'floor'],
      ceiling: { label: 'Open with', cash: 120000, equityPct: 9 },
      target: { label: 'Aim for', cash: 100000, equityPct: 12 },
      floor: {
        label: 'Minimum the market supports',
        cash: 80000,
        equityPct: 6,
      },
    }
    const rows = rungsFor(inverted)
    expect(rows.find((r) => r.id === 'target').share.equity).toBe(1)
    expect(rows.find((r) => r.id === 'ceiling').share.equity).toBe(0.75)
  })

  it('mark only the target as dominant', () => {
    expect(data.rungs.filter((r) => r.dominant).map((r) => r.id)).toEqual([
      'target',
    ])
  })
})

describe('the ladder note', () => {
  it('only claims the offer needs no more salary while the engine agrees', () => {
    const note = ladderNoteFor(EXAMPLE_READ, ask)
    expect(ask.offer.position).toBe('above_ceiling')
    expect(note.emphasis).toMatch(/does not need more salary/)

    const below = ladderNoteFor(EXAMPLE_READ, {
      ...ask,
      offer: { ...ask.offer, position: 'below_floor' },
      sentences: { ...ask.sentences, offer: 'Their offer sits below.' },
    })
    expect(below.emphasis).toBe('Their offer sits below.')
    expect(below.lead).toMatch(/sits below the band/)
  })
})

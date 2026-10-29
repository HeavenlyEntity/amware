import { describe, expect, it } from 'vitest'
import { QUIZ } from '../../../content/site/courses'
import { scoreQuiz } from '../track-finder'

/* The design's scores, written out independently of QUIZ so a change to
   the content shows up here as a failure. [dev, change] per option. */
const SCORES = [
  [
    [3, 0],
    [2, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [3, 0],
    [2, 0],
    [0, 2],
    [0, 3],
  ],
  [
    [2, 0],
    [2, 0],
    [0, 3],
    [0, 2],
  ],
]
const PACE_BY_ANSWER = ['intensive', 'standard', 'relaxed']

function expected(a, b, c) {
  const dev = SCORES[0][a][0] + SCORES[1][b][0] + SCORES[2][c][0]
  const change = SCORES[0][a][1] + SCORES[1][b][1] + SCORES[2][c][1]
  const gap = Math.abs(dev - change)
  return {
    key: dev >= change ? 'dev' : 'change',
    label: gap >= 4 ? 'Strong match' : gap >= 2 ? 'Good match' : 'Close call',
  }
}

describe('track finder', () => {
  it('has four questions, the last one setting the pace', () => {
    expect(QUIZ).toHaveLength(4)
    expect(QUIZ[3].opts.map((o) => o.pace)).toEqual(PACE_BY_ANSWER)
  })

  it('gives the expected track and match label on every answer path', () => {
    let paths = 0
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++)
        for (let c = 0; c < 4; c++)
          for (let d = 0; d < 3; d++) {
            const result = scoreQuiz([a, b, c, d])
            const want = expected(a, b, c)
            expect(result.key, `path ${a}${b}${c}${d}`).toBe(want.key)
            expect(result.matchLabel, `path ${a}${b}${c}${d}`).toBe(want.label)
            expect(result.close).toBe(want.label === 'Close call')
            expect(result.pace).toBe(PACE_BY_ANSWER[d])
            paths++
          }
    expect(paths).toBe(192)
  })

  it('reads a working developer as a strong engineer match', () => {
    const result = scoreQuiz([0, 0, 0, 1])
    expect(result.key).toBe('dev')
    expect(result.matchLabel).toBe('Strong match')
    expect(result.track.name).toBe('Security-First Engineer')
    expect(result.devPct).toBe(100)
    expect(result.why).toEqual([
      'You already ship code for a living.',
      'You meet the prerequisites: JS or TS, React and SQL.',
      'You want to harden the code you already write.',
      'You picked the Standard pace: about 8 to 9 months, about 4 weeks per module.',
    ])
  })

  it('reads a career changer as a strong Accelerator match', () => {
    const result = scoreQuiz([3, 3, 2, 2])
    expect(result.key).toBe('change')
    expect(result.track.name).toBe('Secure Builder Accelerator')
    expect(result.matchLabel).toBe('Strong match')
    expect(result.pace).toBe('relaxed')
  })

  it('calls a narrow gap a close call, and a tie goes to the engineer', () => {
    /* dev 2 + 0 + 2 = 4, change 1 + 2 + 0 = 3 */
    const narrow = scoreQuiz([1, 2, 0, 0])
    expect(narrow.score).toEqual({ dev: 4, change: 3 })
    expect(narrow.matchLabel).toBe('Close call')
    expect(narrow.close).toBe(true)
    /* dev 2 + 0 + 2 = 4, change 1 + 3 + 0 = 4 */
    const tie = scoreQuiz([1, 3, 0, 0])
    expect(tie.score.dev).toBe(tie.score.change)
    expect(tie.key).toBe('dev')
  })

  it('only gives reasons that back the winning track', () => {
    const result = scoreQuiz([1, 2, 2, 0])
    expect(result.key).toBe('change')
    expect(result.why).toEqual([
      'You build real projects on your own time.',
      'You can build parts of an app; the Accelerator paces the curriculum for that.',
      'You want coaching through your first role, which comes with the Accelerator.',
      'You picked the Intensive pace: about 4 to 5 months, about 2 weeks per module.',
    ])
  })
})

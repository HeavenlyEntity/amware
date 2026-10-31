import { describe, expect, it } from 'vitest'

import { contractVerdict } from '../contract-score'

const marks = (...flags) => [...flags, ...Array(7 - flags.length).fill(null)]

describe('contractVerdict', () => {
  it('asks for clause 1 while nothing is marked', () => {
    expect(contractVerdict(marks())).toEqual({
      title: 'Start with clause 1',
      copy: 'Mark each clause pass or fail. Nothing you mark here is saved or sent.',
      tone: 'idle',
      fails: 0,
      checked: 0,
    })
  })

  it('says renegotiate at two fails, however few are checked', () => {
    expect(contractVerdict(marks('fail', 'fail'))).toEqual({
      title: 'Renegotiate before you sign',
      copy: 'Two or more fails is the line. Send the shop the green-flag wording for each one.',
      tone: 'bad',
      fails: 2,
      checked: 2,
    })
  })

  it('still says renegotiate at seven of seven with more than two fails', () => {
    const verdict = contractVerdict(
      marks('fail', 'fail', 'fail', 'pass', 'pass', 'pass', 'pass')
    )
    expect(verdict.title).toBe('Renegotiate before you sign')
    expect(verdict.fails).toBe(3)
    expect(verdict.checked).toBe(7)
  })

  it('keeps going on one fail part way through', () => {
    expect(contractVerdict(marks('pass', 'fail'))).toEqual({
      title: 'One clause to fix',
      copy: 'Keep going. One fail is worth raising before you sign.',
      tone: 'idle',
      fails: 1,
      checked: 2,
    })
  })

  it('names the one fix at seven of seven', () => {
    expect(
      contractVerdict(
        marks('pass', 'pass', 'pass', 'fail', 'pass', 'pass', 'pass')
      )
    ).toEqual({
      title: 'One clause to fix',
      copy: 'Raise it with the shop before you sign. The rest reads well.',
      tone: 'idle',
      fails: 1,
      checked: 7,
    })
  })

  it('counts what is left while the contract is clean so far', () => {
    expect(contractVerdict(marks('pass', 'pass'))).toEqual({
      title: 'Clean so far',
      copy: '5 left to check.',
      tone: 'ok',
      fails: 0,
      checked: 2,
    })
  })

  it('passes a contract clean at seven of seven', () => {
    expect(contractVerdict(Array(7).fill('pass'))).toEqual({
      title: 'All seven read well',
      copy: 'This contract passes all seven checks.',
      tone: 'ok',
      fails: 0,
      checked: 7,
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checklistLink,
  checklistToken,
  readChecklistToken,
} from '../checklist-link'

beforeEach(() => vi.stubEnv('PAYLOAD_SECRET', 'test-secret'))
afterEach(() => vi.unstubAllEnvs())

describe('checklist link', () => {
  it('round-trips a submission id', () => {
    expect(readChecklistToken(checklistToken(41))).toBe('41')
  })

  it('refuses a forged, edited or foreign token', () => {
    const token = checklistToken(41)
    expect(readChecklistToken(`42.${token.split('.')[1]}`)).toBeNull()
    expect(readChecklistToken(`${token}x`)).toBeNull()
    expect(readChecklistToken('41')).toBeNull()
    expect(readChecklistToken(undefined)).toBeNull()
    vi.stubEnv('PAYLOAD_SECRET', 'another-secret')
    expect(readChecklistToken(token)).toBeNull()
  })

  it('builds the click-through URL on the site', () => {
    expect(checklistLink('https://www.amware.dev/', 7)).toMatch(
      /^https:\/\/www\.amware\.dev\/get\/checklist\/7\.[A-Za-z0-9_-]{32}$/
    )
  })
})

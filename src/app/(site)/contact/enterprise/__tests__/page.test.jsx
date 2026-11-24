import { describe, expect, it, vi } from 'vitest'

vi.mock('../../ContactForm', () => ({ default: () => null }))

import EnterpriseContactPage, { metadata } from '../page'

const subjectFor = async (query) =>
  (await EnterpriseContactPage({ searchParams: Promise.resolve(query) })).props
    .initialSubject

describe('Enterprise contact page', () => {
  it('keeps a NetSuite kit subject as it was', async () => {
    expect(await subjectFor({ kit: 'next-netsuite', tier: 'team' })).toBe(
      'WareKit Enterprise · Next.js + NetSuite · Team'
    )
  })

  it('names WareKit Standard and the tier for a Standard kit', async () => {
    expect(await subjectFor({ kit: 'standard', tier: 'team' })).toBe(
      'WareKit Enterprise · WareKit Standard · Team'
    )
  })

  it('does not mention NetSuite in the description', () => {
    expect(metadata.description ?? metadata.openGraph?.description).not.toMatch(
      /netsuite/i
    )
  })
})

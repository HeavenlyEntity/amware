import { describe, expect, it, vi } from 'vitest'

import { isConsultingEnquiry, RED_FLAGS_SUBJECT } from '../../contact-intents'
import { withLeadLock } from '../lock'

const fakeDb = ({ fail = false } = {}) => {
  const conn = { execute: vi.fn().mockResolvedValue({}) }
  return {
    conn,
    db: {
      beginTransaction: vi.fn().mockResolvedValue('tx1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      sessions: { tx1: { db: conn } },
    },
    fail,
  }
}

describe('withLeadLock', () => {
  it('runs the work unlocked where there are no transactions', async () => {
    const work = vi.fn().mockResolvedValue('done')
    expect(await withLeadLock({}, 'a@b.co', work)).toBe('done')
    expect(work).toHaveBeenCalledWith({})
  })

  it('takes the lock, hands the work its transaction, then commits', async () => {
    const { db, conn } = fakeDb()
    const work = vi.fn().mockResolvedValue('done')
    expect(await withLeadLock({ db }, 'a@b.co', work)).toBe('done')
    expect(conn.execute).toHaveBeenCalledTimes(2)
    expect(work).toHaveBeenCalledWith({ req: { transactionID: 'tx1' } })
    expect(db.commitTransaction).toHaveBeenCalledWith('tx1')
    expect(db.rollbackTransaction).not.toHaveBeenCalled()
  })

  it('rolls back and rethrows when the work fails', async () => {
    const { db } = fakeDb()
    const work = vi.fn().mockRejectedValue(new Error('unique violation'))
    await expect(withLeadLock({ db }, 'a@b.co', work)).rejects.toThrow(
      'unique violation'
    )
    expect(db.rollbackTransaction).toHaveBeenCalledWith('tx1')
    expect(db.commitTransaction).not.toHaveBeenCalled()
  })
})

describe('isConsultingEnquiry', () => {
  it('keeps contact-form enquiries and drops product and course sign-ups', () => {
    expect(isConsultingEnquiry('Our app keeps crashing')).toBe(true)
    expect(isConsultingEnquiry(undefined)).toBe(true)
    expect(isConsultingEnquiry('WareKit waitlist · Pro · now')).toBe(false)
    expect(isConsultingEnquiry('WareKit Enterprise · React · Team')).toBe(false)
    expect(isConsultingEnquiry('Courses waitlist · CTO · weekly')).toBe(false)
    expect(isConsultingEnquiry(RED_FLAGS_SUBJECT)).toBe(false)
  })
})

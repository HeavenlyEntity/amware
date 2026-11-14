import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

import { AiSearchChecklist } from '../ai-search-checklist'
import { AI_SEARCH_CHECKLIST } from '@/content/site/ai-search-checklist'

/* The Build & support freebie as a visitor meets it: the checklist and its
   five steps, earned by booking the Build & support intro call. There is
   no way to get it for an email alone. */

const booking = {
  link: 'amware/build-intro-call',
  namespace: 'build-intro-call',
}

describe('AiSearchChecklist', () => {
  it('offers the checklist and its five steps', () => {
    render(<AiSearchChecklist booking={booking} />)
    expect(
      screen.getByRole('heading', { name: AI_SEARCH_CHECKLIST.title })
    ).toBeInTheDocument()
    const steps = screen.getByRole('list', { name: 'The five steps' })
    expect(steps.querySelectorAll('li')).toHaveLength(5)
  })

  it('earns it by booking the Build & support call, not by email', () => {
    render(<AiSearchChecklist booking={booking} />)
    expect(screen.queryByLabelText('Email address')).toBeNull()
    expect(screen.queryByRole('link', { name: /pdf|download/i })).toBeNull()
    const cta = screen.getByRole('button', { name: /book a free intro call/i })
    expect(cta).toHaveAttribute('data-cal-link', 'amware/build-intro-call')
    expect(cta).toHaveAttribute(
      'data-cal-namespace',
      'build-intro-call-checklist'
    )
  })

  it('falls back to the contact form without a Cal.com link', () => {
    render(<AiSearchChecklist booking={null} />)
    expect(
      screen.getByRole('link', { name: /book a free intro call/i })
    ).toHaveAttribute('href', '/contact')
  })
})

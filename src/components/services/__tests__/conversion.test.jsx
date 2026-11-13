import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

import { FitCheck, PainPoints, RiskReversal, ServicesFaq } from '../conversion'
import { SERVICES_PAGE, faqItems } from '@/content/site/services-page'

/* The conversion sections as a buyer meets them: their problems in their
   own words with the call right after, a risk reversal built on two free
   calls and the Diagnostic's refundable deposit, a fit check, and answers
   that open without JavaScript. */

const booking = {
  link: 'amware/intro-call',
  namespace: 'intro-call',
}

describe('PainPoints', () => {
  it('lists every pain under its heading, then offers the call', () => {
    render(<PainPoints booking={booking} />)
    const section = screen.getByRole('region', {
      name: SERVICES_PAGE.pain.title,
    })
    const items = within(section).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(
      SERVICES_PAGE.pain.items.map((item) => `×${item}`)
    )
    expect(
      within(section).getByRole('button', { name: /book a free intro call/i })
    ).toHaveAttribute('data-cal-namespace', 'intro-call-services')
  })

  it('hides the decorative marks and the // prefix from assistive tech', () => {
    const { container } = render(<PainPoints booking={null} />)
    for (const mark of container.querySelectorAll('.svc-mark')) {
      expect(mark).toHaveAttribute('aria-hidden', 'true')
    }
    expect(screen.getByText('//', { exact: false })).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })
})

describe('RiskReversal', () => {
  it('reverses the risk with two free calls and a refundable Diagnostic, and no figure', () => {
    const { container } = render(<RiskReversal />)
    const region = screen.getByRole('region', {
      name: 'Two free calls before you pay a thing.',
    })
    expect(region).toHaveTextContent(/free 15-minute intro call/i)
    expect(region).toHaveTextContent(/free 45-minute strategy call/i)
    expect(region).toHaveTextContent(/fully refunded if I can’t help/i)
    expect(container).not.toHaveTextContent('$')
    expect(container).not.toHaveTextContent(/60/)
  })
})

describe('FitCheck', () => {
  it('names who it is for and who it is not', () => {
    render(<FitCheck />)
    expect(
      screen.getByRole('heading', { level: 3, name: /^For you if$/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /^Not for you if$/ })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(
      SERVICES_PAGE.fit.forYou.length + SERVICES_PAGE.fit.notForYou.length
    )
  })
})

describe('ServicesFaq', () => {
  it('answers in native details, closed until opened', () => {
    const { container } = render(<ServicesFaq />)
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(SERVICES_PAGE.faq.items.length)
    for (const item of details) expect(item.open).toBe(false)
  })

  it('answers the worth-it question with the free calls, not a call refund', () => {
    render(<ServicesFaq />)
    expect(screen.getByText(/isn’t worth it/i)).toBeInTheDocument()
    expect(screen.getByText(/Both calls are free/)).toBeInTheDocument()
    expect(faqItems()).toHaveLength(SERVICES_PAGE.faq.items.length)
  })
})

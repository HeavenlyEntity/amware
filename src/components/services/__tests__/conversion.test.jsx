import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@calcom/embed-react', () => ({
  getCalApi: vi.fn(async () => vi.fn()),
}))

import { FitCheck, PainPoints, RiskReversal, ServicesFaq } from '../conversion'
import { SERVICES_PAGE, faqItems } from '@/content/site/services-page'

/* The conversion sections as a buyer meets them: their problems in their
   own words with the call right after, a risk reversal built on the
   deposit's real terms, a fit check, and answers that open without
   JavaScript. */

const booking = {
  link: 'amware/on-demand-outcome',
  namespace: 'on-demand-outcome',
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
      within(section).getByRole('button', { name: /book a strategy call/i })
    ).toHaveAttribute('data-cal-namespace', 'on-demand-outcome-services')
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
  it('reverses the risk with the deposit terms, and no figure', () => {
    const { container } = render(<RiskReversal />)
    expect(
      screen.getByRole('region', { name: SERVICES_PAGE.promise.title })
    ).toHaveTextContent(/full deposit back/i)
    expect(container).not.toHaveTextContent('$')
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
    const { container } = render(<ServicesFaq hasDeposit />)
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(SERVICES_PAGE.faq.items.length)
    for (const item of details) expect(item.open).toBe(false)
  })

  it('drops the refund answer without a deposit', () => {
    render(<ServicesFaq hasDeposit={false} />)
    expect(screen.queryByText(/isn’t worth it/i)).toBeNull()
    expect(faqItems(false).some((item) => item.withDeposit)).toBe(false)
    expect(faqItems(true)).toHaveLength(SERVICES_PAGE.faq.items.length)
  })
})

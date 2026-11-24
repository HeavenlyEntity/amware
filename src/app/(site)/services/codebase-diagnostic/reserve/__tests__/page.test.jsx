import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/* The reserve page is the link sent by hand after two calls. It offers the
   deposit only for a published Diagnostic row that has a plan for this Whop
   environment; every other case is a contact fallback, never an error. */

const payload = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({
  getPayloadClient: vi.fn(async () => payload),
}))
vi.mock('@/components/commerce/DepositCheckout', () => ({
  DepositCheckout: ({
    planId,
    serviceName,
    serviceSlug,
    amount,
    bookingUrl,
    children,
  }) => (
    <button
      data-testid="deposit"
      data-plan-id={planId}
      data-service-name={serviceName}
      data-service-slug={serviceSlug}
      data-amount={amount}
      data-booking-url={bookingUrl ?? ''}
    >
      {children}
    </button>
  ),
}))

import DiagnosticReservePage, { metadata } from '../page'

const row = (over) => ({
  id: 1,
  slug: 'codebase-diagnostic',
  name: 'Codebase Diagnostic',
  status: 'published',
  whopPlanId: 'plan_live',
  whopSandboxPlanId: 'plan_sandbox',
  depositAmount: 500,
  bookingUrl: 'https://cal.com/amware/strategy',
  ...over,
})

afterEach(() => {
  vi.restoreAllMocks()
  payload.find.mockReset()
})

describe('DiagnosticReservePage', () => {
  it('is kept out of search', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it('offers the deposit for a published row with a plan', async () => {
    payload.find.mockResolvedValueOnce({ docs: [row()] })
    const { container } = render(await DiagnosticReservePage())
    const deposit = screen.getByTestId('deposit')
    expect(deposit).toHaveAttribute('data-plan-id')
    expect(deposit.getAttribute('data-plan-id')).toBeTruthy()
    expect(deposit).toHaveAttribute('data-service-slug', 'codebase-diagnostic')
    expect(deposit).toHaveAttribute('data-service-name', 'Codebase Diagnostic')
    expect(deposit).toHaveTextContent('Reserve your Diagnostic')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /reserve your diagnostic/i,
      })
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('$')
  })

  it('falls back to contact when the row is missing', async () => {
    payload.find.mockResolvedValueOnce({ docs: [] })
    render(await DiagnosticReservePage())
    expect(screen.queryByTestId('deposit')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /ask me for your link/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('falls back to contact when the row has no plan for this environment', async () => {
    payload.find.mockResolvedValueOnce({
      docs: [row({ whopPlanId: null, whopSandboxPlanId: null })],
    })
    render(await DiagnosticReservePage())
    expect(screen.queryByTestId('deposit')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  it('falls back to contact, and does not throw, when the read fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    payload.find.mockRejectedValueOnce(new Error('db down'))
    render(await DiagnosticReservePage())
    expect(screen.queryByTestId('deposit')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute(
      'href',
      '/contact'
    )
    expect(error).toHaveBeenCalledWith(
      'Diagnostic reserve lookup failed',
      expect.any(Error)
    )
  })

  it('asks only for a published row with the Diagnostic slug', async () => {
    payload.find.mockResolvedValueOnce({ docs: [] })
    await DiagnosticReservePage()
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'services',
        where: {
          and: [
            { slug: { equals: 'codebase-diagnostic' } },
            { status: { equals: 'published' } },
          ],
        },
        depth: 0,
        limit: 1,
      })
    )
  })
})

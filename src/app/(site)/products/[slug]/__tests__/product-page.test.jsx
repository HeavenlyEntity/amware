import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/analytics/TrackView', () => ({ TrackView: () => null }))
vi.mock('@/components/site/RichText', () => ({ RichText: () => null }))
vi.mock('@/components/commerce/StackChips', () => ({
  StackLogos: () => null,
}))
vi.mock('@/components/commerce/BuyButton', () => ({
  BuyButton: () => <button type="button">Buy with Whop</button>,
}))
vi.mock('@/components/commerce/CreemBuyButton', () => ({
  CreemBuyButton: ({ children }) => <button type="button">{children}</button>,
}))
vi.mock('@/components/commerce/ClaimFreeKit', () => ({
  ClaimFreeKit: () => <button type="button">Claim</button>,
}))

import ProductPage from '../page'

const kit = {
  name: 'WareKit Next NetSuite (Pro)',
  slug: 'warekit-next-netsuite-pro',
  type: 'boilerplate',
  stack: 'next-netsuite',
  tier: 'pro',
  price: 499,
  seats: 1,
  status: 'published',
  creemProductId: 'prod_1',
}
const team = {
  ...kit,
  name: 'WareKit Next NetSuite (Team)',
  slug: 'warekit-next-netsuite-team',
  tier: 'team',
  price: 999,
  seats: 5,
  netsuiteAccounts: 3,
}
const lite = {
  ...kit,
  name: 'WareKit Next NetSuite (Lite)',
  slug: 'warekit-next-netsuite-lite',
  tier: 'lite',
  price: 0,
  creemProductId: null,
  netsuiteAccounts: 1,
}

async function show(doc) {
  payload.find.mockResolvedValue({ docs: [doc] })
  render(await ProductPage({ params: Promise.resolve({ slug: doc.slug }) }))
}

const REFUND =
  "Full refund within 14 days if you haven't accepted the GitHub invite."

beforeEach(() => {
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})

describe('/products/[slug]', () => {
  it('names developers and NetSuite accounts from the row', async () => {
    await show(team)
    expect(screen.getByText('developers')).toBeInTheDocument()
    expect(screen.getByText('5 developers')).toBeInTheDocument()
    expect(screen.getByText('netsuite accounts')).toBeInTheDocument()
    expect(screen.getByText('3 NetSuite accounts')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Yours or a client's. Sandboxes and Release Preview don't count."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('license')).not.toBeInTheDocument()
  })

  it('uses singular words, and 1 account when the row has none', async () => {
    await show(kit)
    expect(screen.getByText('1 developer')).toBeInTheDocument()
    expect(screen.getByText('1 NetSuite account')).toBeInTheDocument()
  })

  it('gives a Lite kit no accounts row', async () => {
    await show(lite)
    expect(screen.getByText('1 developer')).toBeInTheDocument()
    expect(screen.queryByText(/NetSuite account/i)).not.toBeInTheDocument()
  })

  it('shows the refund line beside a paid kit buy button', async () => {
    await show(kit)
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeInTheDocument()
    expect(screen.getByText(REFUND)).toBeInTheDocument()
  })

  it('shows no refund line on Lite', async () => {
    await show(lite)
    expect(screen.queryByText(REFUND)).not.toBeInTheDocument()
  })

  it('shows no refund line on a digital product', async () => {
    await show({
      ...kit,
      type: 'digital',
      tier: null,
      stack: null,
      slug: 'a-guide',
      price: 29,
    })
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeInTheDocument()
    expect(screen.queryByText(REFUND)).not.toBeInTheDocument()
  })

  it('shows no refund line on a kit that is not on sale', async () => {
    await show({ ...kit, creemProductId: null })
    expect(screen.queryByText(REFUND)).not.toBeInTheDocument()
  })

  it('shows Already on Pro on Team, linking to the upgrade', async () => {
    await show(team)
    expect(
      screen.getByRole('link', {
        name: 'Already on Pro? Pay only the difference.',
      })
    ).toHaveAttribute('href', '/access/resend?intent=upgrade')
  })

  it('keeps Already on Pro off Pro', async () => {
    await show(kit)
    expect(screen.queryByText(/Already on Pro/)).not.toBeInTheDocument()
  })
})

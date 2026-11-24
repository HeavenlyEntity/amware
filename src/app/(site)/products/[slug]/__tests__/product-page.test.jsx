import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const payload = vi.hoisted(() => ({ client: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: payload.client }))
vi.mock('@/components/analytics/TrackView', () => ({ TrackView: () => null }))
vi.mock('@/components/site/RichText', () => ({ RichText: () => null }))
vi.mock('@/components/commerce/StackChips', () => ({
  StackLogos: () => null,
  StackPills: () => null,
}))
/* Reduced motion is a switch here, so the still versions can be asserted. */
const motionPref = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => motionPref.reduced,
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
  motionPref.reduced = false
  payload.find.mockReset()
  payload.client.mockReset()
  payload.client.mockResolvedValue({ find: payload.find })
})

describe('/products/[slug]', () => {
  it('names developers and NetSuite accounts from the row', async () => {
    await show(team)
    expect(screen.getByText('Developers')).toBeInTheDocument()
    expect(screen.getByText('5 developers')).toBeInTheDocument()
    expect(screen.getByText('NetSuite accounts')).toBeInTheDocument()
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
    expect(screen.queryByText('NetSuite accounts')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/^\d+ NetSuite accounts?$/)
    ).not.toBeInTheDocument()
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

  it('styles that link with utilities, since this page loads no board css', async () => {
    await show(team)
    const link = screen.getByRole('link', { name: /Already on Pro/ })
    for (const cls of [
      'inline-flex',
      'min-h-11',
      'items-center',
      'underline',
    ]) {
      expect(link).toHaveClass(cls)
    }
  })

  it('keeps Already on Pro off Pro', async () => {
    await show(kit)
    expect(screen.queryByText(/Already on Pro/)).not.toBeInTheDocument()
  })
})

const features = [
  { feature: 'Everything in the Lite edition' },
  { feature: 'Session storage backed by a NetSuite custom record' },
]
const SECTIONS = [
  /how it fits together/i,
  /why it’s pro/i,
  /what’s in the repo/i,
]
const eyebrow = (label) =>
  screen.queryByText(
    (_, el) => el?.tagName === 'P' && label.test(el.textContent)
  )

describe('/products/[slug] kit story', () => {
  it('draws all four sections for a Pro kit, numbered in order', async () => {
    await show({ ...kit, features })
    expect(eyebrow(/SEC\.01 \/ how it fits together/i)).toBeInTheDocument()
    expect(eyebrow(/SEC\.02 \/ why it’s pro/i)).toBeInTheDocument()
    expect(eyebrow(/SEC\.03 \/ what’s in the repo/i)).toBeInTheDocument()
    expect(eyebrow(/SEC\.04 \/ what’s included/i)).toBeInTheDocument()
    expect(
      screen.getByText(/15 concurrent requests on Service Tier 1/)
    ).toBeInTheDocument()
    expect(screen.getByText('netsuite-sessions/')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('keeps the session layers off Lite, and renumbers', async () => {
    await show({ ...lite, features })
    expect(eyebrow(/why it’s pro/i)).toBeNull()
    expect(eyebrow(/SEC\.02 \/ what’s in the repo/i)).toBeInTheDocument()
    expect(screen.queryByText('netsuite-sessions/')).toBeNull()
  })

  it('renders none of the sections for a kit with no story', async () => {
    await show({
      ...kit,
      features,
      stack: 'react-netsuite',
      slug: 'warekit-react-netsuite-pro',
    })
    for (const label of SECTIONS) expect(eyebrow(label)).toBeNull()
    // The row's own features still show, under the plain eyebrow.
    expect(eyebrow(/^\/\/ what’s included$/i)).toBeInTheDocument()
    expect(
      screen.getByText('Everything in the Lite edition')
    ).toBeInTheDocument()
  })

  it('renders none of them on a digital product', async () => {
    await show({
      ...kit,
      features,
      type: 'digital',
      tier: null,
      stack: null,
      slug: 'a-guide',
      price: 29,
    })
    for (const label of SECTIONS) expect(eyebrow(label)).toBeNull()
    expect(screen.queryByRole('link', { name: /compare lite/i })).toBeNull()
  })

  it('highlights only phrases the tagline really has, and changes no words', async () => {
    const tagline =
      'The hybrid kit with sessions in NetSuite instead of JWT: one less service to provision.'
    await show({ ...kit, tagline })
    const marks = [...document.querySelectorAll('.amw-kit-hl')].map(
      (el) => el.textContent
    )
    expect(marks).toEqual(['sessions in NetSuite', 'one less service'])
    expect(screen.getByText(/instead of JWT/).textContent).toBe(tagline)
  })

  it('shows the edition chip and the catalog line from the row', async () => {
    await show(team)
    expect(screen.getByText('Team edition')).toBeInTheDocument()
    expect(
      screen.getByText(/amware catalog --show next-netsuite-team/)
    ).toBeInTheDocument()
  })

  it('prices with cents', async () => {
    await show(kit)
    expect(screen.getByText('$499.00')).toBeInTheDocument()
  })

  it('links Compare Lite, Pro and Team on a kit', async () => {
    await show(kit)
    expect(
      screen.getByRole('link', { name: /compare lite, pro and team/i })
    ).toHaveAttribute('href', '/pricing')
  })

  it('does not repeat the roadmap paragraph the description already has', async () => {
    const roadmap =
      'Session storage is the first Pro feature to land. Licensing, role mapping, the data layer, the schema generator and observability are roadmap, and the repository says so rather than implying otherwise.'
    const description = {
      root: { children: [{ children: [{ text: roadmap }] }] },
    }
    await show({ ...kit, features, description })
    // RichText is mocked to nothing here, so a hit can only be the story's.
    expect(screen.queryByText(roadmap)).toBeNull()
  })

  it('adds the roadmap paragraph where the description lacks it', async () => {
    await show({ ...team, features })
    expect(
      screen.getByText(/Session storage is the first Pro feature to land/)
    ).toBeInTheDocument()
  })

  it('hooks the checks and the typed commands to being seen', async () => {
    await show({ ...kit, features })
    expect(document.querySelectorAll('[data-in]').length).toBeGreaterThan(0)
  })

  it('leaves the draw-in hooks off entirely under reduced motion', async () => {
    motionPref.reduced = true
    await show({ ...kit, features })
    expect(document.querySelectorAll('[data-in]')).toHaveLength(0)
    // The content itself is all there.
    expect(screen.getByText('pnpm install')).toBeInTheDocument()
    expect(
      screen.getByText('Everything in the Lite edition')
    ).toBeInTheDocument()
  })
})

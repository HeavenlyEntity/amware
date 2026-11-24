import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/* The six "what ships" pictures. Reduced motion is the site's hook, mocked
   here so each test can pick it. */

const env = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))

import { SHIP_VISUALS } from '@/components/warekit/standard/ship-visuals'
import { PRESALE } from '@/content/site/standard-presale'

const REPLY = [
  'Subject: Welcome aboard.',
  'Your workspace is ready.',
  'Invite your team to get started.',
]
const ids = PRESALE.ships.items.map((item) => item.id)
const renderVisual = (id) => {
  const Visual = SHIP_VISUALS[id]
  return render(<Visual />)
}

describe('SHIP_VISUALS', () => {
  it('has a picture for each of the six parts', () => {
    expect(ids).toEqual([
      'accounts',
      'ai',
      'payments',
      'dev-tool',
      'interface',
      'stack',
    ])
    expect(Object.keys(SHIP_VISUALS).sort()).toEqual([...ids].sort())
    env.reduced = false
    for (const id of ids) {
      const { container, unmount } = renderVisual(id)
      expect(container.firstElementChild, id).not.toBeNull()
      unmount()
    }
  })

  it('streams the reply one word at a time', () => {
    env.reduced = false
    const { container } = renderVisual('ai')
    const words = container.querySelectorAll('.st-chat-w')
    expect(words).toHaveLength(13)
    /* jsdom normalises `3.00s` to `3s`, so the seconds are compared. */
    const delays = [...words].map((word) => word.style.animationDelay)
    expect(delays.every((delay) => /^[\d.]+s$/.test(delay))).toBe(true)
    const seconds = delays.map((delay) => parseFloat(delay))
    expect(seconds[0]).toBe(3)
    expect(seconds[12]).toBe(5.4)
    seconds.forEach((value, n) =>
      expect(value).toBeCloseTo(3 + (n * 2.4) / 12, 2)
    )
    expect(container).toHaveTextContent('Draft a welcome email for new teams.')
    for (const line of REPLY) expect(container).toHaveTextContent(line)
  })

  it('shows the whole reply at once under reduced motion', () => {
    env.reduced = true
    const { container } = renderVisual('ai')
    const words = container.querySelectorAll('.st-chat-w')
    expect(words).toHaveLength(13)
    for (const word of words) expect(word.style.animationDelay).toBe('')
    expect(container.querySelector('.st-chat')).toHaveAttribute('data-still')
    expect(container.querySelector('.st-chat-typing')).toBeNull()
    for (const line of REPLY) expect(container).toHaveTextContent(line)
  })

  it('carries no names and no money', () => {
    for (const reduced of [false, true]) {
      env.reduced = reduced
      for (const id of ids) {
        const { container, unmount } = renderVisual(id)
        const text = container.textContent
        const titles = [...container.querySelectorAll('[title]')]
          .map((node) => node.getAttribute('title'))
          .join(' ')
        for (const said of [text, titles]) {
          expect(said, id).not.toMatch(/\$\s?\d/)
          expect(said, id).not.toMatch(/maya|alex|sarah|acme/i)
          expect(said, id).not.toMatch(/netsuite/i)
        }
        unmount()
      }
    }
  })

  it('is hidden from assistive tech', () => {
    env.reduced = false
    for (const id of ids) {
      const { container, unmount } = renderVisual(id)
      const root = container.firstElementChild
      expect(root, id).toHaveAttribute('aria-hidden', 'true')
      expect(
        root.querySelector('a, button, input, select, textarea, [tabindex]'),
        id
      ).toBeNull()
      unmount()
    }
  })

  it('draws the stack from the brand icons, each with a title', () => {
    env.reduced = false
    const { container } = renderVisual('stack')
    const titles = [...container.querySelectorAll('[title]')].map((node) =>
      node.getAttribute('title')
    )
    expect(titles).toEqual([
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'pnpm',
      'Turborepo',
    ])
    expect(container.querySelectorAll('svg path')).toHaveLength(5)
  })

  it('shows the env check, the plan events and the roles', () => {
    env.reduced = false
    const devTool = renderVisual('dev-tool')
    expect(devTool.container).toHaveTextContent('DATABASE_URL')
    expect(devTool.container).toHaveTextContent('BILLING_WEBHOOK_SECRET')
    expect(devTool.container).toHaveTextContent('AI_API_KEY')
    expect(devTool.container).toHaveTextContent('missing')
    devTool.unmount()

    const payments = renderVisual('payments')
    expect(payments.container).toHaveTextContent('Pro · monthly')
    expect(payments.container).toHaveTextContent('active')
    expect(payments.container).toHaveTextContent('checkout.completed')
    expect(
      payments.container.textContent.match(/subscription\.renewed/g)
    ).toHaveLength(2)
    expect(payments.container).toHaveTextContent('replayed · ignored')
    payments.unmount()

    const accounts = renderVisual('accounts')
    for (const role of ['Owner', 'Admin', 'Member', 'Invite sent'])
      expect(accounts.container).toHaveTextContent(role)
    accounts.unmount()

    const ui = renderVisual('interface')
    expect(ui.container.textContent.trim()).toBe('')
  })
})

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* The six guard cards. Reduced motion is the site's hook, mocked here so
   each test can pick it. */

const env = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => env.reduced,
}))

import { GuardCards } from '@/components/warekit/standard/guard-cards'
import { PRESALE } from '@/content/site/standard-presale'

const DIR = '/images/warekit/standard/guards/'
const ARTS = [
  'api-gateway',
  'firewall',
  'billing',
  'encryption',
  'ci-pipeline',
  'version-control',
]

const cards = () => screen.getAllByRole('listitem')
const image = (card) => card.querySelector('img')
const hover = (card, pointerType = 'mouse') =>
  fireEvent.pointerEnter(card, { pointerType })
const leave = (card, pointerType = 'mouse') =>
  fireEvent.pointerLeave(card, { pointerType })

describe('GuardCards', () => {
  it('shows each guard at rest', () => {
    env.reduced = false
    render(<GuardCards />)
    expect(PRESALE.guards.items.map((item) => item.art)).toEqual(ARTS)
    const list = cards()
    expect(list).toHaveLength(6)
    list.forEach((card, i) => {
      const images = card.querySelectorAll('img')
      expect(images).toHaveLength(1)
      const src = image(card).getAttribute('src')
      expect(src).toBe(`${DIR}${ARTS[i]}.svg`)
      expect(src.endsWith('-play.svg')).toBe(false)
      expect(image(card)).toHaveAttribute('alt', '')
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        PRESALE.guards.items[i].title
      )
      expect(card).toHaveTextContent(PRESALE.guards.items[i].copy)
    })
    /* Both drawings of every guard ship with the site. */
    for (const art of ARTS) {
      for (const file of [`${art}.svg`, `${art}-play.svg`]) {
        expect(existsSync(join(process.cwd(), 'public', DIR, file)), file).toBe(
          true
        )
      }
    }
  })

  it('plays a guard on hover and rests it on leave', () => {
    env.reduced = false
    render(<GuardCards />)
    const [first, second] = cards()

    hover(first)
    expect(image(first)).toHaveAttribute('src', `${DIR}api-gateway-play.svg`)
    expect(image(first)).toHaveAttribute('alt', '')
    expect(first.querySelectorAll('img')).toHaveLength(1)
    expect(image(second)).toHaveAttribute('src', `${DIR}firewall.svg`)

    leave(first)
    expect(image(first)).toHaveAttribute('src', `${DIR}api-gateway.svg`)

    /* A finger never starts it. */
    hover(second, 'touch')
    expect(image(second)).toHaveAttribute('src', `${DIR}firewall.svg`)
  })

  it('adds no tab stops', () => {
    env.reduced = false
    const { container } = render(<GuardCards />)
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0)
    expect(
      container.querySelectorAll('a, button, input, select, textarea')
    ).toHaveLength(0)
    hover(cards()[0])
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0)
  })

  it('never plays under reduced motion', () => {
    env.reduced = true
    const { rerender } = render(<GuardCards />)
    for (const [i, card] of cards().entries()) {
      hover(card)
      expect(image(card)).toHaveAttribute('src', `${DIR}${ARTS[i]}.svg`)
    }

    /* Turning motion off mid-hover rests the card. */
    env.reduced = false
    rerender(<GuardCards />)
    const card = cards()[2]
    hover(card)
    expect(image(card)).toHaveAttribute('src', `${DIR}billing-play.svg`)
    env.reduced = true
    act(() => rerender(<GuardCards />))
    expect(image(card)).toHaveAttribute('src', `${DIR}billing.svg`)
    env.reduced = false
  })
})

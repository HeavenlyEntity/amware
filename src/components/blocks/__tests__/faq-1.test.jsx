import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* The questions accordion: a heading column beside a list of questions, one
   open at a time. The site's reduced-motion hook is mocked; `firstRender`,
   when set, plays its first-render value before it settles. */

const env = vi.hoisted(() => ({ reduced: false, firstRender: undefined }))
vi.mock('@/components/AccessibilityProvider', async () => {
  const { useEffect, useState } = await import('react')
  return {
    useReducedMotion: () => {
      const [value, setValue] = useState(() =>
        env.firstRender === undefined ? env.reduced : env.firstRender
      )
      useEffect(() => setValue(env.reduced), [])
      return value
    },
  }
})

import { FaqSplit } from '@/components/blocks/faq-1'
import { PRESALE } from '@/content/site/standard-presale'

const RealObserver = globalThis.IntersectionObserver
afterEach(() => {
  env.reduced = false
  env.firstRender = undefined
  globalThis.IntersectionObserver = RealObserver
})

const items = [
  { question: 'First question?', answer: 'First answer.' },
  { question: 'Second question?', answer: 'Second answer.' },
  {
    question: 'Third question?',
    answer: (
      <>
        Read <a href="/services">the services page</a> first.
      </>
    ),
  },
]

const question = (name) => screen.getByRole('button', { name })

describe('FaqSplit', () => {
  it('opens the first question and closes it again', () => {
    render(<FaqSplit items={items} />)
    const first = question('First question?')
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('First answer.')).toBeInTheDocument()
    expect(question('Second question?')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens one question at a time', () => {
    env.reduced = true
    render(<FaqSplit items={items} />)
    fireEvent.click(question('Second question?'))
    expect(question('Second question?')).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(question('First question?')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-expanded') === 'true')
    ).toHaveLength(1)
  })

  it('renders a link inside an answer', () => {
    render(<FaqSplit items={items} defaultOpen={2} />)
    const link = screen.getByRole('link', { name: 'the services page' })
    expect(link).toHaveAttribute('href', '/services')
    expect(
      screen.getByRole('region', { name: 'Third question?' })
    ).toContainElement(link)
  })

  it('ties each button to its panel', () => {
    env.reduced = true
    render(<FaqSplit items={items} defaultOpen={null} />)
    items.forEach((item) => {
      const button = question(item.question)
      // Each question is a button inside a heading.
      expect(button.closest('h3')).not.toBeNull()
      fireEvent.click(button)
      const panelId = button.getAttribute('aria-controls')
      expect(panelId).toBeTruthy()
      const panel = document.getElementById(panelId)
      expect(panel).not.toBeNull()
      expect(panel).toHaveAttribute('role', 'region')
      expect(panel).toHaveAttribute('aria-labelledby', button.id)
    })
    const ids = items.map((item) =>
      question(item.question).getAttribute('aria-controls')
    )
    expect(new Set(ids).size).toBe(items.length)
  })

  it('keeps its heading column and renders no demo copy', () => {
    const { container } = render(
      <FaqSplit
        items={items}
        eyebrow="// QUESTIONS"
        title="Straight answers."
        copy="Read these first."
      />
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Straight answers.' })
    ).toBeInTheDocument()
    expect(screen.getByText('// QUESTIONS')).toBeInTheDocument()
    expect(screen.getByText('Read these first.')).toBeInTheDocument()

    const { container: bare } = render(<FaqSplit items={[]} />)
    expect(bare.textContent).toBe('')
    expect(container.textContent).not.toMatch(/billing|free trial/i)
  })

  it('waits hidden below the fold once the hook settles on "not reduced"', async () => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    env.firstRender = true
    const { container } = render(<FaqSplit items={items} title="Title" />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const parts = container.querySelectorAll('[data-faq-part]')
    expect(parts).toHaveLength(items.length + 1)
    parts.forEach((part) => expect(part.style.opacity).toBe('0'))
  })

  it('never starts hidden when motion is reduced', () => {
    env.reduced = true
    const { container } = render(<FaqSplit items={items} title="Title" />)
    const parts = container.querySelectorAll('[data-faq-part]')
    expect(parts).toHaveLength(items.length + 1)
    parts.forEach((part) => expect(part.style.opacity).not.toBe('0'))
  })

  it('draws every field of the Standard questions', () => {
    env.reduced = true
    const { eyebrow, title, copy, items: faqs } = PRESALE.faqs
    const withNodes = faqs.map((faq) => ({
      question: faq.question,
      answer: faq.link ? (
        <>
          {faq.answer}
          <a href={faq.link.href}>{faq.link.label}</a>
          {faq.link.after}
        </>
      ) : (
        faq.answer
      ),
    }))
    render(
      <FaqSplit items={withNodes} eyebrow={eyebrow} title={title} copy={copy} />
    )
    expect(screen.getByText(eyebrow)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy()
    expect(screen.getByText(copy)).toBeInTheDocument()
    faqs.forEach((faq) => {
      const button = question(faq.question)
      if (button.getAttribute('aria-expanded') !== 'true')
        fireEvent.click(button)
      const panel = screen.getByRole('region', { name: faq.question })
      expect(panel.textContent).toBe(
        faq.answer + (faq.link ? faq.link.label + faq.link.after : '')
      )
      if (faq.link) {
        expect(
          within(panel).getByRole('link', { name: faq.link.label })
        ).toHaveAttribute('href', faq.link.href)
      }
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import ContactForm from '../ContactForm'
import EnterpriseContactPage, { metadata } from '../enterprise/page'

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

const subjectBox = () => screen.getByLabelText(/subject/i)

const renderPage = async (searchParams) =>
  render(
    await EnterpriseContactPage({ searchParams: Promise.resolve(searchParams) })
  )

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('ContactForm subject', () => {
  it('starts on a subject it is given, ahead of the topic default', () => {
    render(<ContactForm topic="enterprise" initialSubject="Anything · here" />)
    expect(subjectBox().value).toBe('Anything · here')
  })

  it('leaves the ordinary form and the other topics alone', () => {
    render(<ContactForm />)
    expect(subjectBox().value).toBe('')
    document.body.innerHTML = ''
    /* The offer review has its own form now (offer-review.test.jsx), so
       the old topic name is just an unknown topic here. */
    render(<ContactForm topic="offer-review" />)
    expect(subjectBox().value).toBe('')
  })
})

describe('the Enterprise contact page', () => {
  it('opens the form with the kit and the tier in the subject', async () => {
    await renderPage({ kit: 'next-netsuite', tier: 'team' })
    expect(subjectBox().value).toBe(
      'WareKit Enterprise · Next.js + NetSuite · Team'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /enterprise/i })
    ).toBeInTheDocument()
  })

  it('follows the other stack', async () => {
    await renderPage({ kit: 'react-netsuite', tier: 'team' })
    expect(subjectBox().value).toBe(
      'WareKit Enterprise · React in NetSuite · Team'
    )
  })

  it('never puts the URL’s own words in the subject', async () => {
    // Only a known kit and tier become words; anything else is ignored.
    for (const searchParams of [
      { kit: 'Send me £10', tier: 'team' },
      { kit: 'next-netsuite', tier: 'free money' },
      { kit: ['next-netsuite', 'x'], tier: ['team', 'y'] },
      { kit: '__proto__', tier: 'constructor' },
      {},
    ]) {
      document.body.innerHTML = ''
      await renderPage(searchParams)
      const expected = Array.isArray(searchParams.kit)
        ? 'WareKit Enterprise · Next.js + NetSuite · Team'
        : 'WareKit Enterprise'
      expect(subjectBox().value).toBe(expected)
    }
  })

  it('stays out of search', () => {
    expect(metadata.robots).toEqual({ index: false })
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ServiceTracks } from '../service-tracks'

/* A buyer lands on /services and picks the track that is theirs. Both
   panels are in the page for search engines; only the chosen one shows,
   and the choice lives in the URL hash so a link can open either. */

const panels = {
  consulting: <p>Retainer cards</p>,
  technical: <p>Website build section</p>,
}

const panelOf = (text) => screen.getByText(text).closest('[role="tabpanel"]')

afterEach(() => window.history.replaceState(null, '', '/'))

describe('ServiceTracks', () => {
  it('opens on Consulting, with Build & support in the page but hidden', () => {
    render(<ServiceTracks panels={panels} />)
    expect(screen.getByRole('tab', { name: 'Consulting' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('Retainer cards')).toBeVisible()
    expect(panelOf('Website build section')).toHaveAttribute('hidden')
  })

  it('switches track and records the choice in the hash', () => {
    render(<ServiceTracks panels={panels} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Build & support' }))
    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')
    expect(panelOf('Website build section')).not.toHaveAttribute('hidden')
    expect(panelOf('Retainer cards')).toHaveAttribute('hidden')
    expect(window.location.hash).toBe('#build-support')
  })

  it('opens the tab a link points at', () => {
    window.history.replaceState(null, '', '/#build-support')
    render(<ServiceTracks panels={panels} />)
    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the last recognised track when the hash changes to something unrelated', () => {
    window.history.replaceState(null, '', '/#build-support')
    render(<ServiceTracks panels={panels} />)
    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')

    window.history.replaceState(null, '', '/#main-content')
    fireEvent(window, new Event('hashchange'))

    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')
    expect(panelOf('Website build section')).not.toHaveAttribute('hidden')
  })

  it('gives every tab panel a tabIndex so it is focusable', () => {
    render(<ServiceTracks panels={panels} />)
    expect(panelOf('Retainer cards')).toHaveAttribute('tabindex', '0')
    expect(panelOf('Website build section')).toHaveAttribute('tabindex', '0')
  })
})

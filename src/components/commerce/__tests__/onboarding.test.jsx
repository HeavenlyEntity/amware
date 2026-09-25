import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingSteps } from '../OnboardingSteps'

const base = {
  itemName: 'WareKit Next NetSuite (Pro)',
  repo: 'amwaredotdev/warekit-next-netsuite',
  maskedLicenseKey: 'WAREKIT…A1B2',
  githubUsername: 'octocat',
  discordUrl: null,
  cliCommand: 'npx warekit init',
  tier: 'pro',
}

describe('OnboardingSteps', () => {
  it('shows the repo, the masked key and the next step once delivered', () => {
    render(<OnboardingSteps {...base} delivered />)
    expect(
      screen.getByText('amwaredotdev/warekit-next-netsuite')
    ).toBeInTheDocument()
    expect(screen.getByText('WAREKIT…A1B2')).toBeInTheDocument()
    expect(screen.getByText(/working with a team/i)).toBeInTheDocument()
  })

  it('says access is being prepared, and names the account, when the invite is pending', () => {
    render(<OnboardingSteps {...base} delivered={false} />)
    expect(screen.getByText(/being prepared/i)).toBeInTheDocument()
    expect(screen.getByText(/octocat/)).toBeInTheDocument()
  })

  it('never asks for a GitHub account', () => {
    render(<OnboardingSteps {...base} delivered />)
    expect(screen.queryByLabelText(/github/i)).toBeNull()
  })

  it('tells a Team buyer how many accounts the licence covers, and where to add them', () => {
    render(<OnboardingSteps {...base} tier="team" seats={5} delivered />)
    expect(
      screen.getByText(
        'Your licence covers 5 GitHub accounts — add the rest from the link in your receipt email.'
      )
    ).toBeInTheDocument()
  })

  it('says the same while the invitation is still pending', () => {
    render(
      <OnboardingSteps {...base} tier="team" seats={5} delivered={false} />
    )
    expect(screen.getByText(/covers 5 GitHub accounts/)).toBeInTheDocument()
  })

  it('says nothing about seats on a single-seat licence', () => {
    render(<OnboardingSteps {...base} seats={1} delivered />)
    // Not /GitHub accounts/: the Pro upsell below names Team's five.
    expect(screen.queryByText(/licence covers/i)).toBeNull()
  })
})

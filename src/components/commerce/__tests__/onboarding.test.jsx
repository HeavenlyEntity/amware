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

  it('tells a Team buyer how many developers the license covers, and where to add them', () => {
    render(<OnboardingSteps {...base} tier="team" seats={5} delivered />)
    expect(
      screen.getByText(
        'Your license covers 5 developers — add the rest from the link in your receipt email.'
      )
    ).toBeInTheDocument()
  })

  it('says the same while the invitation is still pending', () => {
    render(
      <OnboardingSteps {...base} tier="team" seats={5} delivered={false} />
    )
    expect(screen.getByText(/covers 5 developers/)).toBeInTheDocument()
  })

  it('says nothing about seats on a single-seat licence', () => {
    render(<OnboardingSteps {...base} seats={1} delivered />)
    // Not /developers/: the Pro upsell below names Team's five.
    expect(screen.queryByText(/license covers/i)).toBeNull()
  })

  it('offers the license page after delivery, as the last step', () => {
    const { container } = render(
      <OnboardingSteps {...base} delivered licenseUrl="/access/seats/tok" />
    )

    expect(
      screen.getByRole('heading', { name: 'Add your key to .env' })
    ).toBeInTheDocument()
    expect(screen.getByText('NS_ACCOUNT_ID')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open your license page/i })
    ).toHaveAttribute('href', '/access/seats/tok')

    // Last of the steps: after the repository and the setup step.
    const steps = [...container.querySelectorAll('ol > li h2')].map(
      (h) => h.textContent
    )
    expect(steps.at(-1)).toBe('Add your key to .env')
    expect(steps.indexOf('Set up your copy')).toBeLessThan(
      steps.indexOf('Add your key to .env')
    )
  })

  it('numbers the license step after the Discord step when there is one', () => {
    render(
      <OnboardingSteps
        {...base}
        delivered
        discordUrl="https://discord.gg/x"
        licenseUrl="/access/seats/tok"
      />
    )
    const step = screen
      .getByRole('heading', { name: 'Add your key to .env' })
      .closest('li')
    expect(step.textContent).toMatch(/^4/)
  })

  it('does not offer the license page before the repository is delivered', () => {
    render(
      <OnboardingSteps
        {...base}
        delivered={false}
        licenseUrl="/access/seats/tok"
      />
    )
    expect(screen.queryByRole('link', { name: /license page/i })).toBeNull()
  })

  it('leaves the step out when there is no license page to link to', () => {
    render(<OnboardingSteps {...base} delivered />)
    expect(screen.queryByText(/add your key to \.env/i)).toBeNull()
  })

  it('says where the full key is, depending on whether there is a license page', () => {
    const { rerender } = render(<OnboardingSteps {...base} delivered />)
    expect(
      screen.getByText(/full key is in your receipt email/i)
    ).toBeInTheDocument()
    rerender(
      <OnboardingSteps {...base} delivered licenseUrl="/access/seats/tok" />
    )
    expect(
      screen.getByText(/full key is on your license page/i)
    ).toBeInTheDocument()
  })
})

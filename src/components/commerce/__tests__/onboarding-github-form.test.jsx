import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/commerce/onboarding', () => ({ completeOnboarding: vi.fn() }))

import { completeOnboarding } from '@/lib/commerce/onboarding'
import { OnboardingGithubForm } from '@/components/commerce/OnboardingGithubForm'

const github = (login) => ({
  status: 200,
  ok: true,
  json: async () => ({
    login,
    name: 'The Octocat',
    avatar_url: 'https://avatars.example/o.png',
    html_url: `https://github.com/${login}`,
    type: 'User',
  }),
})

const props = { requestId: 'req-1', signature: 'sig-1' }

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: false })
})

describe('OnboardingGithubForm', () => {
  it('carries the signed link back with the answer', async () => {
    completeOnboarding.mockResolvedValue({ error: null, ok: null })
    const { container } = render(<OnboardingGithubForm {...props} />)

    expect(container.querySelector('input[name="r"]')).toHaveValue('req-1')
    expect(container.querySelector('input[name="s"]')).toHaveValue('sig-1')

    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled())
    const sent = completeOnboarding.mock.calls[0][1]
    expect(sent.get('r')).toBe('req-1')
    expect(sent.get('s')).toBe('sig-1')
    expect(sent.get('githubUsername')).toBe('octocat')
  })

  it('starts empty when nothing is known about the buyer', () => {
    render(<OnboardingGithubForm {...props} />)
    expect(screen.getByLabelText(/github username/i)).toHaveValue('')
  })

  it('pre-fills a known account but still asks the buyer to confirm it', async () => {
    global.fetch = vi.fn().mockResolvedValue(github('octocat'))
    render(<OnboardingGithubForm {...props} initialUsername="octocat" />)

    expect(screen.getByLabelText(/github username/i)).toHaveValue('octocat')
    /* The lookup is debounced by 450ms; under a full run that leaves little of
       the default one second. */
    const confirm = await screen.findByLabelText(
      /this is my github account/i,
      {},
      { timeout: 4000 }
    )
    expect(confirm).not.toBeChecked()
    // The field reports the gate to the form from an effect, a render later.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /confirm your account/i })
      ).toBeDisabled()
    )

    fireEvent.click(confirm)
    expect(
      screen.getByRole('button', { name: /send my invitation/i })
    ).toBeEnabled()
  })

  it('shows what happened, and the license page, once the invitation is sent', async () => {
    completeOnboarding.mockResolvedValue({
      error: null,
      ok: {
        username: 'octocat',
        repo: 'amwaredotdev/warekit-next-netsuite',
        inviteUrl: 'https://github.com/invite/1',
        alreadyHadAccess: false,
        manual: false,
        licenseUrl: '/access/seats/tok',
      },
    })
    const { container } = render(<OnboardingGithubForm {...props} />)
    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/amwaredotdev\/warekit-next-netsuite/)
    expect(
      screen.getByRole('link', { name: /accept invitation/i })
    ).toHaveAttribute('href', 'https://github.com/invite/1')
    expect(
      screen.getByRole('link', { name: /open your license page/i })
    ).toHaveAttribute('href', '/access/seats/tok')
  })

  it('says a failed invitation will be finished by hand, and keeps the account', async () => {
    completeOnboarding.mockResolvedValue({
      error: null,
      ok: {
        username: 'octocat',
        repo: 'amwaredotdev/warekit-next-netsuite',
        inviteUrl: null,
        alreadyHadAccess: false,
        manual: true,
      },
    })
    const { container } = render(<OnboardingGithubForm {...props} />)
    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/by hand/i)
    expect(status).toHaveTextContent('@octocat')
    expect(
      screen.queryByRole('link', { name: /accept invitation/i })
    ).toBeNull()
  })

  it('shows a refusal, such as a second answer, without a result', async () => {
    completeOnboarding.mockResolvedValue({
      error: { field: null, message: 'This purchase is already set up.' },
      ok: null,
    })
    const { container } = render(<OnboardingGithubForm {...props} />)
    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already set up/i
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('attaches a username error to the field', async () => {
    completeOnboarding.mockResolvedValue({
      error: { field: 'githubUsername', message: 'GitHub has no account.' },
      ok: null,
    })
    const { container } = render(<OnboardingGithubForm {...props} />)
    const input = screen.getByLabelText(/github username/i)
    fireEvent.change(input, { target: { value: 'nobody' } })
    fireEvent.submit(container.querySelector('form'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('GitHub has no account.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('leaves out the license page when none was minted', async () => {
    completeOnboarding.mockResolvedValue({
      error: null,
      ok: {
        username: 'octocat',
        repo: 'amwaredotdev/warekit-next-netsuite',
        inviteUrl: 'https://github.com/invite/1',
        alreadyHadAccess: false,
        manual: false,
        licenseUrl: null,
      },
    })
    const { container } = render(<OnboardingGithubForm {...props} />)
    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))

    await screen.findByRole('status')
    expect(screen.queryByRole('link', { name: /license page/i })).toBeNull()
  })

  describe('retrying a failed invitation', () => {
    it('fixes the account and offers only a Try again button', () => {
      const { container } = render(
        <OnboardingGithubForm {...props} retryUsername="octocat" />
      )

      expect(screen.queryByLabelText(/github username/i)).toBeNull()
      expect(
        container.querySelector('input[name="githubUsername"]')
      ).toHaveValue('octocat')
      expect(
        container.querySelector('input[name="githubUsername"]')
      ).toHaveAttribute('type', 'hidden')
      expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled()
      // The by-hand promise stays as the fallback.
      expect(container.textContent).toMatch(/by hand within one business day/i)
    })

    it('posts the same signed link and the fixed account', async () => {
      completeOnboarding.mockResolvedValue({ error: null, ok: null })
      const { container } = render(
        <OnboardingGithubForm {...props} retryUsername="octocat" />
      )
      fireEvent.submit(container.querySelector('form'))

      await waitFor(() => expect(completeOnboarding).toHaveBeenCalled())
      const sent = completeOnboarding.mock.calls[0][1]
      expect(sent.get('r')).toBe('req-1')
      expect(sent.get('s')).toBe('sig-1')
      expect(sent.get('githubUsername')).toBe('octocat')
    })

    it('shows the result when the retry works', async () => {
      completeOnboarding.mockResolvedValue({
        error: null,
        ok: {
          username: 'octocat',
          repo: 'amwaredotdev/warekit-next-netsuite',
          inviteUrl: 'https://github.com/invite/1',
          alreadyHadAccess: false,
          manual: false,
          licenseUrl: null,
        },
      })
      const { container } = render(
        <OnboardingGithubForm {...props} retryUsername="octocat" />
      )
      fireEvent.submit(container.querySelector('form'))

      expect(await screen.findByRole('status')).toHaveTextContent(
        /invitation for/i
      )
    })

    it('shows why a retry was refused', async () => {
      completeOnboarding.mockResolvedValue({
        error: { field: null, message: 'This license covers 1 developer.' },
        ok: null,
      })
      const { container } = render(
        <OnboardingGithubForm {...props} retryUsername="octocat" />
      )
      fireEvent.submit(container.querySelector('form'))
      expect(await screen.findByRole('alert')).toHaveTextContent(/covers 1/)
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/commerce/onboarding', () => ({ completeOnboarding: vi.fn() }))

/* Reduced motion is a switch here, so the still versions can be asserted. */
const motionPref = vi.hoisted(() => ({ reduced: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => motionPref.reduced,
}))

import { completeOnboarding } from '@/lib/commerce/onboarding'
import { OnboardingGithubForm } from '@/components/commerce/OnboardingGithubForm'
import {
  SetupProgress,
  SetupStepper,
  SetupEyebrow,
  UntilSent,
} from '@/components/commerce/SetupProgress'

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
  motionPref.reduced = false
  global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: false })
})

const answered = (ok) => ({
  error: null,
  ok: {
    username: 'octocat',
    repo: 'amwaredotdev/warekit-next-netsuite',
    inviteUrl: null,
    alreadyHadAccess: false,
    manual: false,
    licenseUrl: null,
    ...ok,
  },
})

async function submitWith(result, ui = <OnboardingGithubForm {...props} />) {
  completeOnboarding.mockResolvedValue(result)
  const view = render(ui)
  fireEvent.change(screen.getByLabelText(/github username/i), {
    target: { value: 'octocat' },
  })
  fireEvent.submit(view.container.querySelector('form'))
  const status = await screen.findByRole('status')
  return { ...view, status }
}

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
      screen.getByRole('link', { name: /accept the invitation/i })
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
      screen.queryByRole('link', { name: /accept the invitation/i })
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

/* Each `state.ok` variant on the accent panel: its own heading, its own
   action, and the license page as its own card beneath. */
describe('OnboardingGithubForm success panel', () => {
  it('invited: heads it on its way and links Accept the invitation', async () => {
    const { status } = await submitWith(
      answered({ inviteUrl: 'https://github.com/invite/1' })
    )
    expect(
      screen.getByRole('heading', { name: 'The repository is on its way.' })
    ).toBeInTheDocument()
    expect(status).toHaveTextContent(/invitation for amwaredotdev/i)
    const accept = screen.getByRole('link', { name: /accept the invitation/i })
    expect(accept).toHaveAttribute('href', 'https://github.com/invite/1')
    expect(accept).toHaveAttribute('target', '_blank')
  })

  it('invited without a link: says so, and offers no button', async () => {
    await submitWith(answered())
    expect(
      screen.getByRole('heading', { name: 'The repository is on its way.' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('already has access: links the repository itself', async () => {
    await submitWith(answered({ alreadyHadAccess: true }))
    expect(
      screen.getByRole('heading', { name: '@octocat already has access.' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /amwaredotdev\/warekit-next-netsuite/ })
    ).toHaveAttribute(
      'href',
      'https://github.com/amwaredotdev/warekit-next-netsuite'
    )
    expect(
      screen.queryByRole('link', { name: /accept the invitation/i })
    ).toBeNull()
  })

  it('manual: the by-hand copy, with no button at all', async () => {
    const { status } = await submitWith(answered({ manual: true }))
    expect(
      screen.getByRole('heading', { name: 'You are on the list, @octocat.' })
    ).toBeInTheDocument()
    expect(status).toHaveTextContent(/by hand within one business day/i)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('ends on the license page card when there is one', async () => {
    await submitWith(answered({ licenseUrl: '/access/seats/tok' }))
    expect(
      screen.getByRole('link', { name: /last step: open your license page/i })
    ).toHaveAttribute('href', '/access/seats/tok')
  })

  it('bursts on success, and holds still under reduced motion', async () => {
    const first = await submitWith(answered())
    expect(first.container.querySelectorAll('[data-spark]')).toHaveLength(8)
    first.unmount()

    motionPref.reduced = true
    const still = await submitWith(answered())
    expect(still.container.querySelectorAll('[data-spark]')).toHaveLength(0)
  })
})

describe('Setup stepper', () => {
  const page = (accountDone) => (
    <SetupProgress accountDone={accountDone} asking={!accountDone}>
      <SetupStepper />
      <SetupEyebrow />
      <OnboardingGithubForm {...props} />
    </SetupProgress>
  )

  it('starts on the GitHub step, pulsing, and advances when the form succeeds', async () => {
    completeOnboarding.mockResolvedValue(answered())
    const { container } = render(page(false))

    const current = () => container.querySelector('[aria-current="step"]')
    expect(current()).toHaveTextContent('GitHub account')
    expect(current().querySelector('.amw-kit-pulse')).not.toBeNull()
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))
    await screen.findByRole('status')

    await waitFor(() => expect(current()).toHaveTextContent('License key'))
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
    expect(container.querySelector('.amw-kit-pulse')).toBeNull()
  })

  it('replaces the whole question panel, and the one-more-step line, on success', async () => {
    completeOnboarding.mockResolvedValue(answered())
    const { container } = render(
      <SetupProgress accountDone={false} asking>
        <UntilSent>
          <p>One more step and the repository is in your hands.</p>
        </UntilSent>
        <OnboardingGithubForm {...props} title="Which GitHub account?" />
      </SetupProgress>
    )
    expect(
      screen.getByRole('heading', { name: 'Which GitHub account?' })
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/github username/i), {
      target: { value: 'octocat' },
    })
    fireEvent.submit(container.querySelector('form'))
    const status = await screen.findByRole('status')

    expect(
      screen.queryByRole('heading', { name: 'Which GitHub account?' })
    ).toBeNull()
    expect(screen.queryByText(/one more step/i)).toBeNull()
    expect(document.activeElement).toBe(status)
  })

  it('starts on the license step when the account is already on file', () => {
    const { container } = render(
      <SetupProgress accountDone>
        <SetupStepper />
        <SetupEyebrow />
      </SetupProgress>
    )
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent(
      'License key'
    )
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
  })
})

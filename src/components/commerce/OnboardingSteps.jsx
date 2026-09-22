import { NextStep } from '@/components/commerce/NextStep'

/* What a buyer sees once Whop sends them back.
 *
 * There is no question to ask any more: Whop collects the GitHub username on
 * the checkout form itself, before the card, so this page only ever reports
 * what already happened. Two states cover it -- delivered, or not yet -- and
 * a purely presentational component needs no client-side interactivity to
 * show either one, so this stays a server-renderable component.
 *
 * "Not yet" means the webhook recorded the sale but the repository
 * invitation has not gone out (or GitHub could not be reached). It is never
 * a place to collect anything: the account on file is shown, not edited, and
 * a wrong one is fixed by replying to the receipt email.
 */

function Step({ n, title, done, children }) {
  return (
    <li className="border-[var(--amw-line)] relative border-l pb-10 pl-8 last:border-transparent last:pb-0">
      <span
        aria-hidden="true"
        className={`amw-mono absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
          done
            ? 'border-[var(--amw-accent)] bg-[var(--amw-accent)] text-zinc-950'
            : 'border-[var(--amw-line-strong)] bg-[var(--amw-page)] text-[var(--amw-mut)]'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </li>
  )
}

export function OnboardingSteps({
  itemName,
  repo,
  maskedLicenseKey,
  githubUsername,
  discordUrl,
  cliCommand,
  tier,
  delivered,
  seats = 1,
}) {
  return (
    <>
      <ol className="mt-12">
        {delivered ? (
          <>
            <Step n="1" title="Your repository" done>
              {repo ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <a
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    {repo}
                  </a>{' '}
                  is yours. Clone it and follow the README to get started.
                </p>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {itemName} is yours. Clone the repository and follow the
                  README to get started.
                </p>
              )}
            </Step>

            {/* Rendered only when a server exists to join. A community link
                that 404s is worse than no community section. */}
            {discordUrl && (
              <Step n="2" title="Join the Discord">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Where questions get answered and bugs get reported. Other
                  people building on the same kit are in there.
                </p>
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-[var(--amw-line)] hover:border-[var(--amw-accent)] hover:text-[var(--amw-accent)] mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 transition-colors dark:text-zinc-300"
                >
                  Accept the Discord invite
                </a>
              </Step>
            )}

            <Step n={discordUrl ? '3' : '2'} title="Set up your copy">
              {maskedLicenseKey && (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Your licence key, masked for this page. The full key is in
                    your receipt email.
                  </p>
                  <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] mt-3 block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
                    {maskedLicenseKey}
                  </code>
                </>
              )}

              <div className="mt-4 space-y-2">
                <p className="amw-kicker">in your terminal</p>
                <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
                  git clone git@github.com:{repo || 'amwaredotdev/your-kit'}.git
                </code>
                {cliCommand && (
                  <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] block overflow-x-auto rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
                    {cliCommand}
                  </code>
                )}
              </div>
            </Step>
          </>
        ) : (
          <Step n="1" title="Repository access" done={false}>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Payment received. Repository access is being prepared for{' '}
              <span className="font-medium">
                {githubUsername ? `@${githubUsername}` : 'the account on file'}
              </span>
              . If that is the wrong account, reply to your receipt email and it
              will be fixed.
            </p>
          </Step>
        )}
      </ol>

      {/* A Team buyer is seat one of several. The rest are added from the
          signed seat link, which only the receipt email carries -- without
          this line the page never mentions them at all. */}
      {seats > 1 && (
        <p className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
          {`Your licence covers ${seats} GitHub accounts — add the rest from the link in your receipt email.`}
        </p>
      )}

      <NextStep tier={tier} />
    </>
  )
}

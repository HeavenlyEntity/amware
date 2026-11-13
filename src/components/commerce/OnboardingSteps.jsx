import { IconArrowRight, IconCheck } from '@tabler/icons-react'
import { NextStep } from '@/components/commerce/NextStep'

/* What a buyer sees once Whop sends them back.
 *
 * There is no question to ask any more: Whop collects the GitHub username on
 * the checkout form itself, before the card, so this page only ever reports
 * what already happened. Two states cover it -- delivered, or not yet -- and
 * a purely presentational component needs no client-side interactivity to
 * show either one, so this stays a server-renderable component.
 *
 * A Creem buyer gives their account on the page itself, before this renders
 * (see OnboardingGithubForm); by the time these steps show, it is on file.
 *
 * "Not yet" means the webhook recorded the sale but the repository
 * invitation has not gone out (or GitHub could not be reached). It is never
 * a place to collect anything: the account on file is shown, not edited, and
 * a wrong one is fixed by replying to the receipt email.
 */

/* Each step is a muted card in the kit pages' grammar, numbered the way the
   "what happens next" strip numbers its cards. */
function Step({ n, title, done, children }) {
  return (
    <li className="amw-kit-card p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
            done
              ? 'bg-[var(--amw-accent)] text-zinc-950'
              : 'bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)]'
          }`}
        >
          {done ? <IconCheck size={14} stroke={2.4} /> : n}
        </span>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
      </div>
      <div className="mt-3.5">{children}</div>
    </li>
  )
}

const TEXT = 'text-sm leading-relaxed text-[var(--amw-mut)]'
const CODE =
  'amw-mono amw-kit-inset block overflow-x-auto px-3.5 py-2.5 text-sm text-[var(--amw-ink)]'
/* The about page's ring button, as a link that may leave the site. */
const RING =
  'amw-kit-ring hover:text-[var(--amw-accent-ink)] hover:ring-[var(--amw-accent)] mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-zinc-700 no-underline ring-1 ring-inset ring-zinc-900/15 transition-colors duration-200 dark:text-zinc-200 dark:ring-white/[0.18]'

function Arrow() {
  return (
    <IconArrowRight
      size={16}
      stroke={1.5}
      aria-hidden="true"
      className="amw-kit-chev"
    />
  )
}

/**
 * Typed through JSDoc because this is a .jsx file used from a .tsx page:
 * without it TypeScript takes every destructured prop as required.
 *
 * @param {{
 *   itemName: string,
 *   repo: string | null,
 *   maskedLicenseKey: string | null,
 *   githubUsername: string | null,
 *   discordUrl: string | null,
 *   cliCommand: string | null,
 *   tier: string,
 *   delivered: boolean,
 *   seats?: number,
 *   licenseUrl?: string | null,
 *   licenseExpired?: boolean,
 * }} props
 */
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
  licenseUrl,
  licenseExpired,
}) {
  return (
    <>
      <ol className="mt-9 flex flex-col gap-3">
        {delivered ? (
          <>
            <Step n="1" title="Your repository" done>
              {repo ? (
                <p className={TEXT}>
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
                <p className={TEXT}>
                  {itemName} is yours. Clone the repository and follow the
                  README to get started.
                </p>
              )}
            </Step>

            {/* Rendered only when a server exists to join. A community link
                that 404s is worse than no community section. */}
            {discordUrl && (
              <Step n="2" title="Join the Discord">
                <p className={TEXT}>
                  Where questions get answered and bugs get reported. Other
                  people building on the same kit are in there.
                </p>
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={RING}
                >
                  Accept the Discord invite
                  <Arrow />
                </a>
              </Step>
            )}

            <Step n={discordUrl ? '3' : '2'} title="Set up your copy">
              {maskedLicenseKey && (
                <>
                  <p className={TEXT}>
                    {licenseUrl || licenseExpired
                      ? 'Your license key, masked for this page. The full key is on your license page.'
                      : 'Your license key, masked for this page. The full key is in your receipt email.'}
                  </p>
                  <code className={`${CODE} mt-3`}>{maskedLicenseKey}</code>
                </>
              )}

              <div className="mt-4 space-y-2">
                <p className="amw-kicker">in your terminal</p>
                <code className={CODE}>
                  git clone git@github.com:{repo || 'amwaredotdev/your-kit'}.git
                </code>
                {cliCommand && <code className={CODE}>{cliCommand}</code>}
              </div>
            </Step>

            {/* The last thing between a buyer and a working kit. Rendered only
                when there is a license page to send them to, or, once the purchase is too
                old for a fresh link, the route that emails one. */}
            {(licenseUrl || licenseExpired) && (
              <Step n={discordUrl ? '4' : '3'} title="Add your key to .env">
                <p className={TEXT}>
                  Your license page has the full key. Copy{' '}
                  <code className="amw-mono">WAREKIT_LICENSE_KEY=…</code> into
                  your <code className="amw-mono">.env</code>, beside{' '}
                  <code className="amw-mono">NS_ACCOUNT_ID</code>.
                </p>
                <a href={licenseUrl || '/access/resend'} className={RING}>
                  {licenseUrl
                    ? 'Open your license page'
                    : 'Email me a new license link'}
                  <Arrow />
                </a>
              </Step>
            )}
          </>
        ) : (
          <Step n="1" title="Repository access" done={false}>
            <p className={TEXT}>
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
        <p className="text-[var(--amw-mut)] mt-8 text-sm leading-relaxed">
          {`Your license covers ${seats} developers — add the rest from the link in your receipt email.`}
        </p>
      )}

      <NextStep tier={tier} />
    </>
  )
}

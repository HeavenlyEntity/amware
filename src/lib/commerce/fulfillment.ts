import { Resend } from 'resend'

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}
const FROM = process.env.RESEND_FROM || 'Amware <hello@amware.dev>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''

export async function sendAccessLinkEmail(args: {
  to: string
  itemName: string
  token: string
}): Promise<void> {
  if (!SITE)
    throw new Error('NEXT_PUBLIC_SITE_URL is required to send access links')
  const url = `${SITE}/access/${args.token}`
  await getResend().emails.send({
    from: FROM,
    to: args.to,
    subject: `Your access to ${args.itemName}`,
    text: `Thanks for your purchase of ${args.itemName}.\n\nAccess it here:\n${url}\n\nThis link is personal to you and expires in 30 days. You can request a fresh link any time at ${SITE}/access/resend.\n\n— Alec`,
  })
}

/* How long a buyer should wait before assuming something went wrong. Change
 * this and the email changes with it -- it is a commitment, so it lives where
 * it can be found rather than buried in a sentence. */
const INVITE_WINDOW = 'one business day'

/* Two emails, because there are two truths.
 *
 * When the invitation actually went out, the email says so and carries the
 * link to accept it. When it did not -- no token configured, GitHub
 * unreachable, a repository the token cannot see -- the email falls back to
 * describing the manual process, which is what really happens next.
 *
 * The old copy said an invitation would arrive "shortly" in both cases.
 * Nothing sent one. A promise the system cannot keep costs more than a slower
 * promise it can, so neither branch claims more than it did.
 *
 * Both repeat the username back. That is the single moment a buyer can catch
 * their own typo -- after this, the next signal is an invitation that never
 * arrives, by which point they have paid and have no way to correct it.
 */
export async function sendBoilerplateConfirmationEmail(args: {
  to: string
  itemName: string
  githubUsername?: string
  /** `owner/repo`, so the buyer can tell which kit was granted. */
  repo?: string
  /** GitHub's accept link. Present only when an invitation really was sent. */
  inviteUrl?: string | null
  /** True when GitHub reports the buyer already had access. */
  alreadyHadAccess?: boolean
  /** Signed seat-management link. Only for licences with more than one seat. */
  seatsUrl?: string | null
  /** How many accounts the licence covers, when more than one. */
  seats?: number
  /** Signed link back to the setup page, for a buyer who closed the tab. */
  onboardingUrl?: string | null
  /**
   * The Whop setup page for this purchase. Appended as its own line to
   * whichever branch applies -- unlike `onboardingUrl`, it asks nothing.
   */
  setupUrl?: string | null
  /** The full licence key. This email goes only to the buyer's own address. */
  licenseKey?: string | null
}): Promise<void> {
  const target = args.githubUsername
    ? `@${args.githubUsername}`
    : 'the GitHub account you gave at checkout'

  const correction = args.githubUsername
    ? `\n\nIf @${args.githubUsername} is not the right account, reply to this email and I will fix it.`
    : '\n\nIf you need access sent to a different account, reply to this email.'

  const repoName = args.repo ? ` for ${args.repo}` : ''

  let body: string

  /* The normal path now: paid, but the kit cannot be sent anywhere until the
     buyer says which GitHub account it goes to. That question is asked on the
     page they were redirected to, and this email is the way back to it --
     otherwise a closed tab means the only route is browser history. */
  if (args.onboardingUrl) {
    body = `Thanks for buying ${args.itemName}.

One thing left: tell me which GitHub account should receive the repository.

${args.onboardingUrl}

That link is yours. It is how you set up access, and how you get back to the setup page later.

— Alec`
  } else if (args.alreadyHadAccess) {
    body = `Thanks for buying ${args.itemName}.

${target} already has access to the repository${repoName}, so there is nothing to accept — open it and clone.${correction}

— Alec`
  } else if (args.inviteUrl) {
    body = `Thanks for buying ${args.itemName}.

A GitHub invitation${repoName} is waiting for ${target}. Accept it here:
${args.inviteUrl}

GitHub also emails you the invitation, and that one does sometimes land in spam. Invitations do lapse if they sit unaccepted — if yours has, reply to this email and I will send another.${correction}

— Alec`
  } else {
    body = `Thanks for buying ${args.itemName}.

I could not send the GitHub invitation automatically, so I am granting access by hand — which means it is not instant. You will get an invitation${repoName} to ${target} within ${INVITE_WINDOW}.${correction}

GitHub sends its own email when the invitation goes out, and it does sometimes land in spam.

— Alec`
  }

  /* Appended rather than woven into each branch: whether the invitation sent
     is a different question from how many accounts the licence covers, and
     the team half of the email should read the same either way. */
  if (args.seatsUrl && args.seats && args.seats > 1) {
    body += `

Your licence covers ${args.seats} GitHub accounts. Add the rest of your team here, one invitation each:
${args.seatsUrl}

Keep that link — it is how you add someone later, and it does not need an account.`
  }

  /* The setup page shows the key masked and says the full one is here; this
     is what makes that true. Safe in full because this email only ever goes
     to the buyer's own address. */
  if (args.licenseKey) {
    body += `

Your licence key:
${args.licenseKey}`
  }

  /* Appended to every branch, like the seats, and never by way of the
     onboardingUrl branch above: that one rewrites the email to ask for a
     GitHub account, which Whop already collected at checkout. This is only
     the way back to the page, which tells buyers it is in this email. */
  if (args.setupUrl) {
    body += `

Your setup page, with the repository and what to do next:
${args.setupUrl}

Keep that link — it is how you get back to the page.`
  }

  await getResend().emails.send({
    from: FROM,
    to: args.to,
    subject: `Your purchase of ${args.itemName}`,
    text: body,
  })
}

/* The deposit that starts an engagement, taken on Whop. There is nothing
   to deliver; the receipt's job is to say what the money did (it is
   credited, not spent) and what happens next, and to put the booking link
   in front of anyone who paid before booking the call. Amount is in cents,
   as the purchases table stores it. */
function money(cents: number, currency: string): string {
  const major = cents / 100
  const code = currency.toUpperCase()
  if (code === 'USD') {
    return `$${major.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }
  return `${major.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${code}`
}

export async function sendDepositReceivedEmail(args: {
  to: string
  name?: string
  serviceName: string
  amount: number
  currency: string
  bookingUrl?: string | null
}): Promise<void> {
  const greeting = args.name ? `Hi ${args.name.split(' ')[0]},` : 'Hi,'
  const booking = args.bookingUrl
    ? `\n\nIf we have not spoken yet, book the intro call here and we will start from there:\n${args.bookingUrl}`
    : ''
  await getResend().emails.send({
    from: FROM,
    to: args.to,
    subject: `Your ${money(args.amount, args.currency)} deposit for ${
      args.serviceName
    } is in`,
    text: `${greeting}

Your ${money(args.amount, args.currency)} deposit for the ${
      args.serviceName
    } engagement is received. It is credited in full against your first month, so it is a start date, not an extra cost.${booking}

I will be in touch within one business day to set the engagement up. Reply to this email any time.

— Alec`,
  })
}

/* The owner's heads-up. A deposit is a client arriving, which is worth an
   interruption in a way a $12 download is not. Silent when no address is
   configured. */
export async function notifyDepositReceived(args: {
  email: string
  serviceName: string
  amount: number
  currency: string
  paymentId: string
}): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_TO
  if (!to) return
  await getResend().emails.send({
    from: FROM,
    to,
    replyTo: args.email,
    subject: `Deposit received: ${args.serviceName} from ${args.email}`,
    text: `${money(args.amount, args.currency)} for ${
      args.serviceName
    }\nFrom: ${args.email}\nWhop payment: ${
      args.paymentId
    }\n\nReply to this email to reach them.`,
  })
}

/* The owner's heads-up for a Whop sale nothing here delivers: a product that
   is not a kit, or a course. The purchase is recorded as pending, Whop sends
   the buyer its own receipt, and this email is the only signal that someone
   has paid and is waiting -- so it says what to deliver, not that a client
   arrived. Silent when no address is configured, like notifyDepositReceived.
   Amount is in cents. */
export async function notifyManualFulfilment(args: {
  email: string
  itemName: string
  amount: number
  currency: string
  paymentId: string
}): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_TO
  if (!to) return
  await getResend().emails.send({
    from: FROM,
    to,
    replyTo: args.email,
    subject: `To deliver by hand: ${args.itemName} for ${args.email}`,
    text: `${money(args.amount, args.currency)} for ${args.itemName}\nFrom: ${
      args.email
    }\nWhop payment: ${
      args.paymentId
    }\n\nNothing delivers this automatically. The purchase is recorded as pending: send it to them, then mark it sent.\n\nReply to this email to reach them.`,
  })
}

import Link from 'next/link'

import {
  COMPANY,
  DocLink,
  EmailLink,
  SITE_HOST,
  Section,
  Todo,
} from '@/components/legal/primitives'

/* Adapted from General Legal's Privacy Policy (U.S. Only) (legal-templates/
   templates/privacy-policy-us). Categories the site never collects
   (government ids, demographics, precise location, social logins, contests,
   AI chat) are left out. Every service named here is one the code calls:
   Creem and Whop for payments, Cal.com for booking, GitHub for repository
   invites, Resend for email, Cloudflare Turnstile on forms, Vercel for
   hosting and analytics, and Supabase-hosted Postgres behind Payload CMS. */

/* What each line collects beyond the shared categories. */
const LINE_DATA = {
  warekit: (
    <>
      <li>
        <strong>GitHub data</strong>, such as the GitHub username you confirm
        after purchase and the usernames of developers you add to a Team
        license, so we can send repository invitations.
      </li>
      <li>
        <strong>License data</strong>, such as your license key, edition, the
        developers it covers, and the NetSuite account identifiers a deployed
        kit reports to our license service, with the times each account was
        first and last seen.
      </li>
    </>
  ),
  services: (
    <li>
      <strong>Booking and engagement data</strong>, such as the time you book
      through Cal.com, anything you write in the booking form, and the
      information you share about your business and systems before or during an
      engagement.
    </li>
  ),
  products: (
    <li>
      <strong>Order data from Creem</strong>, such as the email address the
      product was delivered to. Interactive tools on the Site, such as the
      contract red flags scorer, keep your marks in your browser; nothing you
      mark is saved or sent to us.
    </li>
  ),
}

const LINE_PROVIDERS = {
  warekit:
    'GitHub, to send and remove private repository invitations, and Creem, which also activates license keys for reported NetSuite accounts',
  services:
    'Cal.com, to schedule intro calls and, where a service uses it, take the booking payment',
  products: 'Creem, which delivers the file you buy',
}

function CcpaTable({ set }) {
  const rows = [
    [
      'Contact data',
      'Identifiers',
      'Service delivery, communications, compliance',
      'Service providers (email, hosting, payments)',
      'None',
    ],
    [
      'Transactional and payment data',
      'Commercial information; identifiers',
      'Fulfilling orders, refunds, accounting, fraud prevention',
      'Payment processors (Creem, Whop); professional advisors',
      'None',
    ],
    [
      'Communications data',
      'Identifiers; commercial information',
      'Support, responding to requests',
      'Service providers (email, hosting)',
      'None',
    ],
    ...(set.key === 'warekit'
      ? [
          [
            'GitHub and license data',
            'Identifiers; internet or other electronic network activity',
            'Delivering kit code, counting accounts against license limits',
            'GitHub; Creem',
            'None',
          ],
        ]
      : []),
    ...(set.key === 'services'
      ? [
          [
            'Booking and engagement data',
            'Identifiers; professional or employment-related information',
            'Scheduling, delivering the engagement',
            'Cal.com',
            'None',
          ],
        ]
      : []),
    [
      'Device and online activity data',
      'Internet or other electronic network activity',
      'Analytics, Site improvement, measuring checkout funnels, security',
      'Vercel; Whop; Cloudflare',
      <Todo key="sold">
        confirm whether the Whop pixel counts as “sharing” for targeted
        advertising
      </Todo>,
    ],
  ]
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm text-zinc-700 dark:text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-700">
            {[
              'Personal information we collect',
              'CCPA statutory category',
              'Purposes',
              'Third parties we disclose it to for a business purpose',
              'Third parties we “sell” or “share” it with',
            ].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="py-2 pr-4 align-bottom font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[0]}
              className="border-b border-zinc-200 dark:border-zinc-800"
            >
              {row.map((cell, index) => (
                <td key={index} className="py-2 pr-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PrivacyPolicy({ set }) {
  return (
    <>
      <p>
        <Todo>
          this is the U.S.-only template. If {set.name.toLowerCase()} are sold
          to buyers in the EEA or UK, switch to the template’s GDPR-enhanced
          version.
        </Todo>
      </p>
      <p>
        <strong>California Notice at Collection / State Privacy Rights:</strong>{' '}
        see the <a href="#state-rights">State privacy rights notice</a> below
        for important information about your rights under applicable state
        privacy laws.
      </p>
      <p>
        {COMPANY} (“<strong>AMWARE</strong>,” “<strong>we</strong>,” “
        <strong>us</strong>” or “<strong>our</strong>”) provides {set.offering}.
        This Privacy Policy describes how we process personal information that
        we collect through {SITE_HOST}, our checkouts, bookings and emails, and
        the other activities described below (collectively, the “
        <strong>Service</strong>”).
      </p>

      <Section id="collect" title="Personal information we collect">
        <p>
          <strong>Information you provide to us.</strong> Personal information
          you may provide to us through the Service includes:
        </p>
        <ul>
          <li>
            <strong>Contact data</strong>, such as your name and email address,
            when you send the contact form, join a waitlist or buy something.
          </li>
          <li>
            <strong>Communications data</strong>, based on our exchanges with
            you, including when you contact us through the Service or by email.
          </li>
          <li>
            <strong>Transactional data</strong>, such as the item you bought,
            order and payment references, amount, currency and order status.
          </li>
          <li>
            <strong>Payment data.</strong> Payment card details are collected
            and processed directly by our payment processors. We do not receive
            or store your card number.
          </li>
          {LINE_DATA[set.key]}
        </ul>
        <p>
          <strong>Third-party sources.</strong> We receive personal information
          from the payment, booking and code-hosting services you use with us
          (such as Creem, Whop, Cal.com and GitHub), for example the email
          address and order details from a completed checkout.
        </p>
        <p>
          <strong>Automatic data collection.</strong> We and our service
          providers automatically log information about you, your device and
          your interaction with the Service, such as:
        </p>
        <ul>
          <li>
            <strong>Device data</strong>, such as browser type, operating
            system, device type, IP address and general location (such as
            country).
          </li>
          <li>
            <strong>Online activity data</strong>, such as pages viewed, the
            page that referred you, page performance, and steps you take in a
            checkout.
          </li>
        </ul>
      </Section>

      <Section id="tracking" title="Tracking and other technologies">
        <p>
          The Service uses the following technologies to collect information
          automatically:
        </p>
        <ul>
          <li>
            <strong>Vercel Analytics and Speed Insights</strong>, to count page
            views and measure page performance.
          </li>
          <li>
            <strong>The Whop pixel</strong>, to record page views and checkout
            funnel events, such as viewing a product or starting a checkout.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> on our forms, to tell people
            from automated abuse.
          </li>
          <li>
            <strong>Embedded checkouts and booking widgets</strong>, such as
            Cal.com’s scheduler and Creem’s and Whop’s checkouts, which run
            their providers’ own code on the page while you use them.
          </li>
        </ul>
        <p>
          The Whop pixel and Vercel Analytics are switched off on license pages
          (addresses under /access), and the signed parts of order-confirmation
          addresses are removed before Vercel Analytics sees them.{' '}
          <Todo>
            Speed Insights still runs on license pages and may report their
            addresses; gate it like Analytics, or say so here.
          </Todo>{' '}
          <Todo>
            confirm which of these set cookies (including the Cal.com embed),
            and add a cookie notice (the legal-templates library has one) if any
            are non-essential.
          </Todo>
        </p>
      </Section>

      <Section id="use" title="How we use your personal information">
        <p>
          We may use your personal information for the following purposes or as
          otherwise described at the time of collection:
        </p>
        <p>
          <strong>Service delivery and operations</strong>, to provide the
          Service; process and fulfil your orders; deliver what you bought;
          communicate with you about the Service, including order, access and
          security messages; and respond to your requests, questions and
          feedback.
        </p>
        <p>
          <strong>Service improvement and analytics</strong>, to understand
          which pages are most and least visited, how visitors move through the
          Service and its checkouts, and how the Service performs, and to
          develop new products and services.
        </p>
        <p>
          <strong>Marketing</strong>, to tell you when something you asked to
          hear about, such as an edition on a waitlist, becomes available. You
          can opt out as described under Your choices.
        </p>
        <p>
          <strong>Compliance and protection</strong>, to comply with applicable
          laws, lawful requests and legal process; protect our, your or others’
          rights, privacy, safety or property (including by making and defending
          legal claims); keep accounting and tax records; enforce the terms that
          govern the Service; and prevent, identify, investigate and deter
          fraudulent, harmful, unauthorized or illegal activity.
        </p>
        <p>
          <strong>Aggregated and de-identified data.</strong> We may create
          aggregated, de-identified or anonymized data from your personal
          information by removing what makes it identifiable to you, and use it
          for our lawful business purposes. We will not attempt to reidentify
          such data.
        </p>
      </Section>

      <Section id="retention" title="Retention">
        <p>
          We generally retain personal information to fulfil the purposes for
          which we collected it, including to satisfy legal, accounting or
          reporting requirements, to establish or defend legal claims, or for
          fraud prevention. To determine the appropriate retention period, we
          may consider the amount, nature and sensitivity of the personal
          information, the potential risk of harm from unauthorized use or
          disclosure, the purposes for which we process it, and applicable legal
          requirements. When we no longer require the personal information, we
          may delete it, anonymize it, or isolate it from further processing.
        </p>
      </Section>

      <Section id="share" title="How we share your personal information">
        <p>
          We may share your personal information with the following parties (or
          as otherwise described in this Privacy Policy or at the time of
          collection):
        </p>
        <ul>
          <li>
            <strong>Service providers</strong> that help us operate the Service:
            Vercel (hosting and analytics), Supabase (database hosting), Resend
            (email delivery), Cloudflare (form protection), and{' '}
            {LINE_PROVIDERS[set.key]}.
          </li>
          <li>
            <strong>Payment processors.</strong> Payments are collected and
            processed directly by Creem and Whop, which use your payment data
            under their own privacy policies.
          </li>
          <li>
            <strong>Professional advisors</strong>, such as lawyers,
            accountants, bankers and insurers, in the course of the professional
            services they render to us.
          </li>
          <li>
            <strong>Authorities and others</strong>, such as law enforcement,
            government authorities and private parties, as we believe in good
            faith to be necessary or appropriate for the compliance and
            protection purposes described above.
          </li>
          <li>
            <strong>Business transferees</strong>, in the context of an actual
            or prospective business transaction, such as an investment in,
            financing of, or sale, transfer or merger of all or part of{' '}
            {COMPANY}’s business or assets, including in an insolvency,
            bankruptcy or receivership.
          </li>
        </ul>
      </Section>

      <Section id="choices" title="Your choices">
        <p>
          <strong>Opt out of communications.</strong> You may opt out of
          marketing emails, such as waitlist announcements, by contacting us.
          You may continue to receive service emails, such as order and access
          messages.
        </p>
        <p>
          <strong>Blocking images and scripts.</strong> Most browsers let you
          block images, scripts and cookies through their settings.
        </p>
        <p>
          <strong>Do Not Track.</strong> Some browsers send “Do Not Track”
          signals. We currently do not respond to them.
        </p>
        <p>
          <strong>Declining to provide information.</strong> We need certain
          personal information to provide the Service, for example an email
          address to deliver a purchase. If you do not provide it, we may not be
          able to provide that part of the Service.
        </p>
      </Section>

      <Section id="other-sites" title="Other sites and services">
        <p>
          The Service links to and embeds services operated by third parties,
          such as checkouts and booking widgets. We do not control them and are
          not responsible for their actions. We encourage you to read their
          privacy policies.
        </p>
      </Section>

      <Section id="security" title="Security">
        <p>
          We employ technical, organizational and physical safeguards designed
          to protect the personal information we collect. However, security risk
          is inherent in all internet and information technologies, and we
          cannot guarantee the security of your personal information.
        </p>
      </Section>

      <Section id="transfer" title="International data transfer">
        <p>
          We are headquartered in the United States and may use service
          providers that operate in other countries. Your personal information
          may be transferred to the United States or other locations where
          privacy laws may not be as protective as those in your state, province
          or country.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          The Service is not intended for anyone under 18 years of age. If you
          are a parent or guardian of a child from whom you believe we have
          collected personal information in a manner prohibited by law, please
          contact us. If we learn that we have collected personal information
          from a child without the consent required by law, we will comply with
          applicable legal requirements to delete it.
        </p>
      </Section>

      <Section id="changes" title="Changes to this Privacy Policy">
        <p>
          We may modify this Privacy Policy at any time. If we make material
          changes, we will update the date at the top of this page and post it
          on the Service or notify you by other appropriate means. Changes take
          effect when posted (or as otherwise indicated). Your use of the
          Service after the effective date means you acknowledge that the
          modified Privacy Policy applies to your interactions with the Service
          and our business.
        </p>
      </Section>

      <Section id="contact" title="How to contact us">
        <p>
          If you have questions about our practices, or would like to exercise a
          privacy right that may be available to you, contact us:
        </p>
        <ul>
          <li>
            <strong>Email:</strong> <EmailLink />
          </li>
          <li>
            <strong>Mail:</strong> <Todo>business mailing address</Todo>
          </li>
          <li>
            <strong>Form:</strong> <Link href="/contact">contact form</Link>
          </li>
        </ul>
      </Section>

      <Section id="state-rights" title="State privacy rights notice">
        <p>
          Except as otherwise provided, this section applies to residents of
          U.S. states to the extent they have privacy laws applicable to us that
          grant their residents the rights described below (the “
          <strong>State Privacy Laws</strong>”). Not all rights listed below are
          afforded to all residents, and we may not be able to process your
          request if you do not give us enough detail to confirm your identity
          and understand it.{' '}
          <Todo>describe how a request’s identity is verified.</Todo>
        </p>
        <p>
          For purposes of this section, “<strong>Personal Information</strong>”
          and “<strong>Sensitive Personal Information</strong>” have the
          meanings given to the equivalent terms in the State Privacy Laws,
          excluding information exempted from their scope.
        </p>
        <p>
          <strong>Your privacy rights.</strong> The State Privacy Laws may give
          residents some or all of the rights below. These rights are not
          absolute, and we may decline a request where the law permits.
        </p>
        <ul>
          <li>
            <strong>Information.</strong> You can request the categories of
            Personal Information we have collected, their sources, our business
            or commercial purposes for collecting it, the categories of third
            parties we share it with, and the categories we disclosed for a
            business purpose and to whom.
          </li>
          <li>
            <strong>Access.</strong> You can request a copy of the Personal
            Information we have collected about you.
          </li>
          <li>
            <strong>Correction.</strong> You can ask us to correct inaccurate
            Personal Information we have collected about you.
          </li>
          <li>
            <strong>Deletion.</strong> You can ask us to delete the Personal
            Information we have collected from you.
          </li>
          <li>
            <strong>Appeal.</strong> You can appeal our denial of any request
            validly submitted.
          </li>
        </ul>
        <p>
          <strong>Opt-outs.</strong>
        </p>
        <ul>
          <li>
            <strong>Targeted advertising.</strong>{' '}
            <Todo>
              state whether the Whop pixel’s funnel events are processing for
              targeted advertising, and if so how to opt out.
            </Todo>
          </li>
          <li>
            <strong>Profiling and automated decision-making.</strong> We do not
            use your Personal Information for profiling or automated
            decision-making that results in significant financial impacts,
            significant impacts on housing, education, employment, health care
            or criminal justice, or similarly significant impacts.
          </li>
          <li>
            <strong>Sales.</strong> We do not sell your Personal Information for
            money.
          </li>
          <li>
            <strong>Consumers under 16.</strong> We do not have actual knowledge
            that we collect, sell or share the Personal Information of consumers
            under 16 years of age.
          </li>
          <li>
            <strong>Sensitive Personal Information.</strong> We do not
            intentionally collect or process Sensitive Personal Information.
          </li>
        </ul>
        <p>
          <strong>Opt-out preference signals.</strong>{' '}
          <Todo>
            the site does not read Global Privacy Control signals today. Either
            honor GPC before publishing or say so here.
          </Todo>
        </p>
        <p>
          <strong>Nondiscrimination.</strong> You are entitled to exercise these
          rights free from discrimination as prohibited by the State Privacy
          Laws.
        </p>
        <p>
          <strong>Exercising your rights.</strong> Email <EmailLink /> with the
          right you want to exercise. Under some State Privacy Laws you may use
          an authorized agent to make a request on your behalf. We may need to
          verify the agent’s identity and authority, and may ask for a valid
          power of attorney or your signed permission, and ask you to verify
          your own identity directly.
        </p>
        <p>
          <strong>Information practices.</strong> The following describes our
          practices currently and during the past 12 months. We collect the
          categories of personal information from the sources, and use them for
          the purposes, described above. We decide how long to keep personal
          information based on whether the period is sufficient to fulfil the
          purposes for which we collected it, including complying with our legal
          obligations. We do not attempt to reidentify deidentified information,
          except to test whether our deidentification processes comply with
          applicable law.
        </p>
        <p>
          <strong>Personal information we collect, use and disclose.</strong>{' '}
          The chart below maps the categories above to the categories in the
          CCPA (Cal. Civ. Code §1798.140). Information you volunteer in a
          free-form field, such as a contact message, may contain other
          categories not listed.
        </p>
        <CcpaTable set={set} />
        <p>
          <strong>Shine the Light.</strong> Under California Civil Code Section
          1798.83, California residents who have a business relationship with us
          primarily for personal, family or household purposes may ask for the
          names of third parties to which we disclosed certain personal
          information during the preceding calendar year for their own direct
          marketing purposes, and the categories disclosed. Send requests to{' '}
          <EmailLink /> with the statement “Shine the Light Request,” your first
          and last name and mailing address, and a certification that you are a
          California resident.
        </p>
        <p>
          <strong>Nevada.</strong> Nevada residents have the right to opt out of
          the sale of certain personal information for monetary consideration.
          We do not currently engage in such sales; to opt out of any potential
          future sales, email <EmailLink />.
        </p>
        <p>
          See also the{' '}
          <DocLink set={set} doc="terms">
            {set.name} terms of service
          </DocLink>
          .
        </p>
      </Section>
    </>
  )
}

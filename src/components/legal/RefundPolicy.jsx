import {
  DocLink,
  EmailLink,
  Section,
  Todo,
} from '@/components/legal/primitives'

/* The legal-templates library has no refund template, so these are drafted
   from the refund promises the site already makes, word for word where it
   makes one: REFUND_NOTE in content/site/warekit.js for kits, and the line
   under every deposit in components/commerce/DepositRiskReversal.jsx and
   the deposit FAQ in components/landing/pricing.jsx for services. Digital
   products make no promise yet, so their window is open. */

function WareKitRefunds() {
  return (
    <>
      <Section id="window" title="The refund window">
        <p>
          <strong>
            Full refund within 14 days if you haven’t accepted the GitHub
            invite.
          </strong>{' '}
          The 14 days run from the date of purchase. Once you have accepted the
          repository invitation you have received the kit’s code, and this
          promise no longer applies; nothing here limits a refund the law
          requires.{' '}
          <Todo>
            decide whether any refund is offered after the invite is accepted,
            and state it here.
          </Todo>{' '}
          <Todo>
            confirm the 14 days run from purchase, and whether a kit that does
            not work as described can still be refunded after the invite is
            accepted.
          </Todo>
        </p>
        <p>Free Lite editions cost nothing, so there is nothing to refund.</p>
      </Section>

      <Section id="request" title="How to ask for a refund">
        <p>
          Email <EmailLink /> from the address you used at checkout, with your
          order reference. Refunds are paid through the processor that took the
          payment (Creem, or Whop for earlier purchases) to the original payment
          method. <Todo>state how long a refund takes to reach the buyer.</Todo>
        </p>
      </Section>

      <Section id="after" title="What a refund changes">
        <ul>
          <li>
            We may remove the repository access the refunded license created,
            including access for developers you added, unless another paid
            license still covers them.
          </li>
          <li>
            The license moves back down: a license that began as a free Lite
            claim returns to Lite, and a refunded paid license no longer covers
            new NetSuite accounts.
          </li>
          <li>A partial refund leaves your edition as it is.</li>
        </ul>
      </Section>

      <Section id="upgrades" title="Upgrades">
        <p>
          An upgrade from Pro to Team charges only the difference. If you are
          refunded for an upgrade, your license returns to Pro.{' '}
          <Todo>
            confirm the upgrade refund rule, including when the Pro invite was
            accepted but the Team seats were not used.
          </Todo>
        </p>
      </Section>
    </>
  )
}

function ServicesRefunds() {
  return (
    <>
      <Section id="deposits" title="Reservation deposits">
        <p>
          <strong>Full refund if we don’t work together.</strong> The deposit
          holds your start. After the intro call, it is either credited in full
          to month one or returned before work begins. It is a start date, not
          an extra cost.{' '}
          <Todo>
            confirm who decides “we don’t work together” and by when (for
            example, within a set number of days of the intro call), and what
            happens if the intro call is never booked.
          </Todo>
        </p>
      </Section>

      <Section id="request" title="How to ask for a refund">
        <p>
          Email <EmailLink /> from the address you paid with, with your deposit
          or order reference. Refunds are paid through the processor that took
          the payment (Whop, Cal.com’s booking payment, or Creem) to the
          original payment method.{' '}
          <Todo>state how long a refund takes to reach the client.</Todo>
        </p>
      </Section>

      <Section id="engagements" title="Monthly fees and fixed-price packages">
        <p>
          Refunds for monthly fees, fixed-price packages and work already
          delivered follow the written agreement for the engagement.{' '}
          <Todo>
            set the refund and cancellation terms for monthly fees and
            fixed-price packages (notice period, unused time, work in progress).
          </Todo>{' '}
          <Todo>
            the Creem webhook handles subscriptions; if retainers renew
            automatically, state the billing cycle, how to cancel and when a
            cancellation takes effect.
          </Todo>
        </p>
      </Section>
    </>
  )
}

function ProductRefunds() {
  return (
    <>
      <Section id="window" title="The refund window">
        <p>
          <Todo>
            no refund promise is published for digital products yet. Set the
            window (for example, a number of days from purchase) and any
            conditions, then state it here and beside the buy button.
          </Todo>
        </p>
        <p>Free products cost nothing, so there is nothing to refund.</p>
      </Section>

      <Section id="request" title="How to ask for a refund">
        <p>
          Email <EmailLink /> from the address the product was delivered to,
          with your order reference. Refunds are paid through Creem to the
          original payment method.{' '}
          <Todo>state how long a refund takes to reach the buyer.</Todo>
        </p>
      </Section>

      <Section id="after" title="After a refund">
        <p>
          A refunded product is no longer licensed to you. Please delete any
          copies you downloaded.
        </p>
      </Section>
    </>
  )
}

const REFUNDS = {
  warekit: WareKitRefunds,
  services: ServicesRefunds,
  products: ProductRefunds,
}

export function RefundPolicy({ set }) {
  const Refunds = REFUNDS[set.key]
  return (
    <>
      <p>
        <Todo>
          the legal-templates library has no refund template. This policy is
          drafted from the refund terms already on the site; have it reviewed
          before relying on it.
        </Todo>
      </p>
      <p>
        This policy explains when you can get your money back for {set.offering}{' '}
        bought from us. It is part of the{' '}
        <DocLink set={set} doc="terms">
          {set.name} terms of service
        </DocLink>
        . Nothing in it limits a right to a refund that the law gives you.
      </p>

      <Refunds />

      <Section id="chargebacks" title="Disputes and chargebacks">
        <p>
          If something has gone wrong, please contact us before opening a
          dispute with your bank or card issuer, so we can put it right. We
          review every disputed payment. If a dispute ends with your payment
          returned to you, it is treated as a refund under this policy.{' '}
          <Todo>confirm how disputes are handled for each processor.</Todo>
        </p>
      </Section>

      <Section id="contact" title="Questions">
        <p>
          Email <EmailLink /> with any question about a payment or refund.
        </p>
      </Section>
    </>
  )
}

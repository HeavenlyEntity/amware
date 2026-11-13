import Link from 'next/link'

import {
  COMPANY,
  DocLink,
  EmailLink,
  SITE_HOST,
  Section,
  Todo,
} from '@/components/legal/primitives'

/* Adapted from General Legal's Website Terms of Use (legal-templates/
   templates/terms-of-use), Option A (JAMS) arbitration. The site has no
   user accounts, so the template's account section became private links.
   Each line adds its own purchase section; everything else is shared. */

function WareKitPurchaseTerms({ set }) {
  return (
    <Section id="purchases" title="WareKit kits, licenses and delivery">
      <p>
        <strong>Editions.</strong> WareKit kits are sold in editions. Lite
        editions are free. Pro and Team editions are paid. Team editions license
        the code for five developers, not NetSuite users. An edition shown as
        planned or not on sale has no checkout and cannot be bought.
      </p>
      <p>
        <strong>Prices and payment.</strong> Prices are in USD and charged once.
        Payments are processed by Creem, and Creem’s own terms and privacy
        policy apply to the payment. Some earlier purchases were processed by
        Whop, whose terms applied to those payments.{' '}
        <Todo>
          confirm how Creem is described here (merchant of record, or payment
          processor only) and match the pricing page footnote.
        </Todo>
      </p>
      <p>
        <strong>Delivery.</strong> Kit code is delivered as an invitation to a
        private GitHub repository. You confirm a GitHub account after payment
        and the invitation is sent to that account. On a Team edition you can
        add developers after purchase, up to the edition’s limit, and each one
        receives their own invitation.
      </p>
      <p>
        <strong>License.</strong> Your use of a kit’s code is governed by the
        license that ships with it, in addition to these Terms. If the two
        conflict, the kit license controls for the code.{' '}
        <Todo>
          link the WareKit license text here and confirm what it allows
          (commercial use, number of projects, redistribution).
        </Todo>
      </p>
      <p>
        <strong>License reporting.</strong> A deployed kit reports the NetSuite
        account it runs on to our license service, so accounts can be counted
        against your edition’s limits. Your app never checks a license, and
        nothing stops working if you go over a limit; an account over the limit
        is recorded and you may be contacted about it.
      </p>
      <p>
        <strong>Upgrades.</strong> If you hold Pro, you can move to Team later
        and pay only the difference.
      </p>
      <p>
        <strong>Refunds.</strong> Refunds are covered by the{' '}
        <DocLink set={set} doc="refund">
          WareKit refund policy
        </DocLink>
        . After a refund we may remove the repository access the refunded
        license created.
      </p>
      <p>
        <strong>Support.</strong>{' '}
        <Todo>
          state what support, updates and maintenance a paid kit includes, and
          for how long.
        </Todo>
      </p>
    </Section>
  )
}

function ServicesEngagementTerms({ set }) {
  return (
    <Section id="engagements" title="Engagements, deposits and intro calls">
      <p>
        <strong>Deposits.</strong> The Codebase Diagnostic takes a deposit after
        the strategy call. Some services without a booking link can also be
        reserved with a deposit, which holds your start and is credited in full
        against your first month. Deposits are taken through Whop, or through
        the payment step of the Cal.com booking widget where a service uses one,
        and that provider’s terms apply to the payment.
      </p>
      <p>
        <strong>Free calls.</strong> Engagements start with two free calls
        scheduled through Cal.com: a 15-minute intro call, then a 45-minute
        strategy call. You leave knowing your highest-priority technical risk
        and the next move we recommend. Scope is agreed before any work starts.
      </p>
      <p>
        <strong>Fixed-price packages and quotes.</strong> Some fixed-price
        packages are paid through Creem. Anything else is quoted to you before
        any work starts.{' '}
        <Todo>
          if any service is billed as a recurring Creem subscription, disclose
          the renewal cycle, price, how to cancel and the cancellation notice
          here, as auto-renewal laws require.
        </Todo>
      </p>
      <p>
        <strong>The engagement agreement.</strong> The scope, fees, schedule,
        deliverables, ownership of work product and confidentiality of an
        engagement are set in a separate written agreement or statement of work
        between you and {COMPANY}. If that agreement conflicts with these Terms,
        that agreement controls.{' '}
        <Todo>
          confirm the agreement used for engagements (the legal-templates
          library has a Master Services Agreement) and link it or its summary
          here.
        </Todo>
      </p>
      <p>
        <strong>Professional judgment.</strong> Advice given during a call or an
        engagement is professional judgment based on what you share. Decisions
        about your business, and their results, remain yours.
      </p>
      <p>
        <strong>Refunds.</strong> Deposits and other service payments are
        covered by the{' '}
        <DocLink set={set} doc="refund">
          services refund policy
        </DocLink>
        .
      </p>
    </Section>
  )
}

function ProductsPurchaseTerms({ set }) {
  return (
    <Section id="purchases" title="Digital products">
      <p>
        <strong>Prices and payment.</strong> Digital products are priced in USD.
        Payments are processed by Creem, and Creem’s own terms and privacy
        policy apply to the payment. Some products are free.
      </p>
      <p>
        <strong>Delivery.</strong> After payment, Creem delivers the product’s
        file to the email address you used at checkout.
      </p>
      <p>
        <strong>Your use.</strong> You may use a product for your own personal
        or internal business purposes. You may not resell, share, publish or
        redistribute it, in whole or in part.{' '}
        <Todo>
          confirm these usage rights, including whether a team may share one
          copy.
        </Todo>
      </p>
      <p>
        <strong>Not professional advice.</strong> Guides and checklists are
        general information. They are not legal, financial or other professional
        advice for your situation, and using one does not create a client
        relationship with {COMPANY}. Have a qualified professional review
        anything you intend to sign or rely on.
      </p>
      <p>
        <strong>Refunds.</strong> Refunds are covered by the{' '}
        <DocLink set={set} doc="refund">
          digital products refund policy
        </DocLink>
        .
      </p>
    </Section>
  )
}

const PURCHASE_TERMS = {
  warekit: WareKitPurchaseTerms,
  services: ServicesEngagementTerms,
  products: ProductsPurchaseTerms,
}

export function TermsOfService({ set }) {
  const PurchaseTerms = PURCHASE_TERMS[set.key]
  return (
    <>
      <p>
        The website located at {SITE_HOST} (the “<strong>Site</strong>”) is
        owned and operated by {COMPANY} (“<strong>Company</strong>,” “
        <strong>us</strong>,” “<strong>our</strong>,” or “<strong>we</strong>
        ”). These Terms of Service (“<strong>Terms</strong>”) govern your use of
        the Site and your purchase and use of our {set.offering}. Certain
        features of the Site may be subject to additional guidelines or rules
        posted on the Site, which are incorporated by reference into these
        Terms.
      </p>
      <p>
        By accessing or using the Site, by making a purchase, or by clicking “I
        agree” (or a similar button or checkbox) when that option is presented
        to you, you agree to these Terms on behalf of yourself or the entity you
        represent, and you confirm that you have the authority to do so. You
        must be at least 18 years old to use the Site. If you do not agree to
        these Terms, please do not use the Site.
      </p>
      <p>
        <strong>
          IMPORTANT: PLEASE READ THE{' '}
          <a href="#dispute-resolution">DISPUTE RESOLUTION</a> SECTION
          CAREFULLY.
        </strong>{' '}
        It contains an agreement to resolve disputes through binding individual
        arbitration instead of in court, and includes a waiver of class action
        rights and jury trial rights. You have 30 days to opt out of the
        arbitration agreement, as described in that section.
      </p>

      <Section id="private-links" title="Private links">
        <p>
          The Site does not offer user accounts. Some pages, such as a license
          or order page, are reached through a private link we email you. Treat
          that link like a password: anyone who has it can see the page. You are
          responsible for keeping it confidential. If you believe someone else
          has your link, contact us right away.
        </p>
      </Section>

      <Section id="access" title="Access to the Site">
        <p>
          <strong>License.</strong> Subject to these Terms, we grant you a
          limited, non-exclusive, non-transferable, revocable license to access
          and use the Site. Products you buy are licensed as described in the
          purchase section of these Terms.
        </p>
        <p>
          <strong>Restrictions.</strong> You may not: (i) license, sell, rent,
          lease, transfer, assign, distribute, or commercially exploit the Site
          or any content on it; (ii) modify, create derivative works from,
          disassemble, reverse-compile, or reverse-engineer any part of the
          Site; (iii) access the Site in order to build a similar or competing
          product or service; or (iv) copy, reproduce, distribute, republish,
          download, display, post, or transmit any part of the Site except as
          expressly permitted by these Terms. All copyright and proprietary
          notices on the Site must be kept intact on any copies you are
          permitted to make.
        </p>
        <p>
          <strong>Changes to the Site.</strong> We may modify, suspend, or
          discontinue the Site (or any part of it) at any time, with or without
          notice. We are not liable to you or any third party for any such
          modification, suspension, or discontinuation.
        </p>
        <p>
          <strong>Ownership.</strong> All intellectual property rights in the
          Site and its content, including copyrights, patents, trademarks, and
          trade secrets, belong to Company or its suppliers. These Terms do not
          transfer any ownership rights to you, except for the limited rights
          expressly granted in them. All rights not expressly granted are
          reserved.
        </p>
        <p>
          <strong>Feedback.</strong> If you share feedback or suggestions with
          us, you grant us a perpetual, irrevocable, worldwide, non-exclusive,
          fully-paid, royalty-free license to use that feedback freely, in any
          manner and for any purpose, without attribution. Please do not submit
          any feedback that you consider proprietary or confidential.
        </p>
      </Section>

      <PurchaseTerms set={set} />

      <Section id="privacy" title="Privacy">
        <p>
          Your use of the Site is also governed by our{' '}
          <DocLink set={set} doc="privacy">
            Privacy Policy
          </DocLink>
          , which is incorporated into these Terms by reference. It describes
          the personal information we collect, how we use it, and the
          circumstances under which we share it. If there is a conflict between
          these Terms and the Privacy Policy about personal information, the
          Privacy Policy controls.
        </p>
        <p>
          <strong>Cookies and tracking technologies.</strong> The Site uses
          analytics and a conversion pixel to understand how it is used. The
          Privacy Policy lists them and explains your choices.
        </p>
      </Section>

      <Section id="indemnification" title="Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless Company and its
          officers, employees, and agents from any claims and reasonable costs
          or attorneys’ fees arising out of (i) your use of the Site, (ii) your
          violation of these Terms, or (iii) your violation of any applicable
          law or regulation. We may assume control of the defense of any such
          claim at your expense, and you agree to cooperate with our defense.
          You agree not to settle any such claim without our prior written
          consent. We will make reasonable efforts to notify you promptly of any
          claim we become aware of.
        </p>
      </Section>

      <Section id="third-parties" title="Third-party services">
        <p>
          The Site links to and relies on third-party services, including
          payment, booking and code-hosting providers such as Creem, Whop,
          Cal.com and GitHub (collectively, “
          <strong>Third-Party Services</strong>”). We do not control, endorse,
          or take responsibility for any Third-Party Services. You use them at
          your own risk, and the applicable third party’s own terms and privacy
          practices apply to that use.
        </p>
        <p>
          <strong>Release.</strong> To the fullest extent permitted by law, you
          release Company and its officers, employees, agents, successors, and
          assigns from all claims, demands, and damages of any kind arising out
          of or related to Third-Party Services. If you are a California
          resident, you waive California Civil Code Section 1542, which
          provides: “A general release does not extend to claims which the
          creditor or releasing party does not know or suspect to exist in his
          or her favor at the time of executing the release, which if known by
          him or her must have materially affected his or her settlement with
          the debtor or released party.”
        </p>
      </Section>

      <Section id="disclaimers" title="Disclaimers">
        <p>
          THE SITE AND EVERYTHING SOLD THROUGH IT ARE PROVIDED “AS IS” AND “AS
          AVAILABLE.” TO THE FULLEST EXTENT PERMITTED BY LAW, COMPANY AND ITS
          SUPPLIERS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE
          UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR HARMFUL CODE.
          WHERE APPLICABLE LAW REQUIRES WARRANTIES, THEY ARE LIMITED TO 90 DAYS
          FROM YOUR FIRST USE.
        </p>
      </Section>

      <Section id="liability" title="Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) COMPANY AND ITS SUPPLIERS
          WILL NOT BE LIABLE FOR ANY LOST PROFITS, LOST DATA, COSTS OF
          SUBSTITUTE PRODUCTS, OR ANY INDIRECT, CONSEQUENTIAL, INCIDENTAL,
          SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING FROM OR RELATED TO
          THESE TERMS OR YOUR USE OF (OR INABILITY TO USE) THE SITE OR ANYTHING
          SOLD THROUGH IT; AND (B) OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM
          ARISING UNDER THESE TERMS IS CAPPED AT THE GREATER OF (i) $50 USD AND
          (ii) THE AMOUNT PAID TO COMPANY BY YOU UNDER THESE TERMS IN THE SIX
          MONTHS PRIOR TO THE INCIDENT GIVING RISE TO THE CLAIM. THE EXISTENCE
          OF MULTIPLE CLAIMS DOES NOT INCREASE THIS CAP.
        </p>
      </Section>

      <Section id="termination" title="Term and termination">
        <p>
          These Terms remain in effect while you use the Site. We may suspend or
          terminate your access at any time and for any reason, including if we
          believe you have violated these Terms. We are not liable to you for
          any such termination. On termination, the restrictions, ownership and
          feedback provisions of the Access to the Site section, and every
          section from Privacy onward, survive.
        </p>
      </Section>

      <Section id="state-notices" title="State-specific legal notices">
        <p>
          The provisions in this section apply only to users to the extent they
          are subject to the laws of the states named below. If a provision in
          this section conflicts with another provision of these Terms, the
          state-specific provision controls for users subject to that state’s
          laws.
        </p>
        <p>
          <strong>California.</strong> If you are a California resident, you may
          report complaints to the Complaint Assistance Unit of the Division of
          Consumer Services of the California Department of Consumer Affairs, at
          1625 N. Market Blvd. Suite N112, Sacramento, CA 95834, or by phone at
          (800) 952-5210. Under California Civil Code Section 1789.3, California
          users of the Site are entitled to the following specific consumer
          rights notice: The provider of the Site is {COMPANY},{' '}
          <Todo>business mailing address</Todo>. To file a complaint regarding
          the Site, or to receive further information regarding use of the Site,
          send a letter to the above address or contact us at <EmailLink />.
          California residents may also have rights under the California
          Consumer Privacy Act (as amended by the California Privacy Rights
          Act), described in our{' '}
          <DocLink set={set} doc="privacy">
            Privacy Policy
          </DocLink>
          .
        </p>
        <p>
          <strong>Colorado.</strong> If you are a Colorado resident, you may
          have additional rights under the Colorado Privacy Act (CPA), including
          the right to opt out of the processing of your personal data for
          purposes of targeted advertising, the sale of personal data, and
          certain profiling. For details, please see our Privacy Policy.
        </p>
        <p>
          <strong>Connecticut.</strong> If you are a Connecticut resident, you
          may have additional rights under the Connecticut Data Privacy Act
          (CTDPA), including rights of access, correction, deletion, and data
          portability, as well as the right to opt out of the sale of personal
          data, targeted advertising, and profiling. For details, please see our
          Privacy Policy.
        </p>
        <p>
          <strong>Virginia.</strong> If you are a Virginia resident, you may
          have additional rights under the Virginia Consumer Data Protection Act
          (VCDPA), including the right to access, correct, delete, and obtain a
          copy of your personal data, and the right to opt out of the processing
          of your personal data for targeted advertising, sale, or profiling.
          For details, please see our Privacy Policy.
        </p>
        <p>
          <strong>Nevada.</strong> If you are a Nevada resident, you have the
          right under Nevada Revised Statutes Chapter 603A to direct us not to
          sell certain information we have collected or will collect about you.
          To exercise this right, please contact us at <EmailLink />.
        </p>
        <p>
          <strong>Other states.</strong>{' '}
          <Todo>
            review the other states with comprehensive privacy laws (Texas,
            Oregon, Montana, Utah, Iowa, Indiana, Tennessee and others) and add
            notices where they apply.
          </Todo>
        </p>
      </Section>

      <Section id="general" title="General">
        <p>
          <strong>Changes to Terms.</strong> We may update these Terms from time
          to time. If we make material changes, we may notify you by email (at
          the address you gave us) or by a prominent notice on the Site. Your
          continued use of the Site after notice of changes means you accept the
          updated Terms.
        </p>
        <p>
          <strong>Governing law.</strong> These Terms and any dispute arising
          out of or related to these Terms or the Site will be governed by and
          construed in accordance with the laws of the State of{' '}
          <Todo>governing-law state</Todo>, without regard to its
          conflict-of-law principles. For any claim or dispute not subject to
          the arbitration provisions below, you and Company irrevocably consent
          to the exclusive jurisdiction and venue of the state and federal
          courts located in <Todo>county and state for venue</Todo>.
          Notwithstanding the foregoing: (a) either party may bring an action in
          any court of competent jurisdiction for injunctive or other equitable
          relief to protect its intellectual property rights; and (b) either
          party may bring an individual action in small claims court for claims
          within that court’s jurisdictional limits.
        </p>
        <p>
          <strong>Export.</strong> You agree not to export, re-export, or
          transfer any technical data or products acquired from the Site in
          violation of U.S. export control laws or applicable regulations in
          other countries.
        </p>
        <p>
          <strong>Electronic communications.</strong> By using the Site, you
          consent to receiving communications from us electronically (by email
          or notices posted on the Site). These electronic communications
          satisfy any legal requirement for written notice.
        </p>
        <p>
          <strong>Accessibility.</strong> Company is committed to making the
          Site accessible to all users, including individuals with disabilities.
          We endeavor to conform to the Web Content Accessibility Guidelines
          (WCAG) 2.1, Level AA. If you experience any difficulty accessing or
          navigating the Site, or have suggestions for improving accessibility,
          please contact us at <EmailLink />. We will make reasonable efforts to
          address accessibility concerns promptly.
        </p>
        <p>
          <strong>Entire agreement.</strong> These Terms (together with the
          Privacy Policy, the Refund Policy and any other policies referenced in
          them) are the entire agreement between you and Company regarding your
          use of the Site, except where a separate written agreement signed by
          both parties applies. If any provision of these Terms is found to be
          invalid or unenforceable, it will be modified to the minimum extent
          necessary to be valid, and the remaining provisions will continue in
          effect. Our failure to enforce any provision is not a waiver of that
          provision. The word “including” means “including without limitation.”
          You may not assign these Terms without our prior written consent; we
          may assign them freely. These Terms bind any permitted assignees.
        </p>
        <p>
          <strong>Copyright and trademarks.</strong> Copyright ©{' '}
          {new Date().getFullYear()} {COMPANY}. All rights reserved. All
          trademarks, logos, and service marks displayed on the Site are owned
          by Company or third parties. You may not use any of them without prior
          written consent from the owner.
        </p>
        <p>
          <strong>Contact.</strong> Email <EmailLink /> or use the{' '}
          <Link href="/contact">contact form</Link>.
        </p>
      </Section>

      <Section id="dispute-resolution" title="Dispute resolution">
        <p>
          <Todo>
            confirm JAMS arbitration (the template’s Option A, used here) over
            DecisionLayer AI-assisted arbitration (Option B), and that
            arbitration suits {set.name.toLowerCase()} buyers at all.
          </Todo>
        </p>
        <p>
          <strong>
            Please read this section carefully. It affects your legal rights,
            including your right to sue in court and your right to a jury trial.
          </strong>
        </p>
        <p>
          <strong>Applicability.</strong> Except as described below, you and
          Company agree to resolve all disputes arising out of or relating to
          the Site, anything sold through it, or these Terms through binding
          individual arbitration, not in court. Exceptions include: (i) claims
          that qualify for small claims court, brought on an individual basis;
          and (ii) requests for equitable relief related to intellectual
          property (such as trademarks, trade secrets, or copyrights). This
          arbitration agreement applies to all claims, including those that
          arose before you agreed to these Terms.
        </p>
        <p>
          <strong>Try to resolve first.</strong> Before starting arbitration,
          the parties agree to try to resolve the dispute informally. The party
          raising the dispute must send written notice (an “Informal Notice”) to
          the other party. Within 45 days of receiving that Informal Notice, the
          parties will meet by phone or video in good faith to try to work
          things out. Company’s notice address: <EmailLink /> or{' '}
          <Todo>business mailing address</Todo>. If the informal dispute
          resolution process doesn’t resolve the dispute within 60 days, either
          party may start arbitration.
        </p>
        <p>
          <strong>Arbitration rules.</strong> Arbitrations will be administered
          by JAMS (www.jamsadr.com). Claims under $250,000 (excluding fees and
          interest) will use JAMS’ Streamlined Arbitration Rules; larger claims
          will use JAMS’ Comprehensive Arbitration Rules. Unless the parties
          agree otherwise, arbitration will be conducted in the county where you
          live. All arbitration materials and documents are confidential.
        </p>
        <p>
          The arbitration request must include: (i) your contact information;
          (ii) a description of the claims and supporting facts; (iii) the
          relief you’re seeking and a good-faith damages estimate; (iv)
          confirmation that you completed the informal resolution process; and
          (v) proof of any required filing fee payment.
        </p>
        <p>
          <strong>Authority of arbitrator.</strong> The arbitrator has authority
          to resolve all arbitrable disputes, including questions about the
          scope and enforceability of this arbitration agreement, except that
          courts (not arbitrators) will decide: (i) challenges to the class
          action waiver below; (ii) disputes about arbitration fees; (iii)
          whether a condition precedent to arbitration has been satisfied; and
          (iv) which version of this agreement applies. The arbitrator may award
          the same relief as a court, but on an individual basis only. The
          arbitrator’s award is final and binding, and judgment may be entered
          in any court with jurisdiction.
        </p>
        <p>
          <strong>Waiver of jury trial.</strong> BY AGREEING TO ARBITRATION, YOU
          AND COMPANY WAIVE THE RIGHT TO A TRIAL BY JUDGE OR JURY FOR ALL
          COVERED CLAIMS.
        </p>
        <p>
          <strong>Waiver of class actions.</strong> ALL DISPUTES MUST BE BROUGHT
          ON AN INDIVIDUAL BASIS. NEITHER YOU NOR COMPANY MAY BRING CLAIMS AS A
          PLAINTIFF OR CLASS MEMBER IN ANY CLASS, REPRESENTATIVE, OR COLLECTIVE
          PROCEEDING. The arbitrator may only award relief on an individual
          basis. If a court finds this class action waiver unenforceable as to a
          specific claim, that claim may be litigated in state or federal court
          in <Todo>governing-law state</Todo>; all other claims remain subject
          to arbitration.
        </p>
        <p>
          <strong>Attorneys’ fees.</strong> Each party bears its own attorneys’
          fees unless the arbitrator finds a claim was frivolous or brought for
          an improper purpose.
        </p>
        <p>
          <strong>Batch arbitration.</strong> If 100 or more substantially
          similar arbitration demands are filed against Company within a 30-day
          period by the same law firm or coordinated group, JAMS will batch them
          into groups of 100 and appoint one arbitrator per batch, with one set
          of fees per batch.
        </p>
        <p>
          <strong>Opt-out.</strong> You may opt out of this arbitration
          agreement within 30 days of first accepting these Terms by sending
          written notice to <EmailLink /> or{' '}
          <Todo>business mailing address</Todo>. Your notice must include your
          name, address, and a clear statement that you wish to opt out. Opting
          out does not affect any other part of these Terms.
        </p>
        <p>
          <strong>Severability.</strong> If any part of this arbitration
          agreement is found invalid, it will be modified to the minimum extent
          necessary to make it enforceable; the rest of the agreement remains in
          effect.
        </p>
      </Section>
    </>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { BookCallButton } from '@/components/commerce/BookCallButton'
import { EmailCapture } from '@/components/commerce/EmailCapture'
import { AI_SEARCH_CHECKLIST } from '@/content/site/ai-search-checklist'
import { AI_SEARCH_CHECKLIST_SUBJECT } from '@/lib/contact-intents'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'
import cover from '@/images/services/ai-search-checklist-cover.jpg'

/*
 * The free checklist at the top of the /services Build & support tab: an
 * email in exchange for "Does AI Name Your Business?", then the free intro
 * call (owner decision 2026-11-13).
 *
 * The form is the shared EmailCapture, so the sign-up lands in
 * contact-submissions, the PDF goes out by email (src/lib/resend.ts) and the
 * address joins the Leads list. Once it has sent, the intro call takes the
 * form's place as the next step: the Cal.com popup when the page has a
 * booking link, the contact form when it does not. The panel stays dark in
 * both themes because EmailCapture styles itself for a dark surface.
 *
 * Props: { booking: { link, namespace } | null }, the page's intro-call
 * link (strategyCall in src/lib/services/strategy-call).
 */

/* Mounted once the PDF is on its way. The form it follows is gone, and
   focus with it, so focus moves to this step's title: a keyboard or screen
   reader user lands on what to do next instead of the top of the page. */
function NextStep({ booking }) {
  const { next, booking: notes } = AI_SEARCH_CHECKLIST
  const titleRef = useRef(null)
  useEffect(() => {
    titleRef.current?.focus()
  }, [])
  const label = (
    <>
      <span>{next.cta}</span>
      <span aria-hidden="true">→</span>
    </>
  )
  return (
    <div className="svc-ck-next">
      <p ref={titleRef} tabIndex={-1} className="svc-ck-next-t">
        {next.title}
      </p>
      <p className="svc-ck-next-d">{next.copy}</p>
      {booking ? (
        <BookCallButton
          calLink={booking.link}
          namespace={`${booking.namespace}-${notes.namespaceSuffix}`}
          serviceName={notes.serviceName}
          notes={notes.notes}
          className="amw-cta svc-cta svc-ck-cta"
        >
          {label}
        </BookCallButton>
      ) : (
        <Link href="/contact" className="amw-cta svc-cta svc-ck-cta">
          {label}
        </Link>
      )}
    </div>
  )
}

/**
 * @param {object} props
 * @param {{ link: string, namespace: string } | null} [props.booking]
 */
export function AiSearchChecklist({ booking = null }) {
  const { kicker, title, lead, steps, form } = AI_SEARCH_CHECKLIST
  const [sent, setSent] = useState(false)

  const onSuccess = (address, doc) => {
    setSent(true)
    /* The submission id is the event id, so a resent form counts once, as
       on the contact form (namespaced apart from its `contact_` ids). */
    whopTrack(WHOP_EVENT.lead, {
      event_id: doc?.id ? `checklist_${doc.id}` : undefined,
      email: address,
      content_type: 'checklist',
      content_name: title,
    })
  }

  return (
    <section className="svc-ck" aria-labelledby="svc-ck-title">
      <div className="svc-ck-cover">
        <Image
          src={cover}
          alt=""
          sizes="(min-width: 1024px) 150px, (min-width: 640px) 128px, 88px"
        />
      </div>
      <div className="svc-ck-body">
        <p className="svc-ck-kicker">{kicker}</p>
        <h3 id="svc-ck-title" className="svc-ck-title">
          {title}
        </h3>
        <p className="svc-ck-lead">{lead}</p>
        <ol className="svc-ck-steps" role="list" aria-label="The five steps">
          {steps.map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="svc-ck-form">
        <EmailCapture
          subject={AI_SEARCH_CHECKLIST_SUBJECT}
          message={form.message}
          cta={form.cta}
          note={form.note}
          successMessage={(address) => (
            <>
              On its way to <b>{address}</b>.
            </>
          )}
          idPrefix="svc-ck"
          onSuccess={onSuccess}
        />
        {sent && <NextStep booking={booking} />}
      </div>
    </section>
  )
}

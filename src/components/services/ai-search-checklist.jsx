'use client'

import Image from 'next/image'
import Link from 'next/link'

import { BookCallButton } from '@/components/commerce/BookCallButton'
import { AI_SEARCH_CHECKLIST } from '@/content/site/ai-search-checklist'
import cover from '@/images/services/ai-search-checklist-cover.jpg'

/*
 * The free checklist at the top of the /services Build & support tab, as
 * the reward for booking the Build & support intro call (owner decision
 * 2026-11-14): no download for an email alone. The button opens the
 * Cal.com popup; once the booking is confirmed, BookingReward (site layout)
 * hands over the checklist and the ebook, and the Cal.com webhook emails
 * the same links. Without a booking link it falls back to the contact form.
 * The panel stays dark in both themes.
 *
 * Props: { booking: { link, namespace } | null }, the Build & support
 * intro call.
 */

/**
 * @param {object} props
 * @param {{ link: string, namespace: string } | null} [props.booking]
 */
export function AiSearchChecklist({ booking = null }) {
  const { kicker, title, lead, steps, offer } = AI_SEARCH_CHECKLIST
  const notes = AI_SEARCH_CHECKLIST.booking
  const label = (
    <>
      <span>{offer.cta}</span>
      <span aria-hidden="true">→</span>
    </>
  )

  return (
    <section className="svc-ck" aria-labelledby="svc-ck-title">
      <div className="svc-ck-cover">
        {/* The heading beside it names the checklist. */}
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
        {/* The gifts arrive with a booking, so only a booking link promises
            them; the contact-form fallback just asks for the call. */}
        <p className="svc-ck-next-t">
          {booking ? offer.title : offer.fallback}
        </p>
        {booking && <p className="svc-ck-next-d">{offer.copy}</p>}
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
        <p className="svc-ck-fine">{offer.fine}</p>
      </div>
    </section>
  )
}

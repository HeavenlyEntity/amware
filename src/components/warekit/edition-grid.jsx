'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'

import { EmailCapture } from '@/components/commerce/EmailCapture'
import { kitWaitlistSubject } from '@/lib/contact-intents'
import { editionView } from '@/lib/commerce/kitEditions'
import { EDITIONS } from '@/content/site/warekit'
import { COVERS } from './covers'

const chevron = (
  <i aria-hidden="true">
    <ChevronRight width={14} height={14} strokeWidth={2.5} />
  </i>
)

function EditionCard({ edition, view, index, onNotify }) {
  const { label, full } = edition
  return (
    <article
      className="pr-ed"
      data-status={view.state}
      data-rec={view.rec}
      style={{ '--d': `${0.06 + index * 0.1}s` }}
    >
      <div className="pr-ed-media">
        <Image
          src={COVERS[edition.id]}
          alt={`${full} concept cover`}
          sizes="(max-width: 768px) 100vw, 368px"
        />
      </div>
      <div className="pr-ed-body">
        <div className="pr-ed-tags">
          <span className="pr-ed-badge">
            <i />
            {view.badge}
          </span>
          {view.rec && <span className="pr-ed-rec">{edition.recLabel}</span>}
        </div>
        <p className="pj-kicker pr-ed-full">{full}</p>
        <h3 className="pr-ed-name">{label}</h3>
        <p className="pr-ed-head">{view.head}</p>
        <p className="pr-ed-copy">{view.copy}</p>
        <ul className="pr-ed-list" aria-label={view.listLabel}>
          {view.items.map((item) => (
            <li key={item}>
              <Check
                width={16}
                height={16}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="pr-ed-foot">
          <div>
            <span className="pr-price">{view.price}</span>
            <span className="pr-price-sub">{view.priceSub}</span>
          </div>
          {view.href ? (
            <Link href={view.href} className="pr-cta" data-tone={view.tone}>
              {view.cta}
              {chevron}
            </Link>
          ) : (
            <button
              type="button"
              className="pr-cta"
              data-tone={view.tone}
              aria-label={`${view.cta} about ${label}`}
              onClick={() => onNotify(edition.id)}
            >
              {view.cta}
              {chevron}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* Remounted per edition, so an address or confirmation left on one edition
   doesn't carry over to the next. */
function EditionWaitlist({ edition }) {
  const { label, full } = edition
  return (
    <div id="pr-notify" className="pr-notify pj-dark">
      <p className="pj-kicker pj-kicker--accent">Get notified</p>
      <h3 className="pr-notify-name">{full}</h3>
      <EmailCapture
        key={edition.id}
        subject={kitWaitlistSubject('NetSuite', label)}
        message={`Notify me when ${full} is on sale.`}
        cta="Get notified"
        note={`One email when the ${label} kit ships. Nothing else.`}
        successMessage={`You’ll hear when the ${label} kit ships.`}
        idPrefix="pr-notify"
      />
    </div>
  )
}

/* The cards are keyed by family so they rise in again on a switch. With every
   edition in a family on sale there is nothing to wait for, so the waitlist
   goes. */
export function EditionGrid({ family, states, notifyId, onNotify }) {
  const editions = EDITIONS[family].map((edition) => ({
    edition,
    view: editionView(edition, states),
  }))
  const planned = editions.filter((e) => e.view.state === 'planned')
  const waiting =
    planned.find((e) => e.edition.id === notifyId) ?? planned[0] ?? null

  return (
    <>
      <div className="pr-eds" key={family}>
        {editions.map(({ edition, view }, index) => (
          <EditionCard
            key={edition.id}
            edition={edition}
            view={view}
            index={index}
            onNotify={onNotify}
          />
        ))}
      </div>
      {waiting && <EditionWaitlist edition={waiting.edition} />}
    </>
  )
}

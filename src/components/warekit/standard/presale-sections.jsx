'use client'

import Link from 'next/link'

import { EmailCapture } from '@/components/commerce/EmailCapture'
import { RoadmapTimeline } from '@/components/blocks/timeline-2'
import { FaqSplit } from '@/components/blocks/faq-1'
import { PRESALE } from '@/content/site/standard-presale'
import { PAYMENTS, STACKS } from '@/content/site/warekit'
import { kitWaitlistSubject } from '@/lib/contact-intents'
import { Reveal } from '../reveal'
import { BRAND_ICONS } from './brand-icons'

/* A numbered section's opening: the kicker and its aside, the heading and
   the lead, from one block of PRESALE. */
export function SectionHead({ titleId, block }) {
  return (
    <>
      <div className="st-head">
        <p className="pj-kicker">
          {block.index} · {block.eyebrow}
        </p>
        <p className="pj-kicker st-head-meta">{block.meta}</p>
      </div>
      <h2 id={titleId} className="pj-h2">
        {block.title}
      </h2>
      <p className="pj-lead">{block.copy}</p>
    </>
  )
}

/** The four waves as the page may show them. Open, exactly as written: wave 1
 *  is in the repository and Today sits on wave 2. Closed, nothing is built
 *  yet: every wave 1 item is being built, its rail is empty and Today sits on
 *  it, and no other wave carries the pin. */
export function wavesFor(open, waves = PRESALE.waves) {
  if (open) return waves.columns
  return waves.columns.map((column, index) =>
    index === 0
      ? {
          ...column,
          fill: 0,
          today: true,
          items: column.items.map((item) => ({
            ...item,
            status: waves.closedStatus,
            state: 'active',
          })),
        }
      : { ...column, today: false }
  )
}

/* A wave's brand mark. The timeline wraps it in a labelled image, so the
   drawing itself is hidden. A `stroke` icon is drawn as a line. */
function renderIcon(id) {
  const icon = BRAND_ICONS[id]
  if (!icon) return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={icon.viewBox}
      fill={icon.stroke ? 'none' : 'currentColor'}
      stroke={icon.stroke ? 'currentColor' : undefined}
      strokeWidth={icon.stroke ? 1.5 : undefined}
      strokeLinecap={icon.stroke ? 'round' : undefined}
      strokeLinejoin={icon.stroke ? 'round' : undefined}
    >
      <path d={icon.d} />
    </svg>
  )
}

/* 04: the four waves on one rail. */
export function Waves({ open }) {
  return (
    <section
      id="st-waves"
      aria-labelledby="st-waves-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <SectionHead titleId="st-waves-title" block={PRESALE.waves} />
      </Reveal>
      <RoadmapTimeline
        className="st-waves"
        quarters={wavesFor(open)}
        todayLabel={PRESALE.waves.pin}
        renderIcon={renderIcon}
      />
    </section>
  )
}

/* The last answer carries a link into the services page. */
const FAQ_ITEMS = PRESALE.faqs.items.map(({ question, answer, link }) => ({
  question,
  answer: link ? (
    <>
      {answer}
      <Link href={link.href}>{link.label}</Link>
      {link.after}
    </>
  ) : (
    answer
  ),
}))

/* 06: the questions. The block draws its own heading. */
export function Questions() {
  return (
    <section
      id="st-questions"
      aria-label={PRESALE.faqs.title}
      className="pj-wrap pj-section"
    >
      <FaqSplit
        items={FAQ_ITEMS}
        eyebrow={PRESALE.faqs.eyebrow}
        title={PRESALE.faqs.title}
        copy={PRESALE.faqs.copy}
      />
    </section>
  )
}

/* The closing band. Its action goes to the founding table while something is
   on sale and to the waitlist while nothing is. */
export function ClosingBand({ open }) {
  const { band } = PRESALE
  return (
    <section aria-labelledby="st-band-title" className="pj-wrap pj-section">
      <Reveal>
        <div className="st-band">
          <div className="st-band-copy">
            <p className="pj-eyebrow">{band.eyebrow}</p>
            <h2 id="st-band-title" className="pj-h2 st-band-title">
              {band.title}
            </h2>
            <p className="pj-lead">{band.copy}</p>
          </div>
          <div className="st-band-acts">
            <a href={open ? '#founding' : '#st-join'} className="pj-btn st-cta">
              {open ? band.cta : band.ctaClosed}
            </a>
            <p className="pj-kicker">{band.note}</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const labelOf = (list, id) => list.find((item) => item.id === id)?.label ?? id

/* The waitlist, filed under both picks. The capture is keyed by them, so a
   new pick starts a fresh form with the new subject. */
export function Waitlist({ data, pay }) {
  const { waitlist } = PRESALE
  const dataLabel = labelOf(STACKS, data)
  const payLabel = labelOf(PAYMENTS, pay)
  return (
    <section
      id="st-join"
      aria-labelledby="st-join-title"
      className="pj-wrap pj-section"
    >
      <Reveal>
        <div className="st-join pj-dark">
          <div>
            <p className="pj-kicker">{waitlist.kicker}</p>
            <h2 id="st-join-title" className="pj-h2 st-join-title">
              {waitlist.title}
            </h2>
            <p className="pj-lead st-join-lead">
              <b>
                {dataLabel} + {payLabel}
              </b>
            </p>
            <p className="pj-lead st-join-lead">{waitlist.lead}</p>
          </div>
          <div>
            <EmailCapture
              key={`${data}-${pay}`}
              subject={kitWaitlistSubject(
                'Standard',
                `${dataLabel} + ${payLabel}`
              )}
              message={`Notify me when the WareKit Standard presale opens. My stack: ${dataLabel} and ${payLabel}.`}
              cta={waitlist.cta}
              tone="pill"
              note={waitlist.note}
              successMessage={(address) => (
                <>
                  <b>{address}</b> · {waitlist.note}
                </>
              )}
              idPrefix="st-join"
            />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

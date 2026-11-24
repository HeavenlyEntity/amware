'use client'

import { useId, useState } from 'react'

import { PricingCompare } from '@/components/blocks/pricing-15'
import { PRESALE } from '@/content/site/standard-presale'
import { BUILDING_CHOICES } from '@/lib/commerce/standardPresale'
import { FoundingBuyButton } from './founding-buy-button'

const { founding } = PRESALE

const TIERS = ['pro', 'team']

const isReady = (presale, tier) => presale?.[tier]?.state === 'ready'

/** Whether the page still needs the waitlist: until both tiers are on sale,
 *  someone has a tier to wait for. */
export const needsWaitlist = (presale) =>
  !TIERS.every((tier) => isReady(presale, tier))

/* A tier's two figures. The live one is the row's price when the tier can be
   sold, else the approved founding figure. The regular one is struck beside
   it only while it is higher: a raised row at or above it would make the
   comparison false, so nothing is struck. */
function figures(presale, tier) {
  const price = isReady(presale, tier)
    ? presale[tier].price
    : founding.fallback[tier]
  const regular = founding.regular[tier]
  return {
    price: price.toFixed(2),
    altPrice: price < regular ? regular.toFixed(2) : undefined,
  }
}

const plansFor = (presale) =>
  founding.plans.map((plan) =>
    plan.id === 'lite'
      ? { ...plan, price: (0).toFixed(2) }
      : { ...plan, ...figures(presale, plan.id) }
  )

/* "What are you building?": asked once, above the table, and handed to every
   checkout. Ids come from useId, since nothing here may repeat on the page. */
function BuildingQuestion({ answer, onAnswer }) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <fieldset className="st-building" aria-describedby={hintId}>
      <legend className="st-building-label">{founding.building.label}</legend>
      <p id={hintId} className="st-building-hint">
        {founding.building.hint}
      </p>
      <div className="st-building-choices">
        {BUILDING_CHOICES.map((choice) => {
          const inputId = `${id}-${choice.id}`
          return (
            <label key={choice.id} htmlFor={inputId} className="st-choice">
              <input
                id={inputId}
                type="radio"
                name={`${id}-building`}
                value={choice.id}
                checked={answer === choice.id}
                onChange={() => onAnswer(choice.id)}
              />
              <span>{choice.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/* The founding price table: Lite, Pro and Team, with a checkout only for a
   tier `standardPresale` says can be delivered. Everything else points at the
   waitlist. `renderAction` runs once per layout, so nothing it draws carries
   a fixed id. */
export function FoundingTable({ presale }) {
  const [answer, setAnswer] = useState(null)
  const anyReady = TIERS.some((tier) => isReady(presale, tier))
  const waitlist = needsWaitlist(presale)

  const renderAction = (plan) => {
    /* Lite opens the same waitlist form as an unsold tier, which promises
       one email when the presale opens, so it carries the same label. */
    if (plan.id === 'lite') {
      return waitlist ? (
        <a href="#st-join" className="amw-cta st-plan-link">
          {founding.cta.waitlist}
        </a>
      ) : null
    }
    if (isReady(presale, plan.id)) {
      const { slug, price } = presale[plan.id]
      return (
        <FoundingBuyButton
          slug={slug}
          name={`WareKit Standard ${plan.name}`}
          price={price}
          building={answer}
        >
          {founding.cta[plan.id]}
        </FoundingBuyButton>
      )
    }
    return (
      <a href="#st-join" className="amw-cta st-plan-link">
        {founding.cta.waitlist}
      </a>
    )
  }

  return (
    <>
      {anyReady ? (
        <BuildingQuestion answer={answer} onAnswer={setAnswer} />
      ) : null}
      <PricingCompare
        plans={plansFor(presale)}
        groups={founding.groups}
        toggle={founding.toggle}
        strike
        unit={founding.unit}
        corner={founding.corner}
        note={founding.note}
        renderAction={renderAction}
      />
    </>
  )
}

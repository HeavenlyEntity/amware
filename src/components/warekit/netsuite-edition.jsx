'use client'

import { useEffect, useState } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { editionLead, familyOf, saleSummary } from '@/lib/commerce/kitEditions'
import { FAMILIES } from '@/content/site/warekit'
import { BuiltPanel } from './built-panel'
import { CompareTable } from './compare-table'
import { EditionGrid } from './edition-grid'
import { EditionHero } from './edition-hero'
import { HelpMeChoose } from './help-me-choose'
import { OtherEditions } from './other-editions'
import { PathPicker } from './path-picker'
import { Reveal } from './reveal'
import { SetupSteps } from './setup-steps'

const SWITCH = [
  ['inside', 'Inside'],
  ['connected', 'Connected'],
  ['built', 'Built for you'],
]

/* The WareKit NetSuite storefront, from the approved board
   (docs/design/2026-10-27-portfolio-upgrade): hero, where the app runs,
   the editions for that answer, a quiz, a compare table and the setup path.
   Styles: styles/products.css.

   `states` is editionStates' reduced output, the only product data allowed
   this far; `{}` means the read failed, and every edition reads as planned. */
export function NetsuiteEdition({ states }) {
  const reduced = useReducedMotion()
  const [family, setFamily] = useState('connected')
  const [notifyId, setNotifyId] = useState(null)
  /* An object, so asking for the same place twice scrolls twice. Scrolling
     waits for the render, since the target may be about to appear. */
  const [scrollTo, setScrollTo] = useState(null)

  useEffect(() => {
    if (!scrollTo) return
    const target = document.getElementById(scrollTo.id)
    target?.scrollIntoView?.({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
    target?.querySelector('input')?.focus({ preventScroll: true })
  }, [scrollTo, reduced])

  const built = family === 'built'
  const notify = (id) => {
    setFamily(familyOf(id))
    setNotifyId(id)
    setScrollTo({ id: 'pr-notify' })
  }
  const act = (action) => {
    if (action.type === 'notify') return notify(action.id)
    if (action.type === 'family') setFamily(action.family)
    else if (built) setFamily('connected')
    setScrollTo({ id: 'pr-eds-title' })
  }

  const sale = saleSummary(states)
  const lead = editionLead(family, states)
  const { kicker, title } = FAMILIES[family]

  return (
    <>
      <EditionHero sale={sale} />
      <PathPicker family={family} onPick={setFamily} />

      <section aria-labelledby="pr-eds-title" className="pj-wrap pj-section">
        <Reveal className="pr-eds-top">
          <div>
            <p className="pj-kicker">02 · {kicker}</p>
            <h2 id="pr-eds-title" className="pj-h2">
              {title}
            </h2>
            {lead && <p className="pj-lead">{lead}</p>}
          </div>
          <div
            className="pr-switch"
            role="group"
            aria-label="Where does your app run?"
            style={{ '--i': SWITCH.findIndex(([id]) => id === family) }}
          >
            <span className="pr-switch-thumb" aria-hidden="true" />
            {SWITCH.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={family === id}
                onClick={() => setFamily(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </Reveal>

        {built ? (
          <BuiltPanel />
        ) : (
          <EditionGrid
            family={family}
            states={states}
            notifyId={notifyId}
            onNotify={notify}
          />
        )}

        <HelpMeChoose states={states} onFamily={setFamily} onAction={act} />
      </section>

      {!built && <CompareTable family={family} states={states} />}
      <SetupSteps sale={sale} />
      <OtherEditions />
    </>
  )
}
